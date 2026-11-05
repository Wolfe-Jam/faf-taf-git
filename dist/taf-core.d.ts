/**
 * TAF Core - Simplified for GitHub Action
 *
 * Pure functions for reading, parsing, and updating .taf files
 * Derived from faf-cli TAF implementation (MCP-portable)
 */
import { TestResults } from './parsers/jest';
import { SkippedTestsBlock } from './skipped-names';
export interface UpdateOptions {
    /** Skipped names to write; 0 turns the skipped_tests block off. */
    skippedNamesCap?: number;
}
/** What the last updateTafFile call wrote, for outputs and logs. */
export interface UpdateReport {
    skippedTests?: SkippedTestsBlock;
    /** Why no skipped_tests block was written although tests were skipped. */
    skippedNamesNote?: string;
}
export declare const lastUpdate: UpdateReport;
/**
 * Update .taf file with new test results
 * Creates the file if it doesn't exist
 */
export declare function updateTafFile(tafPath: string, testResults: TestResults, options?: UpdateOptions): boolean;
/**
 * What fired the run: GitHub Actions, another CI, or a local run
 */
export declare function runTrigger(env?: NodeJS.ProcessEnv): string;
/**
 * The error when there is no .taf to append to, with the command that makes one
 */
export declare const NO_TAF_FILE = "No .taf file found. Create one: echo 'test_history: []' > .taf";
