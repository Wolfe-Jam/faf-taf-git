/**
 * Receipts are never lost, and a developer's checkout is never touched.
 *   - B1: a receipt write keeps the file's comments, and any later `---`
 *         document byte for byte (even one with a YAML error)
 *   - B2: runs that write the same .taf at once each keep their receipt,
 *         including when they take over a lock a killed run left behind
 *   - B5: a receipt that isn't pushed is never silent: CLI exit 1; the Action
 *         warns (or fails with fail-on-push-error), and always fails on
 *         target-branch after its retries
 *   - F4: with target-branch the Action writes in its own worktree: the job's
 *         checkout keeps its branch, its staged work and its files, no stash
 *   - F5: options take `--name=value` too
 * From the WJTTC wave-2 audit (B1, B2, B5), the #39 review (F4, F5) and the #41
 * review. Runs the built bundles (dist/) against throwaway repos and a local
 * bare remote, with no CI variables from the job running the tests.
 */
import { execFileSync, spawn, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as yaml from 'yaml';
import { updateTafFile } from '../src/taf-core';
import { optionValue } from '../src/cli';
import { pushFailureReason, pushWasBehind } from '../src/git-env';

// Nothing from the job running these tests may reach the child processes: an
// exported GIT_DIR points git at another repository, and GITHUB_OUTPUT would
// make the Action under test write into this job's own outputs.
for (const k of Object.keys(process.env)) {
  if (/^(GIT_|GITHUB_|RUNNER_|INPUT_)/.test(k) || k === 'CI') {delete process.env[k];}
}

const CLI = path.join(__dirname, '..', 'dist', 'cli.js');
const ACTION = path.join(__dirname, '..', 'dist', 'index.js');
const JEST_OUT = 'Tests:       3 passed, 3 total\n';
const RESULTS = { total: 3, passed: 3, failed: 0, result: 'PASSED' as const };

const made: string[] = [];
const tmp = (prefix: string): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  made.push(dir);
  return dir;
};
afterAll(() => made.forEach((d) => fs.rmSync(d, { recursive: true, force: true })));

const git = (cwd: string, args: string[], env: NodeJS.ProcessEnv): string =>
  execFileSync('git', args, { cwd, env, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] }).toString();

/** A repo with `pkg/.taf`, pushed to a local bare remote, under a throwaway HOME. */
function setup() {
  const root = tmp('taf-safety-');
  const home = path.join(root, 'home');
  fs.mkdirSync(home);
  const globalCfg = path.join(home, '.gitconfig');
  fs.writeFileSync(globalCfg, '[user]\n\tname = Developer\n\temail = dev@example.invalid\n[commit]\n\tgpgsign = false\n');
  const env = { ...process.env, HOME: home, GIT_CONFIG_GLOBAL: globalCfg, GIT_CONFIG_NOSYSTEM: '1' };
  const remote = path.join(root, 'remote.git');
  git(root, ['init', '-q', '--bare', remote], env);
  const repo = path.join(root, 'repo');
  git(root, ['init', '-q', '-b', 'main', repo], env);
  fs.writeFileSync(path.join(repo, 'README.md'), '# r\n');
  fs.mkdirSync(path.join(repo, 'pkg'));
  fs.writeFileSync(path.join(repo, 'pkg', '.taf'), 'test_history: []\n');
  git(repo, ['add', '.'], env);
  git(repo, ['commit', '-q', '-m', 'base'], env);
  git(repo, ['remote', 'add', 'origin', remote], env);
  git(repo, ['push', '-q', '-u', 'origin', 'main'], env);
  const out = path.join(root, 'out.txt');
  fs.writeFileSync(out, JEST_OUT);
  return { root, repo, remote, env, out };
}

/** Another clone pushes to main, so `repo` is behind its remote. */
function remoteMovesOn(root: string, remote: string, env: NodeJS.ProcessEnv): void {
  const other = path.join(root, 'other');
  git(root, ['clone', '-q', '-b', 'main', remote, other], env);
  fs.writeFileSync(path.join(other, 'x.txt'), 'x\n');
  git(other, ['add', 'x.txt'], env);
  git(other, ['commit', '-q', '-m', 'someone else'], env);
  git(other, ['push', '-q', 'origin', 'HEAD:main'], env);
}

