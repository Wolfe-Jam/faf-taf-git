/**
 * `fail-on-failed-tests: 'true'`: the step fails when the run had failing
 * tests, after the receipt is written and pushed and every output is set. A
 * single-job workflow keeps its test step going (`continue-on-error: true`),
 * gets a FAILED receipt, and still goes red, with no extra failing step.
 * Off by default: a failed run leaves the step green, as before.
 * Runs the built Action (dist/index.js) against a throwaway repo and a local
 * bare remote.
 */
import { execFileSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as yaml from 'yaml';

// Nothing from the job running these tests may reach the child processes.
for (const k of Object.keys(process.env)) {
  if (/^(GIT_|GITHUB_|RUNNER_|INPUT_)/.test(k) || k === 'CI') {delete process.env[k];}
}

const ACTION = path.join(__dirname, '..', 'dist', 'index.js');
const FAILED_RUN = 'Tests:       2 failed, 3 passed, 5 total\n';
const GREEN_RUN = 'Tests:       5 passed, 5 total\n';

const made: string[] = [];
afterAll(() => made.forEach((d) => fs.rmSync(d, { recursive: true, force: true })));

/** A repo with a .taf on main, pushed to a local bare remote, and a test output file. */
function setup(testOutput: string) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'taf-fail-'));
  made.push(root);
  const home = path.join(root, 'home');
  fs.mkdirSync(home);
  const globalCfg = path.join(home, '.gitconfig');
  fs.writeFileSync(globalCfg, '[user]\n\tname = Developer\n\temail = dev@example.invalid\n[commit]\n\tgpgsign = false\n');
  const env = { ...process.env, HOME: home, GIT_CONFIG_GLOBAL: globalCfg, GIT_CONFIG_NOSYSTEM: '1' };
  const git = (cwd: string, args: string[]): string =>
    execFileSync('git', args, { cwd, env, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] }).toString();
  const remote = path.join(root, 'remote.git');
  git(root, ['init', '-q', '--bare', remote]);
  const repo = path.join(root, 'repo');
  git(root, ['init', '-q', '-b', 'main', repo]);
  fs.writeFileSync(path.join(repo, '.taf'), 'test_history: []\n');
  git(repo, ['add', '.taf']);
  git(repo, ['commit', '-q', '-m', 'base']);
  git(repo, ['remote', 'add', 'origin', remote]);
  git(repo, ['push', '-q', '-u', 'origin', 'main']);
  const out = path.join(root, 'out.txt');
  fs.writeFileSync(out, testOutput);

  /** Run the built Action in the repo with these inputs; its outputs go to a file of its own. */
  const run = (inputs: Record<string, string>) => {
    const outputs = path.join(root, 'github_output');
    fs.writeFileSync(outputs, '');
    const e: NodeJS.ProcessEnv = { ...env, GITHUB_OUTPUT: outputs, 'INPUT_TEST-OUTPUT-FILE': out };
    for (const [k, v] of Object.entries(inputs)) {e[`INPUT_${k.toUpperCase()}`] = v;}
    const r = spawnSync(process.execPath, [ACTION], { cwd: repo, env: e, encoding: 'utf-8' });
    const text = fs.readFileSync(outputs, 'utf-8');
    const output = (name: string): string | undefined => {
      const m = text.match(new RegExp(`^${name}<<(\\S+)\\n([\\s\\S]*?)\\n\\1$`, 'm'));
      return m ? m[2] : undefined;
    };
    return { ...r, output };
  };
  /** The results of the receipts on the remote branch. */
  const pushed = (branch: string): string[] =>
    (yaml.parse(git(repo, ['--git-dir', remote, 'show', `${branch}:.taf`])).test_history as Array<{ result: string }>).map((x) => x.result);
  return { run, pushed };
}

