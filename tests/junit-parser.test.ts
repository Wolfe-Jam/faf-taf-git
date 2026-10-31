/**
 * JUnit XML Parser Tests
 */

import { parseJunitOutput } from '../src/parsers/junit';
import { parseTestOutput, SUPPORTED_PARSERS } from '../src/parsers';

describe('JUnit XML Parser', () => {
  describe('parseJunitOutput', () => {
    test('should parse a pytest report (<testsuites> root without totals)', () => {
      const output = `<?xml version="1.0" encoding="utf-8"?>
<testsuites name="pytest tests"><testsuite name="pytest" errors="0" failures="1" skipped="2" tests="12" time="0.4" timestamp="2026-10-29T20:00:00" hostname="runner">
<testcase classname="tests.test_a" name="test_ok" time="0.001" />
<testcase classname="tests.test_a" name="test_bad" time="0.002"><failure message="assert 1 == 2">assert 1 == 2</failure></testcase>
</testsuite></testsuites>`;
      const result = parseJunitOutput(output);
      expect(result).toEqual({ total: 12, passed: 9, failed: 1, skipped: 2, result: 'FAILED' });
    });

    test('should use the totals on a <testsuites> root (gotestsum, Maven)', () => {
      const output = `<testsuites tests="40" failures="0" errors="0" skipped="3">
  <testsuite name="pkg/a" tests="25" failures="0" errors="0" skipped="1"></testsuite>
  <testsuite name="pkg/b" tests="15" failures="0" errors="0" skipped="2"></testsuite>
</testsuites>`;
      expect(parseJunitOutput(output)).toEqual({ total: 40, passed: 37, failed: 0, skipped: 3, result: 'PASSED' });
    });

    test('should sum the suites when the root has no totals (cargo2junit)', () => {
      const output = `<testsuites>
  <testsuite id="0" name="faf_rust_sdk" package="testsuite/faf_rust_sdk" tests="30" errors="0" failures="0" hostname="localhost" timestamp="2026-10-29T20:00:00Z" time="0">
    <testcase name="parses_minimal" time="0" />
  </testsuite>
  <testsuite id="1" name="integration" tests="8" errors="1" failures="0" skipped="0" time="0"></testsuite>
</testsuites>`;
      expect(parseJunitOutput(output)).toEqual({ total: 38, passed: 37, failed: 1, skipped: undefined, result: 'FAILED' });
    });

    test('should parse a single <testsuite> root', () => {
      const output = `<?xml version="1.0"?>
<testsuite name="jest tests" tests="7" failures="0" errors="0" skipped="0"></testsuite>`;
      expect(parseJunitOutput(output)).toEqual({ total: 7, passed: 7, failed: 0, skipped: undefined, result: 'PASSED' });
    });

    test('should count nested suites once (outermost level only)', () => {
      const output = `<testsuites>
  <testsuite name="outer" tests="5" failures="0" errors="0">
    <testsuite name="inner" tests="5" failures="0" errors="0"></testsuite>
  </testsuite>
</testsuites>`;
      expect(parseJunitOutput(output)!.total).toBe(5);
    });

    test('should count failures and errors together as failed', () => {
      const output = `<testsuite tests="10" failures="2" errors="1" skipped="1"></testsuite>`;
      expect(parseJunitOutput(output)).toEqual({ total: 10, passed: 6, failed: 3, skipped: 1, result: 'FAILED' });
    });

    test('should count disabled tests as skipped', () => {
      const output = `<testsuites tests="6" failures="0" errors="0" disabled="2"></testsuites>`;
      expect(parseJunitOutput(output)).toEqual({ total: 6, passed: 4, failed: 0, skipped: 2, result: 'PASSED' });
    });

    test('should count <testcase> elements when the suites carry no counts', () => {
      const output = `<testsuites><testsuite name="bare">
  <testcase name="a" />
  <testcase name="b"><failure message="boom" /></testcase>
  <testcase name="c"><skipped /></testcase>
  <testcase name="d"><error message="crash" /></testcase>
</testsuite></testsuites>`;
      expect(parseJunitOutput(output)).toEqual({ total: 4, passed: 1, failed: 2, skipped: 1, result: 'FAILED' });
    });

    test('should accept single-quoted attributes', () => {
      expect(parseJunitOutput(`<testsuite tests='3' failures='0'></testsuite>`)!.total).toBe(3);
    });

    test('should ignore a commented-out suite', () => {
      const output = `<!-- <testsuite tests="99" failures="9"></testsuite> -->
<testsuite tests="2" failures="0"></testsuite>`;
      expect(parseJunitOutput(output)).toEqual({ total: 2, passed: 2, failed: 0, skipped: undefined, result: 'PASSED' });
    });

    test('should count skipped testcases when the counts leave skipped out (gotestsum)', () => {
      // gotestsum: the <testsuites> root has tests and failures, no skipped.
      const output = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites tests="3" failures="1" errors="0" time="0.012">
	<testsuite tests="3" failures="1" time="0.004" name="example.com/demo" timestamp="2026-10-31T17:00:00Z">
		<testcase classname="example.com/demo" name="TestPass" time="0.000"></testcase>
		<testcase classname="example.com/demo" name="TestFail" time="0.000">
			<failure message="Failed" type="">demo_test.go:9: boom</failure>
		</testcase>
		<testcase classname="example.com/demo" name="TestSkip" time="0.000">
			<skipped message="demo_test.go:12: later"></skipped>
		</testcase>
	</testsuite>
</testsuites>`;
      expect(parseJunitOutput(output)).toEqual({ total: 3, passed: 1, failed: 1, skipped: 1, result: 'FAILED' });
    });

    test('should return null for a report with zero tests', () => {
      expect(parseJunitOutput(`<testsuites><testsuite tests="0" failures="0"></testsuite></testsuites>`)).toBeNull();
    });

    test('should return null for output that is not JUnit XML', () => {
      expect(parseJunitOutput('Tests: 173 passed, 173 total')).toBeNull();
      expect(parseJunitOutput('')).toBeNull();
    });
  });

  describe('parseTestOutput routing', () => {
    test('should list JUnit XML first among the supported parsers', () => {
      expect(SUPPORTED_PARSERS[0]).toBe('JUnit XML');
    });

    test('should read the XML counts even when captured stdout holds another summary line', () => {
      const output = `<testsuite tests="20" failures="0" errors="0" skipped="0">
  <system-out>Tests: 3 passed, 3 total</system-out>
</testsuite>`;
      expect(parseTestOutput(output)!.total).toBe(20);
    });

    test('should still route plain Jest output to the Jest parser', () => {
      expect(parseTestOutput('Tests: 1 failed, 172 passed, 173 total')!.total).toBe(173);
    });
  });
});