/** Run the built Action from `cwd` with these inputs; its outputs go to a file of its own. */
function runAction(cwd: string, env: NodeJS.ProcessEnv, inputs: Record<string, string>) {
  const outputs = path.join(tmp('taf-out-'), 'github_output');
  fs.writeFileSync(outputs, '');
  const e: NodeJS.ProcessEnv = { ...env, GITHUB_OUTPUT: outputs };
  for (const [k, v] of Object.entries(inputs)) {e[`INPUT_${k.toUpperCase()}`] = v;}
  const r = spawnSync(process.execPath, [ACTION], { cwd, env: e, encoding: 'utf-8' });
  const text = fs.readFileSync(outputs, 'utf-8');
  const output = (name: string): string | undefined => {
    const m = text.match(new RegExp(`^${name}<<(\\S+)\\n([\\s\\S]*?)\\n\\1$`, 'm'));
    return m ? m[2] : undefined;
  };
  return { ...r, output };
}

const receipts = (text: string): number => (yaml.parseAllDocuments(text)[0] as yaml.Document).toJS().test_history.length;

describe('B1: a receipt write keeps what else is in the file', () => {
  it('keeps comments and a later document', () => {
    const dir = tmp('taf-b1-');
    const taf = path.join(dir, '.taf');
    fs.writeFileSync(taf, '# keep this comment\nformat_version: "1.0.0"\ntest_history: []\n---\nsecond_doc: important\n');
    expect(updateTafFile(taf, RESULTS)).toBe(true);
    const text = fs.readFileSync(taf, 'utf-8');
    expect(text).toContain('# keep this comment');
    expect(text.endsWith('---\nsecond_doc: important\n')).toBe(true);
    expect(receipts(text)).toBe(1);
    expect(fs.readdirSync(dir)).toEqual(['.taf']); // no lock or temp file left
  });

  it('a later document with a YAML error is kept as it is, and the receipt is written', () => {
    const dir = tmp('taf-b1-');
    const taf = path.join(dir, '.taf');
    fs.writeFileSync(taf, 'project: x\ntest_history: []\n---\nkey: [unclosed\n');
    expect(updateTafFile(taf, RESULTS)).toBe(true);
    const text = fs.readFileSync(taf, 'utf-8');
    expect(text.endsWith('\n---\nkey: [unclosed\n')).toBe(true);
    expect(receipts(text)).toBe(1);
  });

  it('a trailing empty `---` stays as it is over three writes', () => {
    const dir = tmp('taf-b1-');
    const taf = path.join(dir, '.taf');
    fs.writeFileSync(taf, 'test_history: []\n---\n');
    for (let i = 0; i < 3; i++) {expect(updateTafFile(taf, RESULTS)).toBe(true);}
    const text = fs.readFileSync(taf, 'utf-8');
    expect(text.endsWith('\n---\n')).toBe(true);
    expect(receipts(text)).toBe(3);
  });

  it('a symlinked .taf stays a symlink and keeps its mode', () => {
    const dir = tmp('taf-b1-');
    fs.mkdirSync(path.join(dir, 'real'));
    const target = path.join(dir, 'real', 'data.taf');
    fs.writeFileSync(target, 'test_history: []\n', { mode: 0o600 });
    fs.chmodSync(target, 0o600);
    const taf = path.join(dir, '.taf');
    fs.symlinkSync(path.join('real', 'data.taf'), taf);
    expect(updateTafFile(taf, RESULTS)).toBe(true);
    expect(fs.lstatSync(taf).isSymbolicLink()).toBe(true);
    expect(fs.statSync(target).mode & 0o777).toBe(0o600);
    expect(receipts(fs.readFileSync(target, 'utf-8'))).toBe(1);
  });
});

/** 20 CLI runs at once on one .taf; resolves to their exit codes. */
const twentyRuns = (dir: string): Promise<number[]> => Promise.all(Array.from({ length: 20 }, () => new Promise<number>((resolve) => {
  spawn(process.execPath, [CLI, '--file', 'out.txt'], { cwd: dir, stdio: 'ignore' }).on('close', (c) => resolve(c ?? 1));
})));