describe('fail-on-failed-tests', () => {
  it.each([
    ['the current branch', {}, 'main'],
    ['target-branch', { 'target-branch': 'taf-receipts' }, 'taf-receipts'],
  ])('on %s: a failed run fails the step, after the FAILED receipt is pushed and the outputs are set', (_where, extra, branch) => {
    const { run, pushed } = setup(FAILED_RUN);
    const r = run({ 'fail-on-failed-tests': 'true', ...extra });
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/::error::2 of 5 tests failed/);
    expect(pushed(branch)).toEqual(['FAILED']);
    expect(r.output('result')).toBe('FAILED');
    expect(r.output('failed')).toBe('2');
    expect(r.output('passed')).toBe('3');
    expect(r.output('total')).toBe('5');
    expect(r.output('taf-updated')).toBe('true');
    expect(r.output('receipt-pushed')).toBe('true');
    expect(r.output('newly-skipped')).toBe('0');
  });

  it('a green run passes the step', () => {
    const { run, pushed } = setup(GREEN_RUN);
    const r = run({ 'fail-on-failed-tests': 'true' });
    expect(r.status).toBe(0);
    expect(r.stdout).not.toContain('::error::');
    expect(pushed('main')).toEqual(['PASSED']);
  });

  it.each([
    ['left out', {}],
    ["'false'", { 'fail-on-failed-tests': 'false' }],
  ])('%s: a failed run leaves the step green, as before', (_how, inputs) => {
    const { run, pushed } = setup(FAILED_RUN);
    const r = run(inputs);
    expect(r.status).toBe(0);
    expect(r.stdout).not.toContain('::error::');
    expect(pushed('main')).toEqual(['FAILED']);
    expect(r.output('result')).toBe('FAILED');
  });

  it('with auto-commit off: the receipt is written to the file, then the step fails', () => {
    const { run } = setup(FAILED_RUN);
    const r = run({ 'fail-on-failed-tests': 'true', 'auto-commit': 'false' });
    expect(r.status).toBe(1);
    expect(r.output('taf-updated')).toBe('true');
    expect(r.output('receipt-pushed')).toBe('false');
  });

  describe('test-outcome', () => {
    it('failure with no failed test in the output: a FAILED receipt, and fail-on-failed-tests fails the step', () => {
      const { run, pushed } = setup(GREEN_RUN);
      const r = run({ 'test-outcome': 'failure', 'fail-on-failed-tests': 'true' });
      expect(r.status).toBe(1);
      expect(r.stdout).toMatch(/::error::The test step failed \(test-outcome: failure\)/);
      expect(pushed('main')).toEqual(['FAILED']);
      expect(r.output('result')).toBe('FAILED');
      expect(r.output('failed')).toBe('0');
      expect(r.output('receipt-pushed')).toBe('true');
    });

    it('failure without fail-on-failed-tests: a FAILED receipt, the step stays green', () => {
      const { run, pushed } = setup(GREEN_RUN);
      const r = run({ 'test-outcome': 'failure' });
      expect(r.status).toBe(0);
      expect(pushed('main')).toEqual(['FAILED']);
    });

    it.each([
      ['counts nothing', 'Test Suites: 1 failed, 1 total\nTests:       0 total\n'],
      ['has no summary at all', 'Error: Cannot find module jest.config.js\n'],
    ])('failure, and the output %s: a FAILED receipt with zero counts', (_what, output) => {
      const { run, pushed } = setup(output);
      const r = run({ 'test-outcome': 'failure', 'target-branch': 'taf-receipts' });
      expect(r.status).toBe(0);
      expect(r.stdout).toMatch(/::warning::.*recorded as FAILED with zero counts/);
      expect(pushed('taf-receipts')).toEqual(['FAILED']);
      expect(r.output('total')).toBe('0');
      expect(r.output('receipt-pushed')).toBe('true');
    });

    it('output that counts nothing, without test-outcome: no receipt, the step fails, as before', () => {
      const { run } = setup('Tests:       0 total\n');
      const r = run({});
      expect(r.status).toBe(1);
      expect(r.output('taf-updated')).toBeUndefined();
    });

    it('any case of failure counts', () => {
      const { run, pushed } = setup(GREEN_RUN);
      run({ 'test-outcome': ' FAILURE ' });
      expect(pushed('main')).toEqual(['FAILED']);
    });

    it.each(['success', 'skipped', ''])('%p leaves the result to the output', (outcome) => {
      const { run, pushed } = setup(GREEN_RUN);
      const r = run({ 'test-outcome': outcome, 'fail-on-failed-tests': 'true' });
      expect(r.status).toBe(0);
      expect(pushed('main')).toEqual(['PASSED']);
    });
  });
});
