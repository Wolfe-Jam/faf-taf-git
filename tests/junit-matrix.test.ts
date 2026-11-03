/**
 * JUnit compatibility matrix: real reports, written by the real runners.
 *
 * Every fixture in tests/fixtures/junit/ was produced by the runner named in its
 * file name (versions, commands and each runner's own summary line are in
 * tests/fixtures/junit/README.md). The expected counts below are what the
 * runner itself printed, not what the parser happens to return.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { parseJunitOutput } from '../src/parsers/junit';
import { parseTestOutput, TestResults } from '../src/parsers';

const FIXTURES = join(__dirname, 'fixtures', 'junit');
const fixture = (name: string): string => readFileSync(join(FIXTURES, name), 'utf8');

interface Case {
  runner: string;
  file: string;
  /** The runner's own summary line, as printed. */
  summary: string;
  expected: TestResults;
}

const CASES: Case[] = [
  {
    runner: 'pytest (setup error in a fixture)',
    file: 'pytest.xml',
    summary: '1 failed, 2 passed, 1 skipped, 1 error',
    // A setup error is an <error>: it counts as failed.
    expected: { total: 5, passed: 2, failed: 2, skipped: 1, result: 'FAILED' },
  },
  {
    runner: 'gotestsum (t.Run subtest)',
    file: 'gotestsum.xml',
    summary: 'DONE 5 tests, 1 skipped, 1 failure',
    // A parent test and its subtest are two testcases; the root has no skipped=.
    expected: { total: 5, passed: 3, failed: 1, skipped: 1, result: 'FAILED' },
  },
  {
    runner: 'Jest + jest-junit (describe inside a describe)',
    file: 'jest-junit.xml',
    summary: 'Tests:       1 failed, 1 skipped, 2 passed, 4 total',
    expected: { total: 4, passed: 2, failed: 1, skipped: 1, result: 'FAILED' },
  },
  {
    runner: 'Vitest (describe inside a describe)',
    file: 'vitest.xml',
    summary: 'Tests  1 failed | 2 passed | 1 skipped (4)',
    expected: { total: 4, passed: 2, failed: 1, skipped: 1, result: 'FAILED' },
  },
  {
    runner: 'node:test (top-level tests beside a nested describe, and a todo)',
    file: 'node-test.xml',
    summary: 'tests 5 · pass 2 · fail 1 · skipped 1 · todo 1',
    // A todo is written as <skipped type="todo">: skipped 1 + todo 1 = 2.
    expected: { total: 5, passed: 2, failed: 1, skipped: 2, result: 'FAILED' },
  },
  {
    runner: 'mocha xunit (nested describe)',
    file: 'mocha.xml',
    summary: '2 passing · 1 pending · 1 failing',
    // mocha's xunit reporter writes a failed test as errors="1", failures="0".
    expected: { total: 4, passed: 2, failed: 1, skipped: 1, result: 'FAILED' },
  },
  {
    runner: 'PHPUnit (data provider: nested suites)',
    file: 'phpunit.xml',
    summary: 'Tests: 4, Assertions: 3, Failures: 1, Skipped: 1.',
    // Three suite levels (CLI Arguments > SampleTest > SampleTest::testPass), each counting every test inside it.
    expected: { total: 4, passed: 2, failed: 1, skipped: 1, result: 'FAILED' },
  },
  {
    runner: '.NET xUnit + JunitXml.TestLogger ([Fact(Skip=…)])',
    file: 'dotnet.xml',
    summary: 'Failed!  - Failed:     1, Passed:     2, Skipped:     1, Total:     4',
    expected: { total: 4, passed: 2, failed: 1, skipped: 1, result: 'FAILED' },
  },
];

describe('JUnit matrix: real runner reports', () => {
  describe.each(CASES)('$runner', ({ file, expected }) => {
    test(`parseJunitOutput gives the runner's own counts (${file})`, () => {
      expect(parseJunitOutput(fixture(file))).toEqual(expected);
    });

    test(`parseTestOutput routes to JUnit and gives the same result (${file})`, () => {
      expect(parseTestOutput(fixture(file))).toEqual(expected);
    });
  });

  describe('cargo nextest (#[ignore] test)', () => {
    // Runner: "3 tests run: 2 passed, 1 failed, 1 skipped".
    // GAP: nextest leaves ignored tests out of its JUnit report entirely
    // (tests="3" skipped="0", no <testcase> for the ignored test), so the skip
    // cannot be recovered from the XML. The parser reads the report correctly.
    const xml = fixture('cargo-nextest.xml');

    test('reads every test the report contains, with the right result', () => {
      expect(parseJunitOutput(xml)).toEqual({ total: 3, passed: 2, failed: 1, skipped: undefined, result: 'FAILED' });
      expect(parseTestOutput(xml)?.result).toBe('FAILED');
    });

    test.failing("gives the runner's own counts, including the ignored test (not in the report)", () => {
      expect(parseJunitOutput(xml)).toEqual({ total: 4, passed: 2, failed: 1, skipped: 1, result: 'FAILED' });
    });
  });

  describe('Maven Surefire (two test classes, one file each)', () => {
    // Runner: "Tests run: 4, Failures: 1, Errors: 0, Skipped: 1".
    const first = fixture('maven-surefire-FirstTest.xml');
    const second = fixture('maven-surefire-SecondTest.xml');

    test('the files concatenated (cat TEST-*.xml) give the runner\'s own counts', () => {
      const expected = { total: 4, passed: 2, failed: 1, skipped: 1, result: 'FAILED' };
      expect(parseJunitOutput(first + second)).toEqual(expected);
      expect(parseTestOutput(first + second)).toEqual(expected);
    });

    test('each file alone holds only its own class', () => {
      expect(parseJunitOutput(first)).toEqual({ total: 2, passed: 1, failed: 1, skipped: undefined, result: 'FAILED' });
      // One file alone can say PASSED for a run that failed: pass them all.
      expect(parseJunitOutput(second)).toEqual({ total: 2, passed: 1, failed: 0, skipped: 1, result: 'PASSED' });
    });
  });
});