describe('B2: writers at the same time each keep their receipt', () => {
  it('20 CLI runs on one .taf leave 20 receipts', async () => {
    const dir = tmp('taf-b2-');
    fs.writeFileSync(path.join(dir, '.taf'), 'test_history: []\n');
    fs.writeFileSync(path.join(dir, 'out.txt'), JEST_OUT);
    expect(await twentyRuns(dir)).toEqual(Array(20).fill(0));
    expect(receipts(fs.readFileSync(path.join(dir, '.taf'), 'utf-8'))).toBe(20);
    expect(fs.readdirSync(dir).sort()).toEqual(['.taf', 'out.txt']);
  }, 60_000);

  it('20 runs taking over a lock a killed run left: 20 receipts, five times', async () => {
    for (let trial = 0; trial < 5; trial++) {
      const dir = tmp('taf-b2-');
      fs.writeFileSync(path.join(dir, '.taf'), 'test_history: []\n');
      fs.writeFileSync(path.join(dir, 'out.txt'), JEST_OUT);
      // A lock from this machine whose process is gone, two minutes old.
      const lock = path.join(dir, '.taf.lock');
      fs.writeFileSync(lock, `${os.hostname()}:999999:dead`);
      const old = new Date(Date.now() - 120_000);
      fs.utimesSync(lock, old, old);
      expect(await twentyRuns(dir)).toEqual(Array(20).fill(0));
      expect(receipts(fs.readFileSync(path.join(dir, '.taf'), 'utf-8'))).toBe(20);
      expect(fs.readdirSync(dir).sort()).toEqual(['.taf', 'out.txt']);
    }
  }, 120_000);
});

describe('B5: a receipt that is not pushed is never silent', () => {
  it('CLI --commit behind the remote: exit 1, git\'s reason, and how to send it', () => {
    const { root, repo, remote, env, out } = setup();
    remoteMovesOn(root, remote, env);
    const r = spawnSync(process.execPath, [CLI, '--file', out, '--commit'], { cwd: path.join(repo, 'pkg'), env, encoding: 'utf-8' });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/committed but not pushed: .*rejected.*git pull --rebase && git push/);
  });

  it('CLI --commit to a remote that refuses it: exit 1, the server\'s reason, no pull advice', () => {
    const { repo, remote, env, out } = setup();
    const hook = path.join(remote, 'hooks', 'pre-receive');
    fs.writeFileSync(hook, '#!/bin/sh\necho "Permission to repo denied" >&2\nexit 1\n', { mode: 0o755 });
    const r = spawnSync(process.execPath, [CLI, '--file', out, '--commit'], { cwd: path.join(repo, 'pkg'), env, encoding: 'utf-8' });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/remote rejected.*Permission to repo denied/);
    expect(r.stderr).not.toContain('git pull --rebase');
  });

  it('CLI --commit with no upstream: exit 0, and says it was not pushed', () => {
    const { repo, env, out } = setup();
    git(repo, ['branch', '--unset-upstream'], env);
    const r = spawnSync(process.execPath, [CLI, '--file', out, '--commit'], { cwd: path.join(repo, 'pkg'), env, encoding: 'utf-8' });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('no upstream, so it was not pushed');
  });

  it('Action on the current branch, push rejected: a warning and receipt-pushed=false (exit 0)', () => {
    const { root, repo, remote, env, out } = setup();
    remoteMovesOn(root, remote, env);
    const r = runAction(path.join(repo, 'pkg'), env, { 'test-output-file': out });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/::warning::The receipt is committed but not pushed/);
    expect(r.output('receipt-pushed')).toBe('false');
  });

  it('Action on the current branch with fail-on-push-error: the step fails', () => {
    const { root, repo, remote, env, out } = setup();
    remoteMovesOn(root, remote, env);
    const r = runAction(path.join(repo, 'pkg'), env, { 'test-output-file': out, 'fail-on-push-error': 'true' });
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/::error::The receipt is committed but not pushed/);
    expect(r.output('receipt-pushed')).toBe('false');
  });

  it('Action with auto-commit off: receipt-pushed=false', () => {
    const { repo, env, out } = setup();
    const r = runAction(path.join(repo, 'pkg'), env, { 'test-output-file': out, 'auto-commit': 'false' });
    expect(r.status).toBe(0);
    expect(r.output('receipt-pushed')).toBe('false');
  });

  it('the push failure reason is git\'s rejection line and the server\'s message, not the hint', () => {
    const behind = 'To ../remote.git\n ! [rejected]        main -> main (fetch first)\nerror: failed to push some refs\nhint: Updates were rejected.\n';
    expect(pushFailureReason(behind)).toBe('! [rejected]        main -> main (fetch first)');
    expect(pushWasBehind(behind)).toBe(true);
    const refused = 'remote: Permission to o/r.git denied to github-actions[bot].\nTo https://github.com/o/r\n ! [remote rejected] main -> main (pre-receive hook declined)\nerror: failed to push some refs\n';
    expect(pushFailureReason(refused)).toBe('! [remote rejected] main -> main (pre-receive hook declined) — remote: Permission to o/r.git denied to github-actions[bot]');
    expect(pushWasBehind(refused)).toBe(false);
  });
});

