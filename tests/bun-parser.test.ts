/**
 * Tests for Bun output parser
 */

import { parseBunOutput } from '../src/parsers/bun';

describe('Bun Parser', () => {
  describe('parseBunOutput', () => {
    it('should parse all passing tests (minimal output)', () => {
      const output = `
 173 pass
 0 fail
 612 expect() calls
Ran 173 tests across 8 files. [4.2s]
`;

      const result = parseBunOutput(output);

      expect(result).not.toBeNull();
      expect(result?.total).toBe(173);
      expect(result?.passed).toBe(173);
      expect(result?.failed).toBe(0);
      expect(result?.skipped).toBeUndefined();
      expect(result?.result).toBe('PASSED');
    });

    it('should parse the grok-faf-mcp 1.4.9 shape (pass + skip + todo + fail=0)', () => {
      const output = `
 232 pass
 1 skip
 1 todo
 0 fail
 848 expect() calls
Ran 234 tests across 9 files. [21.53s]
`;

      const result = parseBunOutput(output);

      expect(result).not.toBeNull();
      expect(result?.total).toBe(234);
      expect(result?.passed).toBe(232);
      expect(result?.failed).toBe(0);
      // skipped aggregates skip + todo (parity with vitest convention)
      expect(result?.skipped).toBe(2);
      expect(result?.result).toBe('PASSED');
    });

    it('should mark result FAILED when any tests fail', () => {
      const output = `
 170 pass
 3 fail
 612 expect() calls
Ran 173 tests across 8 files. [5.1s]
`;

      const result = parseBunOutput(output);

      expect(result).not.toBeNull();
      expect(result?.total).toBe(173);
      expect(result?.passed).toBe(170);
      expect(result?.failed).toBe(3);
      expect(result?.result).toBe('FAILED');
    });

    it('should handle skip-only output', () => {
      const output = `
 170 pass
 3 skip
 0 fail
 612 expect() calls
Ran 173 tests across 8 files. [5.0s]
`;

      const result = parseBunOutput(output);

      expect(result?.total).toBe(173);
      expect(result?.passed).toBe(170);
      expect(result?.skipped).toBe(3);
      expect(result?.result).toBe('PASSED');
    });

    it('should strip ANSI color codes', () => {
      const output =
        '\x1b[32m 232 pass\x1b[0m\n' +
        '\x1b[33m 1 skip\x1b[0m\n' +
        '\x1b[33m 1 todo\x1b[0m\n' +
        '\x1b[31m 0 fail\x1b[0m\n' +
        ' 848 expect() calls\n' +
        'Ran 234 tests across 9 files. [21.53s]\n';

      const result = parseBunOutput(output);

      expect(result?.total).toBe(234);
      expect(result?.passed).toBe(232);
      expect(result?.skipped).toBe(2);
    });

    it('should handle CRLF line endings', () => {
      const output =
        ' 173 pass\r\n 0 fail\r\nRan 173 tests across 8 files. [4.2s]\r\n';

      const result = parseBunOutput(output);

      expect(result?.total).toBe(173);
      expect(result?.passed).toBe(173);
    });

    it('should ignore an appended jest-shim "Tests:" line (legacy ci.yml conversion)', () => {
      // Some consumer CIs append a jest-shaped summary so the legacy jest
      // parser could read bun output. With bun support, the appended line
      // should be ignored — the canonical Ran-line wins.
      const output = `
 232 pass
 1 skip
 1 todo
 0 fail
 848 expect() calls
Ran 234 tests across 9 files. [21.53s]
Tests: 232 passed, 232 total
`;

      const result = parseBunOutput(output);

      // Truthful total from "Ran 234" — NOT 232 from the jest-shim line.
      expect(result?.total).toBe(234);
      expect(result?.passed).toBe(232);
      expect(result?.skipped).toBe(2);
    });

    it('should return null when no "Ran N tests" line is present (non-bun output)', () => {
      const output = `
Test Suites: 18 passed, 18 total
Tests:       173 passed, 173 total
Snapshots:   0 total
Time:        2.5s
`;

      const result = parseBunOutput(output);

      // Defers to the next parser in the dispatcher chain.
      expect(result).toBeNull();
    });

    it('should return null on empty input', () => {
      expect(parseBunOutput('')).toBeNull();
    });

    it('should return null when "Ran 0 tests" (nothing actually ran)', () => {
      const output = `
 0 pass
 0 fail
Ran 0 tests across 0 files. [0.1s]
`;

      const result = parseBunOutput(output);

      expect(result).toBeNull();
    });

    it('should handle singular forms gracefully (1 test)', () => {
      const output = `
 1 pass
 0 fail
Ran 1 test across 1 file. [0.5s]
`;

      const result = parseBunOutput(output);

      expect(result?.total).toBe(1);
      expect(result?.passed).toBe(1);
    });
  });
});
