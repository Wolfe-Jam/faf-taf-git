/**
 * The built Action (dist/index.js, what action.yml runs) keeps git safe:
 *   - B6: the bot identity reaches the commit, and no git config is written —
 *     not the global one (a developer's), not the repo's
 *   - B3/F1: on the target-branch path the receipt commit holds .taf only,
 *     whatever else is staged
 * Follow-up to #39 (review F1, F2). Runs the bundle with INPUT_* env vars, a
 * throwaway HOME and global config, and a local bare remote. No network.
 */
import { execFileSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Any exported GIT_DIR / GIT_WORK_TREE / GIT_INDEX_FILE (a git hook, a wrapper)
// would point every git call below at another repository. Drop them for this file.
for (const k of Object.keys(process.env)) {
  if (k.startsWith('GIT_')) {delete process.env[k];}
}

const BUNDLE = path.join(__dirname, '..', 'dist', 'index.js');
const JEST_OUT = 'Tests:       3 passed, 3 total\n';

const git = (cwd: string, args: string[], env?: NodeJS.ProcessEnv): string =>
  execFileSync('git', args, { cwd, env, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] }).toString();

function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'taf-action-'));
  const home = path.join(root, 'home');
  fs.mkdirSync(home);
  const globalCfg = path.join(home, '.gitconfig');
  fs.writeFileSync(globalCfg, '[user]\n\tname = Developer\n\temail = dev@example.invalid\n[commit]\n\tgpgsign = false\n');
  const env = { ...process.env, HOME: home, GIT_CONFIG_GLOBAL: globalCfg, GIT_CONFIG_NOSYSTEM: '1' };
  const remote = path.join(root, 'remote.git');
  git(root, ['init', '-q', '--bare', remote], env);
  const repo = path.join(root, 'repo');
  git(root, ['init', '-q', repo], env);
  fs.writeFileSync(path.join(repo, 'README.md'), '# r\n');
  fs.writeFileSync(path.join(repo, '.taf'), 'test_history: []\n');
  git(repo, ['add', 'README.md', '.taf'], env);
  git(repo, ['commit', '-q', '-m', 'base'], env);
  git(repo, ['remote', 'add', 'origin', remote], env);
  git(repo, ['push', '-q', 'origin', 'HEAD:refs/heads/main'], env);
  const out = path.join(root, 'out.txt');
  fs.writeFileSync(out, JEST_OUT);
  return { repo, env, globalCfg, out };
}

function runAction(repo: string, env: NodeJS.ProcessEnv, inputs: Record<string, string>) {
  const e: NodeJS.ProcessEnv = { ...env };
  for (const [k, v] of Object.entries(inputs)) {e[`INPUT_${k.toUpperCase()}`] = v;}
  return spawnSync(process.execPath, [BUNDLE], { cwd: repo, env: e, encoding: 'utf-8' });
}

describe('built Action: git safety', () => {
  test('B6: commit carries the bot identity; global and repo config untouched', () => {
    const { repo, env, globalCfg, out } = setup();
    const before = fs.readFileSync(globalCfg, 'utf-8');
    const r = runAction(repo, env, { 'test-output-file': out });
    expect(r.status).toBe(0);
    expect(git(repo, ['log', '-1', '--format=%an <%ae>'], env).trim()).toBe(
      'faf-taf-git[bot] <faf-taf-git[bot]@users.noreply.github.com>',
    );
    expect(fs.readFileSync(globalCfg, 'utf-8')).toBe(before);
    const local = spawnSync('git', ['config', '--local', '--get', 'user.name'], { cwd: repo, env, encoding: 'utf-8' });
    expect(local.stdout.trim()).toBe('');
  });

  test('F1: run from a subfolder, the target-branch receipt commit holds that .taf only', () => {
    // A step `working-directory: pkg`: the Action's cwd is a subfolder.
    // `checkout --orphan` keeps the whole index and `git rm -rf .` from pkg/
    // only clears pkg/, so without `-- .taf` the init commit took every other
    // tracked file onto the receipts branch.
    const { repo, env, globalCfg, out } = setup();
    const before = fs.readFileSync(globalCfg, 'utf-8');
    fs.mkdirSync(path.join(repo, 'pkg'));
    fs.mkdirSync(path.join(repo, 'src'));
    fs.writeFileSync(path.join(repo, 'pkg', '.taf'), 'test_history: []\n');
    fs.writeFileSync(path.join(repo, 'src', 'app.js'), 'console.log(1);\n');
    git(repo, ['add', 'pkg/.taf', 'src/app.js'], env);
    git(repo, ['commit', '-q', '-m', 'pkg'], env);
    const r = runAction(path.join(repo, 'pkg'), env, { 'test-output-file': out, 'target-branch': 'taf-receipts' });
    expect(r.status).toBe(0);
    git(repo, ['fetch', '-q', 'origin', 'taf-receipts'], env);
    const files = git(repo, ['ls-tree', '-r', '--name-only', 'FETCH_HEAD'], env).trim().split('\n');
    expect(files).toEqual(['pkg/.taf']);
    expect(git(repo, ['log', '-1', '--format=%an', 'FETCH_HEAD'], env).trim()).toBe('faf-taf-git[bot]');
    expect(fs.readFileSync(globalCfg, 'utf-8')).toBe(before);
  });
});
