#!/usr/bin/env node
/**
 * faf-taf-git - Standalone CLI for TAF operations
 *
 * Platform-agnostic core that works in ANY CI/CD environment
 * Can be used standalone or as a library by wrappers
 */
export interface CLIOptions {
    command?: string;
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
 * Main CLI function - platform-agnostic
 * Can be called from GitHub Actions, GitLab CI, or standalone
 */
export declare function runTafGit(options?: CLIOptions): Promise<CLIResult>;
