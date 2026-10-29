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
 * - nested <testsuite>s (only the outermost level is counted, never twice)
 * - suites with no counts at all (the <testcase> elements are counted instead)
 *
 * failures + errors count as failed; skipped + disabled count as skipped.
 */
export declare function parseJunitOutput(output: string): TestResults | null;
//# sourceMappingURL=junit.d.ts.map