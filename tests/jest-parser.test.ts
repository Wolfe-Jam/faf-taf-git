/**
 * Tests for Jest output parser
 */

import { parseJestOutput } from '../src/parsers/jest';

describe('Jest Parser', () => {
  describe('parseJestOutput', () => {
    it('should parse all passing tests', () => {
      const output = `
Test Suites: 18 passed, 18 total
Tests:       173 passed, 173 total
Snapshots:   0 total
Time:        2.5s
`;

      const result = parseJestOutput(output);

      expect(result).not.toBeNull();
      expect(result?.total).toBe(173);
      expect(result?.passed).toBe(173);
      expect(result?.failed).toBe(0);
      expect(result?.result).toBe('PASSED');
    });

    it('should parse with failed tests', () => {
      const output = `
Test Suites: 1 failed, 17 passed, 18 total
Tests:       1 failed, 172 passed, 173 total
Snapshots:   0 total
Time:        2.5s
`;

      const result = parseJestOutput(output);

      expect(result).not.toBeNull();
      expect(result?.total).toBe(173);
      expect(result?.passed).toBe(172);
      expect(result?.failed).toBe(1);
      expect(result?.result).toBe('FAILED');
    });

    it('should parse with skipped tests', () => {
      const output = `
Test Suites: 18 passed, 18 total
Tests:       2 skipped, 171 passed, 173 total
Snapshots:   0 total
Time:        2.5s
`;

      const result = parseJestOutput(output);

      expect(result).not.toBeNull();
      expect(result?.total).toBe(173);
      expect(result?.passed).toBe(171);
      expect(result?.failed).toBe(0);
      expect(result?.skipped).toBe(2);
      expect(result?.result).toBe('PASSED');
    });

    it('should parse with mixed results', () => {
      const output = `
Test Suites: 2 failed, 16 passed, 18 total
Tests:       5 failed, 3 skipped, 165 passed, 173 total
Snapshots:   0 total
Time:        2.5s
`;

      const result = parseJestOutput(output);

      expect(result).not.toBeNull();
      expect(result?.total).toBe(173);
      expect(result?.passed).toBe(165);
      expect(result?.failed).toBe(5);
      expect(result?.skipped).toBe(3);
      expect(result?.result).toBe('FAILED');
    });

    it('should handle output without test line', () => {
      const output = `
Some random output
No test results here
`;

      const result = parseJestOutput(output);

      expect(result).toBeNull();
    });

    it('should handle malformed output', () => {
      const output = `
Tests: invalid data
`;

      const result = parseJestOutput(output);

      expect(result).toBeNull();
    });

    it('should handle real CLI output with colors', () => {
      const output = `
PASS src/commands/taf-init.test.ts
PASS src/commands/taf-log.test.ts
PASS src/commands/taf-validate.test.ts

Test Suites: 18 passed, 18 total
Tests:       173 passed, 173 total
Snapshots:   0 total
Time:        2.512 s
Ran all test suites.
`;

      const result = parseJestOutput(output);

      expect(result).not.toBeNull();
      expect(result?.total).toBe(173);
      expect(result?.passed).toBe(173);
      expect(result?.failed).toBe(0);
      expect(result?.result).toBe('PASSED');
    });
  });
});
