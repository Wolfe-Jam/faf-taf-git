/**
 * TAF Core - Simplified for GitHub Action
 *
 * Pure functions for reading, parsing, and updating .taf files
 * Derived from faf-cli TAF implementation (MCP-portable)
 */
import { TestResults } from './parsers/jest';
/**
 * Update .taf file with new test results
 * Creates the file if it doesn't exist
 */
export declare function updateTafFile(tafPath: string, testResults: TestResults): boolean;
/**
 * What fired the run: GitHub Actions, another CI, or a local run
 */
export declare function runTrigger(env?: NodeJS.ProcessEnv): string;
/**
 * The error when there is no .taf to append to, with the command that makes one
 */
export declare const NO_TAF_FILE = "No .taf file found. Create one: echo 'test_history: []' > .taf";
