/**
 * Unified test output parser
 *
 * Tries each framework parser in order until one succeeds.
 */
import { TestResults } from './jest';
export { TestResults } from './jest';
export { parseWjttcOutput } from './wjttc';
export declare const SUPPORTED_PARSERS: readonly string[];
/** What the CLI and the Action report when no parser matches. */
export declare const UNPARSEABLE_OUTPUT: string;
/**
 * Parse test output from any supported framework: the first parser in
 * PARSERS that recognises the output wins.
 */
export declare function parseTestOutput(output: string): TestResults | null;
//# sourceMappingURL=index.d.ts.map