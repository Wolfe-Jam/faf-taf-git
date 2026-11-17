/**
 * Two runs that finish close together: the second push is rejected. Before
 * 2.4.3 that receipt was lost with a warning. pushReceipt fetches the branch
 * again, adds its receipt on top, and pushes. Real git, a bare remote, two
 * clones: the remote branch only grows, nothing is force-pushed.
 */
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { pushReceipt, Git } from '../src/receipt-push';

const run = (cwd: string, args: string[]) =>
  spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd, encoding: 'utf-8' });
const gitIn = (cwd: string): Git => async (args) => run(cwd, args).status ?? 1;

/** A bare remote with a taf-receipts branch holding one receipt, and two clones of it. */
function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'taf-push-'));
  const remote = path.join(root, 'remote.git');
  run(root, ['init', '-q', '--bare', remote]);
  const seed = path.join(root, 'seed');
  run(root, ['clone', '-q', remote, seed]);
  run(seed, ['checkout', '-q', '--orphan', 'taf-receipts']);
  fs.writeFileSync(path.join(seed, '.taf'), 'test_history:\n  - timestamp: r0\n');
  run(seed, ['add', '.taf']);
  run(seed, ['commit', '-q', '-m', 'r0']);
  run(seed, ['push', '-q', 'origin', 'taf-receipts']);
  const clone = (name: string) => {
    const dir = path.join(root, name);
    run(root, ['clone', '-q', '-b', 'taf-receipts', remote, dir]);
    return dir;
  };
  return { root, remote, a: clone('a'), b: clone('b') };
}

/** Adds one receipt line to the .taf in `dir`, the way updateTafFile appends. */
const addLine = (dir: string, id: string) => () => {
  fs.appendFileSync(path.join(dir, '.taf'), `  - timestamp: ${id}\n`);
  return true;
};

const remoteTaf = (remote: string) =>
  spawnSync('git', ['--git-dir', remote, 'show', 'taf-receipts:.taf'], { encoding: 'utf-8' }).stdout;

// The real wait between tries is up to seconds; these tests do not need it.
const noWait = { wait: async () => {} };

describe('pushReceipt', () => {
  it('pushes on the first try when nobody else did', async () => {
    const { root, remote, a } = setup();
    addLine(a, 'ra')();
    const calls: string[][] = [];
    const git: Git = async (args) => { calls.push(args); return gitIn(a)(args); };

    expect(await pushReceipt(git, 'taf-receipts', 'receipt', addLine(a, 'never'), noWait)).toEqual({ pushed: true, attempts: 1 });
    expect(calls.some((c) => c[0] === 'fetch')).toBe(false);
    expect(remoteTaf(remote)).toBe('test_history:\n  - timestamp: r0\n  - timestamp: ra\n');
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('a run that lost the race adds its receipt on top of the winner and pushes', async () => {
    const { root, remote, a, b } = setup();
    // Both runs add a receipt to the same tip; A pushes first.
    addLine(a, 'ra')();
    addLine(b, 'rb')();
    expect((await pushReceipt(gitIn(a), 'taf-receipts', 'receipt a', addLine(a, 'ra'), noWait)).pushed).toBe(true);

    const result = await pushReceipt(gitIn(b), 'taf-receipts', 'receipt b', addLine(b, 'rb'), noWait);
    expect(result).toEqual({ pushed: true, attempts: 2 });
    // Both receipts are on the remote, in order, and the branch only grew.
    expect(remoteTaf(remote)).toBe('test_history:\n  - timestamp: r0\n  - timestamp: ra\n  - timestamp: rb\n');
    const log = spawnSync('git', ['--git-dir', remote, 'log', '--format=%s', 'taf-receipts'], { encoding: 'utf-8' }).stdout;
    expect(log.trim().split('\n')).toEqual(['receipt b', 'receipt a', 'r0']);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('gives up after the set number of tries and says so', async () => {
    const { root, a } = setup();
    addLine(a, 'ra')();
    const real = gitIn(a);
    const git: Git = async (args) => (args[0] === 'push' ? 1 : real(args)); // every push rejected
    const added: string[] = [];
    const result = await pushReceipt(git, 'taf-receipts', 'receipt', () => { added.push('x'); return addLine(a, 'ra')(); }, noWait);
    expect(result).toEqual({ pushed: false, attempts: 5 });
    expect(added).toHaveLength(4); // re-added for tries 2 to 5
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('stops when the receipt cannot be added again', async () => {
    const { root, a } = setup();
    addLine(a, 'ra')();
    const real = gitIn(a);
    const git: Git = async (args) => (args[0] === 'push' ? 1 : real(args));
    // One push was tried before the stop: the count says so, not the maximum.
    expect(await pushReceipt(git, 'taf-receipts', 'receipt', () => false, noWait)).toEqual({ pushed: false, attempts: 1 });
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('waits before each try after the first, longer each time', async () => {
    const { root, a } = setup();
    addLine(a, 'ra')();
    const real = gitIn(a);
    const git: Git = async (args) => (args[0] === 'push' ? 1 : real(args));
    const waits: number[] = [];
    await pushReceipt(git, 'taf-receipts', 'receipt', addLine(a, 'ra'), { wait: async (n) => { waits.push(n); } });
    expect(waits).toEqual([2, 3, 4, 5]);
    fs.rmSync(root, { recursive: true, force: true });
  });
});
