#!/usr/bin/env node
/**
 * faf-taf-git - The Git-Native Receipt Printer
 *
 * v2.x CLI: reads test output from file (pre-capture pattern)
 * Platform-agnostic - works in ANY CI/CD environment or locally
 */

import { execFileSync } from 'child_process';
import { pushFailureReason, pushWasBehind } from './git-env';
import * as fs from 'fs';
import * as path from 'path';
import { noResultsReason, parseTestOutput } from './parsers';
import { lastUpdate, NO_TAF_FILE, updateTafFile } from './taf-core';
import { parseSkippedNamesCap } from './skipped-names';
import { generateBadge } from './badge';

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
export async function runTafGit(options: CLIOptions = {}): Promise<CLIResult> {
  const {
    file,
    autoCommit = false,
    commitMessage = 'chore: update .taf with test results',
    cwd = process.cwd(),
    verbose = false,
    logger = console.log,
  } = options;

  try {
    if (!file) {
      return {
        success: false,
        tafUpdated: false,
        error: 'No test output file specified. Use --file <path>.\nExample: npm test 2>&1 | tee test-output.txt && npx faf-taf-git --file test-output.txt',
      };
    }

    // Resolve file path
    const filePath = path.isAbsolute(file) ? file : path.join(cwd, file);

    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        tafUpdated: false,
        error: `Test output file not found: ${filePath}`,
      };
    }

    const output = fs.readFileSync(filePath, 'utf-8');
    if (verbose) logger(`Read ${output.length} bytes from ${filePath}`);

    // Parse test output
    const testResults = parseTestOutput(output);

    if (!testResults) {
      if (verbose) {
        logger(`Parser returned null`);
        logger(`Output sample (first 500 chars): ${output.slice(0, 500)}`);
      }
      return {
        success: false,
        tafUpdated: false,
        error: noResultsReason(output),
      };
    }

    if (verbose) {
      logger(`Parsed results: ${testResults.passed}/${testResults.total} tests passing`);
    }

    // Check if .taf file exists
    const tafPath = path.join(cwd, '.taf');
    if (!fs.existsSync(tafPath)) {
      return {
        success: false,
        testResults: {
          total: testResults.total,
          passed: testResults.passed,
          failed: testResults.failed,
          result: testResults.result,
        },
        tafUpdated: false,
        error: NO_TAF_FILE,
      };
    }

    // Update .taf file
    const updated = await updateTafFile(tafPath, testResults, { skippedNamesCap: options.skippedNamesCap });

    if (updated) {
      if (verbose) logger('.taf file updated successfully');
      if (lastUpdate.skippedTests?.newly_skipped?.length) logger(`Newly skipped: ${lastUpdate.skippedTests.newly_skipped.join(' | ')}`);
      if (lastUpdate.skippedNamesNote) logger(`Skipped names not written: ${lastUpdate.skippedNamesNote}`);

      // Commit changes if enabled
      if (autoCommit) {
        commitTafUpdate(cwd, commitMessage, verbose, logger);
        if (verbose) logger('Changes committed to git');
      }

      return {
        success: true,
        testResults: {
          total: testResults.total,
          passed: testResults.passed,
          failed: testResults.failed,
          result: testResults.result,
        },
        tafUpdated: true,
      };
    } else {
      return {
        success: false,
        testResults: {
          total: testResults.total,
          passed: testResults.passed,
          failed: testResults.failed,
          result: testResults.result,
        },
        tafUpdated: false,
        error: '.taf file was not updated',
      };
    }
  } catch (error) {
    return {
      success: false,
      tafUpdated: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Commit .taf file changes to git
 */
function commitTafUpdate(cwd: string, message: string, verbose: boolean, logger: (msg: string) => void = console.log): void {
  try {
    // env passed explicitly (the same as the default): it is the process.env
    // the caller sees, so a test that clears GIT_DIR clears it for git too.
    const opts = { cwd, stdio: 'pipe' as const, env: process.env };

    // Arguments, never a shell string: the message is the user's text.
    // Every step names .taf, so nothing else that is staged is committed.
    execFileSync('git', ['add', '--', '.taf'], opts);

    const diff = execFileSync('git', ['diff', '--cached', '--name-only', '--', '.taf'], opts).toString().trim();
    if (diff.length === 0) {
      if (verbose) logger('No changes to commit');
      return;
    }

    execFileSync('git', ['commit', '-m', message, '--', '.taf'], opts);

    // Push only where there is somewhere to push. A branch with no upstream
    // keeps the receipt in a local commit and says so; a push that fails
    // (the remote moved on) is an error, never a quiet exit 0.
    try {
      execFileSync('git', ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], opts);
    } catch {
      logger('Receipt committed. This branch has no upstream, so it was not pushed.');
      return;
    }
    try {
      execFileSync('git', ['push'], opts);
    } catch (error) {
      const stderr = String((error as { stderr?: Buffer }).stderr ?? '');
      const next = pushWasBehind(stderr) ? 'Send it with: git pull --rebase && git push' : 'Check your push access and branch protection, then: git push';
      throw new Error(`The receipt is committed but not pushed: ${pushFailureReason(stderr)}. ${next}`);
    }
  } catch (error) {
    if (verbose) logger(`Error committing changes: ${error}`);
    throw error;
  }
}

/**
 * The value of an option, written `--name value` or `--name=value`; undefined
 * when it isn't there or has no value.
 */
export function optionValue(args: string[], name: string): string | undefined {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === name) {return args[i + 1];}
    if (args[i].startsWith(`${name}=`)) {return args[i].slice(name.length + 1);}
  }
  return undefined;
}

