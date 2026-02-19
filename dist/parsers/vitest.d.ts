/**
 * Vitest output parser
 *
 * Extracts test counts from Vitest CLI output
 */
import { TestResults } from './jest';
/**
 * Parse Vitest output to extract test results
 *
 * Vitest output formats:
 * - " Tests  8 passed (8)"
 * - " Tests  2 failed | 6 passed (8)"
 * - " Tests  1 skipped | 7 passed (8)"
 * - " Tests  1 failed | 2 skipped | 5 passed (8)"
 */
export declare function parseVitestOutput(output: string): TestResults | null;
//# sourceMappingURL=vitest.d.ts.map