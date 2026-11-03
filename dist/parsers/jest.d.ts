/**
 * Jest output parser
 *
 * Extracts test counts from Jest CLI output
 */
export interface TestResults {
    total: number;
    passed: number;
    failed: number;
    skipped?: number;
    result: TestResult;
}
/** SKIPPED: tests were found, every one was skipped, so nothing passed or failed. */
export type TestResult = 'PASSED' | 'FAILED' | 'IMPROVED' | 'DEGRADED' | 'SKIPPED';
/**
 * Parse Jest output to extract test results
 *
 * Jest output formats:
 * - "Tests: 1 failed, 172 passed, 173 total"
 * - "Tests: 173 passed, 173 total"
 * - "Test Suites: 2 failed, 16 passed, 18 total"
 * - "Tests:       9 skipped, 799 passed, 808 total" (with padding)
 */
export declare function parseJestOutput(output: string): TestResults | null;
/**
 * Example Jest outputs for testing:
 *
 * All passing:
 * "Tests: 173 passed, 173 total"
 *
 * Some failing:
 * "Tests: 1 failed, 172 passed, 173 total"
 *
 * With skipped:
 * "Tests: 1 failed, 2 skipped, 170 passed, 173 total"
 *
 * With padding (CI):
 * "Tests:       9 skipped, 799 passed, 808 total"
 */
