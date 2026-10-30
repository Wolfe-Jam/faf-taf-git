/**
 * `faf-taf-git --version` is a stranger's first command. Before 2.4.1 it fell
 * through to "No test output file specified" and exit 1 (found by /dev-notes
 * on the published 2.4.0).
 */
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { cliVersion } from '../src/cli';

const root = path.join(__dirname, '..');
const pkgVersion = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8')).version;
const bin = path.join(root, 'dist', 'cli.js');

describe('--version', () => {
  test('cliVersion() is the package.json version', () => {
    expect(cliVersion()).toBe(pkgVersion);
  });

  test.each(['--version', '-V'])('the built bin answers %s with the version and exit 0', (flag) => {
    const r = spawnSync(process.execPath, [bin, flag], { encoding: 'utf-8' });
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe(pkgVersion);
  });

  test('-v is still --verbose, not the version', () => {
    const r = spawnSync(process.execPath, [bin, '-v'], { encoding: 'utf-8' });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('No test output file specified');
  });
});
