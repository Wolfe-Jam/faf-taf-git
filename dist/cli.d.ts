#!/usr/bin/env node
/**
 * faf-taf-git - The Git-Native Receipt Printer
 *
 * v2.x CLI: reads test output from file (pre-capture pattern)
 * Platform-agnostic - works in ANY CI/CD environment or locally
 */
export interface CLIOptions {
    file?: string;
    autoCommit?: boolean;
    commitMessage?: string;
    cwd?: string;
    /** Skipped names per receipt; 0 turns them off (default 25). */
    skippedNamesCap?: number;
    verbose?: boolean;
    logger?: (message: string) => void;
}
export interface CLIResult {
    success: boolean;
    testResults?: {
        total: number;
        passed: number;
        failed: number;
        result: string;
    };
    tafUpdated: boolean;
    error?: string;
}
/**
 * Main CLI function - reads test output from file
 */
export declare function runTafGit(options?: CLIOptions): Promise<CLIResult>;
/**
 * The value of an option, written `--name value` or `--name=value`; undefined
 * when it isn't there or has no value.
 */
export declare function optionValue(args: string[], name: string): string | undefined;
/**
 * The installed package's version. package.json sits one level above both
 * src/ (tests) and dist/ (the published bin).
 */
export declare function cliVersion(): string;
