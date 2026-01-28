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
    result: 'PASSED' | 'FAILED' | 'IMPROVED' | 'DEGRADED';
}
/**
 * Parse Jest output to extract test results
 *
 * Jest output formats:
 * - "Tests: 1 failed, 172 passed, 173 total"
 * - "Tests: 173 passed, 173 total"
 * - "Test Suites: 2 failed, 16 passed, 18 total"
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
 */
//# sourceMappingURL=jest.d.ts.map