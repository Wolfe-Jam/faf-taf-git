/**
 * The Action's parse error names every parser the dispatcher tries.
 *
 * It said "Supported: Jest, Vitest." while Bun (2.2.0) and WJTTC (2.3.0)
 * were already live. The CLI and the Action now build the message from the
 * same parser table that parseTestOutput walks.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Factory mocks: no real @actions/* module (or its undici network stack) loads.
jest.mock('@actions/core', () => ({
  getInput: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  debug: jest.fn(),
  setOutput: jest.fn(),
  setFailed: jest.fn(),
}));
jest.mock('@actions/exec', () => ({ exec: jest.fn() }));

import * as core from '@actions/core';

describe('Action: unparseable test output', () => {
  it('fails with a message naming Bun, WJTTC, Jest and Vitest', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'taf-action-'));
    const file = path.join(dir, 'test-output.txt');
    fs.writeFileSync(file, 'no test summary here\n');
    (core.getInput as jest.Mock).mockImplementation((name: string) =>
      name === 'test-output-file' ? file : '',
    );

    // src/index.ts runs the Action on load; the parse failure is reached
    // before its first await, so setFailed has been called when this returns.
    jest.isolateModules(() => {
      require('../src/index');
    });

    const failures = (core.setFailed as jest.Mock).mock.calls.map((c) => String(c[0]));
    expect(failures).toHaveLength(1);
    for (const parser of ['Bun', 'WJTTC', 'Jest', 'Vitest']) {
      expect(failures[0]).toContain(parser);
    }
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
