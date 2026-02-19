/**
 * Unified test output parser
 *
 * Tries each framework parser in order until one succeeds.
 */
import { TestResults } from './jest';
export { TestResults } from './jest';
/**
 * Parse test output from any supported framework.
 * Tries parsers in order: Jest, Vitest.
 */
export declare function parseTestOutput(output: string): TestResults | null;
//# sourceMappingURL=index.d.ts.map