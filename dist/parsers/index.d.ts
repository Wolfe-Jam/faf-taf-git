/**
 * Unified test output parser
 *
 * Tries each framework parser in order until one succeeds.
 */
import { TestResults } from './jest';
export { TestResults } from './jest';
export { parseJunitOutput } from './junit';
export { parseWjttcOutput } from './wjttc';
export declare const SUPPORTED_PARSERS: readonly string[];
/** What the CLI and the Action report when no parser matches. */
export declare const UNPARSEABLE_OUTPUT: string;
/** A JUnit report that lists no tests (node --test with no test files): nothing ran, so no receipt. */
export declare const NO_TESTS = "No tests ran: the JUnit report lists 0 tests, so there is no receipt to print.";
/** Why the output gave no results: no tests at all, or a format faf-taf-git doesn't read. */
export declare function noResultsReason(output: string): string;
/**
 * Parse test output from any supported framework: the first parser in
 * PARSERS that recognises the output wins.
 */
export declare function parseTestOutput(output: string): TestResults | null;
