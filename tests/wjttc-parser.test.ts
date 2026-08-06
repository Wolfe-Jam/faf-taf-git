/**
 * WJTTC output parser — human log + --json suite
 */

import { parseWjttcOutput } from '../src/parsers/wjttc';
import { parseTestOutput } from '../src/parsers';

describe('parseWjttcOutput', () => {
  describe('human log', () => {
    test('all passing', () => {
      const output = `pc-ai WJTTC
----------
PASS  VAL-01  valid-simple portfolio accepts
PASS  OPT-01  $450 / MCC 4511
----------
2/2 passed
`;
      const r = parseWjttcOutput(output);
      expect(r).not.toBeNull();
      expect(r!.total).toBe(2);
      expect(r!.passed).toBe(2);
      expect(r!.failed).toBe(0);
      expect(r!.result).toBe('PASSED');
    });

    test('mixed pass/fail uses summary and FAIL lines', () => {
      const output = `pc-ai WJTTC
----------
PASS  GATE-01  valid portfolio reaches optimize
FAIL  DEPLOY-01  production serves the committed build
----------
1/2 passed
`;
      const r = parseWjttcOutput(output);
      expect(r).not.toBeNull();
      expect(r!.total).toBe(2);
      expect(r!.passed).toBe(1);
      expect(r!.failed).toBe(1);
      expect(r!.result).toBe('FAILED');
    });

    test('rejects bare N/N passed without WJTTC banner', () => {
      expect(parseWjttcOutput('12/12 passed\n')).toBeNull();
    });
  });

  describe('--json suite', () => {
    test('pc-ai-wjttc summary object', () => {
      const output = JSON.stringify({
        suite: 'pc-ai-wjttc',
        total: 33,
        passed: 31,
        failed: 2,
        results: [],
      });
      const r = parseWjttcOutput(output);
      expect(r).not.toBeNull();
      expect(r!.total).toBe(33);
      expect(r!.passed).toBe(31);
      expect(r!.failed).toBe(2);
      expect(r!.result).toBe('FAILED');
    });

    test('prefers results[] length when it disagrees with total (partition)', () => {
      const output = JSON.stringify({
        suite: 'pc-ai-wjttc',
        total: 33,
        passed: 33,
        failed: 0,
        results: [
          { id: 'VAL-01', ok: true },
          { id: 'OPT-01', ok: true },
          { id: 'GATE-01', ok: false },
        ],
      });
      const r = parseWjttcOutput(output);
      expect(r).not.toBeNull();
      expect(r!.total).toBe(3);
      expect(r!.passed).toBe(2);
      expect(r!.failed).toBe(1);
      expect(r!.result).toBe('FAILED');
    });

    test('ignores other JSON suites', () => {
      const output = JSON.stringify({
        suite: 'pc-ai-deployed',
        total: 12,
        passed: 12,
        failed: 0,
      });
      expect(parseWjttcOutput(output)).toBeNull();
    });
  });

  describe('dispatcher', () => {
    test('parseTestOutput picks WJTTC human log', () => {
      const output = `pc-ai WJTTC
----------
PASS  FAF-01  project.faf claims match
----------
1/1 passed
`;
      const r = parseTestOutput(output);
      expect(r).not.toBeNull();
      expect(r!.total).toBe(1);
      expect(r!.result).toBe('PASSED');
    });

    test('does not steal Jest Tests: line', () => {
      const output = 'Tests: 10 passed, 10 total';
      const r = parseTestOutput(output);
      expect(r).not.toBeNull();
      expect(r!.total).toBe(10);
    });
  });
});