describe('F4: target-branch leaves the checkout as it was', () => {
  it.each(['a new receipts branch', 'an existing one'])('%s: same branch, staged work kept, no stash, .taf only', (when) => {
    const { repo, remote, env, out } = setup();
    const runFromPkg = () => runAction(path.join(repo, 'pkg'), env, { 'test-output-file': out, 'target-branch': 'taf-receipts' });
    if (when === 'an existing one') {expect(runFromPkg().status).toBe(0);}

    fs.writeFileSync(path.join(repo, 'wip.txt'), 'my work\n');
    git(repo, ['add', 'wip.txt'], env);
    fs.writeFileSync(path.join(repo, 'notes.txt'), 'untracked\n');

    const r = runFromPkg();
    expect(r.status).toBe(0);
    expect(r.output('receipt-pushed')).toBe('true');
    expect(git(repo, ['branch', '--show-current'], env).trim()).toBe('main');
    expect(git(repo, ['stash', 'list'], env).trim()).toBe('');
    expect(git(repo, ['diff', '--cached', '--name-only'], env).trim()).toBe('wip.txt');
    expect(fs.existsSync(path.join(repo, 'notes.txt'))).toBe(true);
    expect(git(repo, ['worktree', 'list'], env).trim().split('\n')).toHaveLength(1);
    expect(git(repo, ['--git-dir', remote, 'ls-tree', '-r', '--name-only', 'taf-receipts'], env).trim()).toBe('pkg/.taf');
    const remoteTaf = git(repo, ['--git-dir', remote, 'show', 'taf-receipts:pkg/.taf'], env);
    expect(receipts(remoteTaf)).toBe(when === 'an existing one' ? 2 : 1);
  });

  it('a branch that only ends in the same name is not the receipts branch', () => {
    const { repo, remote, env, out } = setup();
    git(repo, ['push', '-q', 'origin', 'HEAD:refs/heads/archive/taf-new'], env);
    const r = runAction(path.join(repo, 'pkg'), env, { 'test-output-file': out, 'target-branch': 'taf-new' });
    expect(r.status).toBe(0);
    expect(git(repo, ['--git-dir', remote, 'ls-tree', '-r', '--name-only', 'taf-new'], env).trim()).toBe('pkg/.taf');
  });
});

describe('F5: options take --name=value', () => {
  it('reads both forms', () => {
    expect(optionValue(['--message', 'a b'], '--message')).toBe('a b');
    expect(optionValue(['--message=a b'], '--message')).toBe('a b');
    expect(optionValue(['--messages=x'], '--message')).toBeUndefined();
    expect(optionValue(['--file'], '--file')).toBeUndefined();
  });

  it('CLI --message=value is the commit message', () => {
    const { repo, env, out } = setup();
    git(repo, ['branch', '--unset-upstream'], env);
    const r = spawnSync(process.execPath, [CLI, `--file=${out}`, '--commit', '--message=custom message'], { cwd: path.join(repo, 'pkg'), env, encoding: 'utf-8' });
    expect(r.status).toBe(0);
    expect(git(repo, ['log', '-1', '--format=%s'], env).trim()).toBe('custom message');
  });
});
