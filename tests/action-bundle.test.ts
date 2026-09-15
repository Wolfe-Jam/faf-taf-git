/**
 * The built Action bundle — dist/index.js, what action.yml runs — loads and
 * reaches the parse step under this Node (CI runs 20.x, the runtime
 * action.yml declares).
 *
 * An open-ended `overrides.undici: ">=6.28.0"` resolved undici 8 (Node >=
 * 22.19), which crashed the bundle at load on Node 20, before any input was
 * read. The src-level tests never executed the bundle, so nothing caught it.
 */
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { UNPARSEABLE_OUTPUT } from '../src/parsers';

describe('Action bundle (dist/index.js)', () => {
  it('loads and fails an unparseable test output with the parser list', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'taf-bundle-'));
    const file = path.join(dir, 'test-output.txt');
    fs.writeFileSync(file, 'no test summary here\n');

    // Actions pass inputs as INPUT_<NAME> env vars; stdout is captured here,
    // so the ::error:: line never reaches a real runner's log.
    const run = spawnSync(process.execPath, [path.join(__dirname, '..', 'dist', 'index.js')], {
      env: { ...process.env, 'INPUT_TEST-OUTPUT-FILE': file },
      encoding: 'utf-8',
    });
    fs.rmSync(dir, { recursive: true, force: true });

    expect(run.stderr).not.toMatch(/TypeError/);
    expect(run.stdout).toContain(`::error::${UNPARSEABLE_OUTPUT}`);
    expect(run.status).toBe(1);
  });
});