/**
 * Handle the 'badge' subcommand
 */
function handleBadgeCommand(args: string[]): void {
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`\nfaf-taf-git badge - Generate SVG badge from .taf history\n\nUSAGE:\n  npx faf-taf-git badge [OPTIONS]\n\nOPTIONS:\n  --output <path>     Write SVG to file (default: stdout)\n  --label <text>      Badge label (default: TAF)\n  --taf <path>        Path to .taf file (default: .taf)\n  --help, -h          Show this help\n`);
    process.exit(0);
  }

  const outputPath = optionValue(args, '--output') || undefined;
  const label = optionValue(args, '--label') || undefined;
  const tafPath = optionValue(args, '--taf') || undefined;

  const result = generateBadge({ tafPath, label });

  if (!result.success || !result.svg) {
    console.error(`Error: ${result.error || 'Failed to generate badge'}`);
    process.exit(1);
  }

  if (outputPath) {
    fs.writeFileSync(outputPath, result.svg, 'utf-8');
    console.log(`Badge written to ${outputPath}`);
  } else {
    process.stdout.write(result.svg);
  }
}

/**
 * The installed package's version. package.json sits one level above both
 * src/ (tests) and dist/ (the published bin).
 */
export function cliVersion(): string {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8')).version;
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);

  // --version / -V (-v is --verbose)
  if (args.includes('--version') || args.includes('-V')) {
    console.log(cliVersion());
    return;
  }

  // Subcommand: badge
  if (args[0] === 'badge') {
    handleBadgeCommand(args.slice(1));
    return;
  }

  // Show help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`\nfaf-taf-git - The Git-Native Receipt Printer\n\nUSAGE:\n  npm test 2>&1 | tee test-output.txt\n  npx faf-taf-git --file test-output.txt [OPTIONS]\n\n  # WJTTC / pc-ai bar\n  node tests/wjttc/run-wjttc.mjs 2>&1 | tee wjttc-out.txt\n  npx faf-taf-git --file wjttc-out.txt\n\nCOMMANDS:\n  badge               Generate a shields.io-style SVG badge from .taf\n\nOPTIONS:\n  --file <path>       Path to test output file (required)\n  --commit            Auto-commit .taf changes to git\n  --message <msg>     Custom commit message\n  --cwd <dir>         Working directory (default: current)\n  --skipped-names <n> Skipped test names per receipt (default 25, 0 = off)\n  --verbose, -v       Verbose output\n  --version, -V       Print the version\n  --help, -h          Show this help\n\nPARSERS:\n  JUnit XML (pytest, cargo, Go, Java, .NET ...), Bun, WJTTC (pc-ai bar), Jest, Vitest\n\nEXAMPLES:\n  npm test 2>&1 | tee test-output.txt\n  npx faf-taf-git --file test-output.txt\n\n  npx faf-taf-git --file test-output.txt --commit\n\n  npx faf-taf-git badge --output badge.svg\n\nPLATFORM SUPPORT:\n  Works in ANY CI/CD that runs Node.js:\n  GitHub Actions, GitLab CI, Jenkins, CircleCI,\n  Bitbucket Pipelines, Azure Pipelines, local dev\n\nLEARN MORE:\n  https://github.com/Wolfe-Jam/faf-taf-git\n`);
    process.exit(0);
  }

  const options: CLIOptions = {
    verbose: args.includes('--verbose') || args.includes('-v'),
  };

  // Options take `--name value` or `--name=value`.
  const file = optionValue(args, '--file');
  if (file) {options.file = file;}

  // Parse auto-commit flag
  if (args.includes('--commit')) {
    options.autoCommit = true;
  }

  const message = optionValue(args, '--message');
  if (message) {options.commitMessage = message;}

  const cwd = optionValue(args, '--cwd');
  if (cwd) {options.cwd = cwd;}

  if (args.some((a) => a === '--skipped-names' || a.startsWith('--skipped-names='))) {
    try {
      options.skippedNamesCap = parseSkippedNamesCap(optionValue(args, '--skipped-names'));
    } catch (error) {
      console.error((error as Error).message);
      process.exit(1);
    }
  }

  // Run the tool
  const result = await runTafGit(options);

  if (result.success) {
    if (result.testResults) {
      console.log(`Tests: ${result.testResults.passed}/${result.testResults.total} passing`);
      console.log(`Result: ${result.testResults.result}`);
    }
    if (result.tafUpdated) {
      console.log('.taf file updated');
    }
    process.exit(0);
  } else {
    console.error(`Error: ${result.error}`);
    if (result.testResults) {
      console.log(`Tests: ${result.testResults.passed}/${result.testResults.total} passing`);
    }
    process.exit(1);
  }
}

// Run CLI if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
