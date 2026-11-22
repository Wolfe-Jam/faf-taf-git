/**
 * A first run with no .taf starts one: the command-line tool and the action on
 * the current branch, as the receipts branch already did. Before 3.0.1 both
 * stopped with "No .taf file found" (found by /dev-notes on 3.0.0).
 */
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as yaml from 'yaml';
import { runTafGit } from '../src/cli';
import { ensureTaf, newTafText, updateTafFile } from '../src/taf-core';

const ACTION = path.join(__dirname, '..', 'dist', 'index.js');
const made: string[] = [];
afterAll(() => made.forEach((d) => fs.rmSync(d, { recursive: true, force: true })));

function tempProject(name: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'taf-start-'));
  made.push(root);
  const dir = path.join(root, name);
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, 'out.txt'), 'Tests:       3 passed, 3 total\n');
  return dir;
}

describe('a first run with no .taf', () => {
  test('newTafText takes a receipt', () => {
    const dir = tempProject('fresh');
    const taf = path.join(dir, '.taf');
    fs.writeFileSync(taf, newTafText('fresh'));
    expect(updateTafFile(taf, { total: 1, passed: 1, failed: 0, result: 'PASSED' })).toBe(true);
    expect(yaml.parse(fs.readFileSync(taf, 'utf-8')).test_history).toHaveLength(1);
  });

  test('ensureTaf never writes over an existing .taf', () => {
    const dir = tempProject('kept');
    const taf = path.join(dir, '.taf');
    fs.writeFileSync(taf, 'project: mine\ntest_history: []\n');
    expect(ensureTaf(taf, 'kept')).toBe(false);
    expect(fs.readFileSync(taf, 'utf-8')).toBe('project: mine\ntest_history: []\n');
  });

  test('the command-line tool starts .taf and records the run', async () => {
    const dir = tempProject('my-app');
    const lines: string[] = [];
    const r = await runTafGit({ file: path.join(dir, 'out.txt'), cwd: dir, logger: (m) => lines.push(m) });
    expect(r.success).toBe(true);
    expect(lines.join('\n')).toContain('Started a new .taf');
    const taf = yaml.parse(fs.readFileSync(path.join(dir, '.taf'), 'utf-8'));
    expect(taf.project).toBe('my-app');
    expect(taf.test_history).toHaveLength(1);
    expect(taf.test_history[0].result).toBe('PASSED');
  });

  test('the action on the current branch starts .taf and records the run', () => {
    const dir = tempProject('action-app');
    const outputs = path.join(dir, 'github_output');
    fs.writeFileSync(outputs, '');
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      GITHUB_OUTPUT: outputs,
      'INPUT_TEST-OUTPUT-FILE': path.join(dir, 'out.txt'),
      'INPUT_TARGET-BRANCH': '',
      'INPUT_AUTO-COMMIT': 'false',
    };
    const r = spawnSync(process.execPath, [ACTION], { cwd: dir, env, encoding: 'utf-8' });
    expect(r.stdout).not.toContain('::error::');
    expect(r.stdout).toContain('Started a new .taf');
    const taf = yaml.parse(fs.readFileSync(path.join(dir, '.taf'), 'utf-8'));
    expect(taf.project).toBe('action-app');
    expect(taf.test_history).toHaveLength(1);
  });
});
