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
//# sourceMappingURL=cli.d.ts.map