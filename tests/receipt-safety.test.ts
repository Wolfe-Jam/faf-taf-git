/**
 * Receipts are never lost, and a developer's checkout is never touched.
 *   - B1: a receipt write keeps the file's comments and any later `---` documents
 *   - B2: runs that write the same .taf at once each keep their receipt
 *   - B5: a receipt that can't be pushed is an error (CLI exit 1, Action fails),
 *         never a quiet exit 0
 *   - F4: with target-branch the Action writes in its own worktree: the job's
 *         checkout keeps its branch, its staged work and its files, and no stash
 *   - F5: options take `--name=value` too
 * From the WJTTC wave-2 audit (B1, B2, B5) and the #39 review (F4, F5). Runs the
 * built bundles (dist/) against throwaway repos and a local bare remote.
 */
import { execFileSync, spawn, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as yaml from 'yaml';
import { updateTafFile } from '../src/taf-core';
import { optionValue } from '../src/cli';
import { pushFailureReason } from '../src/git-env';

// An exported GIT_DIR / GIT_WORK_TREE / GIT_INDEX_FILE would point git at another repository.
for (const k of Object.keys(process.env)) {
  if (k.startsWith('GIT_')) {delete process.env[k];}
}

const CLI = path.join(__dirname, '..', 'dist', 'cli.js');
const ACTION = path.join(__dirname, '..', 'dist', 'index.js');
const JEST_OUT = 'Tests:       3 passed, 3 total\n';
const RESULTS = { total: 3, passed: 3, failed: 0, result: 'PASSED' as const };

const git = (cwd: string, args: string[], env: NodeJS.ProcessEnv): string =>
  execFileSync('git', args, { cwd, env, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] }).toString();

/** A repo with `pkg/.taf`, pushed to a local bare remote, under a throwaway HOME. */
function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'taf-safety-'));
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

const receipts = (text: string): number => (yaml.parseAllDocuments(text)[0] as yaml.Document).toJS().test_history.length;

describe('B1: a receipt write keeps what else is in the file', () => {
  it('keeps comments and a later document', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'taf-b1-'));
    const taf = path.join(dir, '.taf');
    fs.writeFileSync(taf, '# keep this comment\nformat_version: "1.0.0"\ntest_history: []\n---\nsecond_doc: important\n');
    expect(updateTafFile(taf, RESULTS)).toBe(true);
    const text = fs.readFileSync(taf, 'utf-8');
    expect(text).toContain('# keep this comment');
    expect(text).toContain('second_doc: important');
    expect(receipts(text)).toBe(1);
    expect(fs.readdirSync(dir)).toEqual(['.taf']); // no lock or temp file left
  });
});

describe('B2: writers at the same time each keep their receipt', () => {
  it('20 CLI runs on one .taf leave 20 receipts', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'taf-b2-'));
    fs.writeFileSync(path.join(dir, '.taf'), 'test_history: []\n');
    fs.writeFileSync(path.join(dir, 'out.txt'), JEST_OUT);
    const runs = Array.from({ length: 20 }, () => new Promise<number>((resolve) => {
      spawn(process.execPath, [CLI, '--file', 'out.txt'], { cwd: dir, stdio: 'ignore' }).on('close', (c) => resolve(c ?? 1));
    }));
    expect(await Promise.all(runs)).toEqual(Array(20).fill(0));
    expect(receipts(fs.readFileSync(path.join(dir, '.taf'), 'utf-8'))).toBe(20);
    expect(fs.readdirSync(dir).sort()).toEqual(['.taf', 'out.txt']);
  }, 60_000);
});

