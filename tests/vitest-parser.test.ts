/**
 * Vitest Parser Tests
 */

import { parseVitestOutput } from '../src/parsers/vitest';

describe('Vitest Parser', () => {
  describe('parseVitestOutput', () => {
    test('should parse all passing tests', () => {
      const output = `
 ✓ tests/basic.test.ts (3)
 ✓ tests/advanced.test.ts (5)

 Test Files  2 passed (2)
      Tests  8 passed (8)
   Start at  14:23:45
   Duration  1.23s
`;
      const result = parseVitestOutput(output);
      expect(result).not.toBeNull();
      expect(result!.total).toBe(8);
      expect(result!.passed).toBe(8);
      expect(result!.failed).toBe(0);
      expect(result!.result).toBe('PASSED');
    });

    test('should parse with failed tests', () => {
      const output = `
 ❯ tests/basic.test.ts (3)
   ✓ adds numbers
   × fails gracefully
   ✓ handles edge case

 Test Files  1 failed | 1 passed (2)
      Tests  1 failed | 7 passed (8)
   Start at  14:23:45
   Duration  2.34s
`;
      const result = parseVitestOutput(output);
      expect(result).not.toBeNull();
      expect(result!.total).toBe(8);
      expect(result!.passed).toBe(7);
      expect(result!.failed).toBe(1);
      expect(result!.result).toBe('FAILED');
    });

    test('should parse with skipped tests', () => {
      const output = `
 ✓ tests/basic.test.ts (7)

 Test Files  1 passed (1)
      Tests  2 skipped | 5 passed (7)
   Start at  14:23:45
   Duration  0.89s
`;
      const result = parseVitestOutput(output);
      expect(result).not.toBeNull();
      expect(result!.total).toBe(7);
      expect(result!.passed).toBe(5);
      expect(result!.skipped).toBe(2);
      expect(result!.result).toBe('PASSED');
    });

    test('should parse with failed, skipped, and todo', () => {
      const output = `
 Test Files  1 failed | 2 passed (3)
      Tests  1 failed | 2 skipped | 1 todo | 6 passed (10)
   Duration  3.45s
`;
      const result = parseVitestOutput(output);
      expect(result).not.toBeNull();
      expect(result!.total).toBe(10);
      expect(result!.passed).toBe(6);
      expect(result!.failed).toBe(1);
      expect(result!.skipped).toBe(3); // 2 skipped + 1 todo
      expect(result!.result).toBe('FAILED');
    });

    test('should handle output without test summary', () => {
      const output = 'Some random output\nNo test results here';
      const result = parseVitestOutput(output);
      expect(result).toBeNull();
    });

    test('should handle output with ANSI color codes', () => {
      const output = `
\x1b[32m ✓\x1b[0m tests/basic.test.ts (5)

 Test Files  \x1b[1m\x1b[32m1 passed\x1b[0m (1)
      Tests  \x1b[1m\x1b[32m5 passed\x1b[0m (5)
   Duration  0.45s
`;
      const result = parseVitestOutput(output);
      expect(result).not.toBeNull();
      expect(result!.total).toBe(5);
      expect(result!.passed).toBe(5);
      expect(result!.result).toBe('PASSED');
    });

    test('should handle large test counts', () => {
      const output = `
 Test Files  45 passed (45)
      Tests  1234 passed (1234)
   Duration  45.67s
`;
      const result = parseVitestOutput(output);
      expect(result).not.toBeNull();
      expect(result!.total).toBe(1234);
      expect(result!.passed).toBe(1234);
    });
  });
});
