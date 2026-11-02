/**
 * JUnit XML parser
 *
 * Extracts test counts from a JUnit XML report — the common format nearly every
 * test runner can write: pytest (--junitxml), cargo (nextest, cargo2junit), Go
 * (go-junit-report, gotestsum), Maven/Gradle, .NET, PHPUnit, Jest (jest-junit).
 */
import { TestResults } from './jest';
/**
 * Parse a JUnit XML report to extract test results
 *
 * Handles:
 * - a <testsuites> root that carries the totals (gotestsum, Maven)
 * - a <testsuites> root without totals, around counted <testsuite>s (pytest)
 * - a single <testsuite> root
 * - nested <testsuite>s, or <testcase>s outside any suite: the <testcase>s are
 *   counted. Writers disagree on what an outer suite's `tests` means (node:test
 *   counts a nested describe as one test; PHPUnit counts every test inside it),
 *   and node:test puts top-level tests beside its suites, under the root
 * - suites with no counts at all (the <testcase> elements are counted instead)
 *
 * failures + errors count as failed; skipped + disabled count as skipped.
 */
export declare function parseJunitOutput(output: string): TestResults | null;
//# sourceMappingURL=junit.d.ts.map