describe('B5: a receipt that is not pushed is an error', () => {
  it('CLI --commit behind the remote: exit 1 and says why', () => {
    const { root, repo, remote, env, out } = setup();
    const other = path.join(root, 'other');
    git(root, ['clone', '-q', '-b', 'main', remote, other], env);
    fs.writeFileSync(path.join(other, 'x.txt'), 'x\n');
    git(other, ['add', 'x.txt'], env);
    git(other, ['commit', '-q', '-m', 'someone else'], env);
    git(other, ['push', '-q', 'origin', 'HEAD:main'], env);
    const r = spawnSync(process.execPath, [CLI, '--file', out, '--commit'], { cwd: path.join(repo, 'pkg'), env, encoding: 'utf-8' });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/committed but not pushed: .*rejected.*git pull --rebase && git push/);
  });

  it('CLI --commit with no upstream: exit 0, and says it was not pushed', () => {
    const { repo, env, out } = setup();
    git(repo, ['branch', '--unset-upstream'], env);
    const r = spawnSync(process.execPath, [CLI, '--file', out, '--commit'], { cwd: path.join(repo, 'pkg'), env, encoding: 'utf-8' });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('no upstream, so it was not pushed');
  });

  it('Action on the current branch: a rejected push fails the step', () => {
    const { root, repo, remote, env, out } = setup();
    const other = path.join(root, 'other');
    git(root, ['clone', '-q', '-b', 'main', remote, other], env);
    fs.writeFileSync(path.join(other, 'x.txt'), 'x\n');
    git(other, ['add', 'x.txt'], env);
    git(other, ['commit', '-q', '-m', 'someone else'], env);
    git(other, ['push', '-q', 'origin', 'HEAD:main'], env);
    const r = spawnSync(process.execPath, [ACTION], { cwd: path.join(repo, 'pkg'), env: { ...env, 'INPUT_TEST-OUTPUT-FILE': out }, encoding: 'utf-8' });
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('receipt-pushed');
    expect(r.stdout).toMatch(/::error::The receipt is committed but not pushed/);
  });

  it('the push failure reason is git\'s rejection line, not its hint', () => {
    const stderr = 'To ../remote.git\n ! [rejected]        main -> main (fetch first)\nerror: failed to push some refs\nhint: Updates were rejected.\nhint: See the note.\n';
    expect(pushFailureReason(stderr)).toBe('! [rejected]        main -> main (fetch first)');
  });
});

describe('F4: target-branch leaves the checkout as it was', () => {
  it.each(['a new receipts branch', 'an existing one'])('%s: same branch, staged work kept, no stash, .taf only', (when) => {
    const { repo, remote, env, out } = setup();
    const runFromPkg = () => spawnSync(process.execPath, [ACTION], {
      cwd: path.join(repo, 'pkg'),
      env: { ...env, 'INPUT_TEST-OUTPUT-FILE': out, 'INPUT_TARGET-BRANCH': 'taf-receipts' },
      encoding: 'utf-8',
    });
    if (when === 'an existing one') {expect(runFromPkg().status).toBe(0);}

    fs.writeFileSync(path.join(repo, 'wip.txt'), 'my work\n');
    git(repo, ['add', 'wip.txt'], env);
    fs.writeFileSync(path.join(repo, 'notes.txt'), 'untracked\n');

    const r = runFromPkg();
    expect(r.status).toBe(0);
    expect(git(repo, ['branch', '--show-current'], env).trim()).toBe('main');
    expect(git(repo, ['stash', 'list'], env).trim()).toBe('');
    expect(git(repo, ['diff', '--cached', '--name-only'], env).trim()).toBe('wip.txt');
    expect(fs.existsSync(path.join(repo, 'notes.txt'))).toBe(true);
    expect(git(repo, ['worktree', 'list'], env).trim().split('\n')).toHaveLength(1);
    expect(git(repo, ['--git-dir', remote, 'ls-tree', '-r', '--name-only', 'taf-receipts'], env).trim()).toBe('pkg/.taf');
    const remoteTaf = git(repo, ['--git-dir', remote, 'show', 'taf-receipts:pkg/.taf'], env);
    expect(receipts(remoteTaf)).toBe(when === 'an existing one' ? 2 : 1);
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
