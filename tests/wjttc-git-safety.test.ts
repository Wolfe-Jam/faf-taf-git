/**
 * 🏁 WJTTC — git safety for the receipt commit (WJTTC audit wave 2, B3/B4/B6)
 *
 *   B4  the commit message is the user's text: git gets it as an argument,
 *       never through a shell (`$(…)` must not run)
 *   B3  the receipt commit holds .taf only, whatever else is staged
 *   B6  the bot identity never lands in git config (the Action used
 *       `git config --global`, which on a developer machine replaces their
 *       name and email everywhere)
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runTafGit } from '../src/cli';
import { botGitEnv } from '../src/git-env';

const git = (cwd: string, ...args: string[]): string =>
  execFileSync('git', args, { cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] }).toString();

const JEST_OUT = 'Tests:       3 passed, 3 total\n';

function repo(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'taf-git-'));
  git(d, 'init', '-q');
  git(d, 'config', 'user.email', 'dev@example.invalid');
  git(d, 'config', 'user.name', 'dev');
  git(d, 'config', 'commit.gpgsign', 'false');
  fs.writeFileSync(path.join(d, 'README.md'), '# r\n');
  fs.writeFileSync(path.join(d, '.taf'), 'test_history: []\n');
  git(d, 'add', 'README.md', '.taf');
  git(d, 'commit', '-q', '-m', 'base');
  fs.writeFileSync(path.join(d, 'out.txt'), JEST_OUT);
  return d;
}

describe('🏁 WJTTC — receipt commit git safety', () => {
  test('B4: $(…) in --message does not run; the subject keeps the text as written', async () => {
    const d = repo();
    const message = 'x$(touch INJECTED)y';
    const r = await runTafGit({ file: path.join(d, 'out.txt'), cwd: d, autoCommit: true, commitMessage: message, logger: () => {} });
    expect(r.success).toBe(true);
    expect(fs.existsSync(path.join(d, 'INJECTED'))).toBe(false);
    expect(git(d, 'log', '-1', '--format=%s').trim()).toBe(message);
  });

  test('B3: a staged unrelated file is not swept into the receipt commit', async () => {
    const d = repo();
    fs.writeFileSync(path.join(d, 'wip.txt'), 'work in progress\n');
    git(d, 'add', 'wip.txt');
    const r = await runTafGit({ file: path.join(d, 'out.txt'), cwd: d, autoCommit: true, logger: () => {} });
    expect(r.success).toBe(true);
    expect(git(d, 'show', '--name-only', '--format=', 'HEAD').trim().split('\n')).toEqual(['.taf']);
    expect(git(d, 'diff', '--cached', '--name-only').trim()).toBe('wip.txt');
  });

  test('B6: the bot identity is passed in the environment, not written to config', () => {
    const env = botGitEnv({ PATH: '/usr/bin', HOME: '/home/x', UNSET: undefined });
    expect(env.GIT_AUTHOR_NAME).toBe('faf-taf-git[bot]');
    expect(env.GIT_COMMITTER_NAME).toBe('faf-taf-git[bot]');
    expect(env.GIT_AUTHOR_EMAIL).toBe('faf-taf-git[bot]@users.noreply.github.com');
    expect(env.PATH).toBe('/usr/bin');
    expect('UNSET' in env).toBe(false);
  });

  test('B6: the Action source never runs `git config --global`', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.ts'), 'utf-8');
    expect(src).not.toMatch(/['"]config['"],\s*['"]--global['"]/);
  });

  test('B6: a commit made with the bot env carries the bot identity and leaves config alone', () => {
    const d = repo();
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'taf-home-'));
    const globalCfg = path.join(home, '.gitconfig');
    fs.writeFileSync(globalCfg, '[user]\n\tname = Developer\n\temail = dev@example.invalid\n');
    fs.writeFileSync(path.join(d, '.taf'), 'x: 1\n');
    const env = { ...botGitEnv(), GIT_CONFIG_GLOBAL: globalCfg };
    execFileSync('git', ['add', '--', '.taf'], { cwd: d, env });
    execFileSync('git', ['commit', '-q', '-m', 'r', '--', '.taf'], { cwd: d, env });
    expect(git(d, 'log', '-1', '--format=%an <%ae>').trim()).toBe('faf-taf-git[bot] <faf-taf-git[bot]@users.noreply.github.com>');
    expect(fs.readFileSync(globalCfg, 'utf-8')).toContain('name = Developer');
    expect(git(d, 'config', '--local', '--get', 'user.name').trim()).toBe('dev');
  });
});
