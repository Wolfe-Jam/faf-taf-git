#!/usr/bin/env node
/**
 * faf-taf-git - Standalone CLI for TAF operations
 *
 * Platform-agnostic core that works in ANY CI/CD environment
 * Can be used standalone or as a library by wrappers
 */

import * as exec from '@actions/exec';
import * as fs from 'fs';
import * as path from 'path';
import { parseJestOutput } from './parsers/jest';
import { updateTafFile } from './taf-core';

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
export async function runTafGit(options: CLIOptions = {}): Promise<CLIResult> {
  const {
    command = 'npm test',
    autoCommit = false,
    commitMessage = 'chore: update .taf with test results',
    cwd = process.cwd(),
    verbose = false,
    logger = console.log,
  } = options;

  try {
    if (verbose) console.log(`Running test command: ${command}`);

    // Run tests and capture output using @actions/exec
    let output = '';
    let exitCode = 0;

    try {
      const options: exec.ExecOptions = {
        cwd,
        listeners: {
          stdout: (data: Buffer) => {
            output += data.toString();
          },
          stderr: (data: Buffer) => {
            output += data.toString();
          }
        }
      };

      exitCode = await exec.exec(command, [], options);

      if (verbose) {
        logger(`Test command exit code: ${exitCode}`);
        logger(`Captured output length: ${output.length} bytes`);
      }
    } catch (error: any) {
      exitCode = 1;
      if (verbose) {
        logger(`Test command failed with error: ${error.message}`);
        logger(`Captured output length: ${output.length} bytes`);
      }
    }

    // Debug: Write entire output to file for inspection
    if (verbose) {
      try {
        const fs = require('fs');
        fs.writeFileSync('/tmp/taf-debug-output.txt', output);
        logger(`DEBUG: Wrote ${output.length} bytes to /tmp/taf-debug-output.txt`);
        const lines = output.split('\n');
        const testLine = lines.find(l => l.includes('Tests:'));
        logger(`DEBUG: Output has ${lines.length} lines, Found "Tests:": ${testLine ? 'YES' : 'NO'}`);
        if (testLine) {
          logger(`DEBUG: Tests line: "${testLine}"`);
        } else {
          logger(`DEBUG: Last 10 lines of output:`);
          lines.slice(-10).forEach((line, i) => {
            logger(`  ${i}: ${line.substring(0, 100)}`);
          });
        }
      } catch (err) {
        logger(`DEBUG: Error writing debug file: ${err}`);
      }
    }

    // Parse test output
    const testResults = parseJestOutput(output);

    if (!testResults) {
      if (verbose) {
        logger(`DEBUG: Parser returned null`);
        logger(`DEBUG: Output sample (first 500 chars): ${output.slice(0, 500)}`);
        logger(`DEBUG: Output sample (last 500 chars): ${output.slice(-500)}`);
      }
      return {
        success: false,
        tafUpdated: false,
        error: 'Could not parse test output. Ensure you are using Jest.',
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
        error: 'No .taf file found. Run `faf taf init` to create one.',
      };
    }

    // Update .taf file
    const updated = await updateTafFile(tafPath, testResults);

    if (updated) {
      if (verbose) logger('✅ .taf file updated successfully');

      // Commit changes if enabled
      if (autoCommit) {
        await commitTafUpdate(cwd, commitMessage, verbose, logger);
        if (verbose) logger('✅ Changes committed to git');
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
 * Commit .taf file changes to git (platform-agnostic)
 */
async function commitTafUpdate(cwd: string, message: string, verbose: boolean, logger: (msg: string) => void = console.log): Promise<void> {
  try {
    const execOptions: exec.ExecOptions = { cwd };

    // Configure git if needed
    await exec.exec('git', ['config', '--global', 'user.name', 'faf-taf-git[bot]'], execOptions);
    await exec.exec('git', ['config', '--global', 'user.email', 'faf-taf-git[bot]@users.noreply.github.com'], execOptions);

    // Stage .taf file
    await exec.exec('git', ['add', '.taf'], execOptions);

    // Check if there are changes to commit
    let diffOutput = '';
    const diffOptions: exec.ExecOptions = {
      cwd,
      listeners: {
        stdout: (data: Buffer) => {
          diffOutput += data.toString();
        }
      }
    };
    await exec.exec('git', ['diff', '--cached', '--name-only'], diffOptions);

    if (diffOutput.trim().length > 0) {
      await exec.exec('git', ['commit', '-m', message], execOptions);

      // Try to push (might fail in some environments, that's ok)
      try {
        await exec.exec('git', ['push'], execOptions);
      } catch (error) {
        if (verbose) {
          logger('Could not push changes (this is ok in some CI environments)');
        }
      }
    } else {
      if (verbose) logger('No changes to commit');
    }
  } catch (error) {
    if (verbose) {
      logger(`Error committing changes: ${error}`);
    }
    throw error;
  }
}

/**
 * CLI entry point - parse args and run
 */
async function main() {
  const args = process.argv.slice(2);

  const options: CLIOptions = {
    verbose: args.includes('--verbose') || args.includes('-v'),
  };

  // Parse command flag
  const commandIndex = args.indexOf('--command');
  if (commandIndex !== -1 && args[commandIndex + 1]) {
    options.command = args[commandIndex + 1];
  }

  // Parse auto-commit flag
  if (args.includes('--commit')) {
    options.autoCommit = true;
  }

  // Parse commit message
  const messageIndex = args.indexOf('--message');
  if (messageIndex !== -1 && args[messageIndex + 1]) {
    options.commitMessage = args[messageIndex + 1];
  }

  // Parse working directory
  const cwdIndex = args.indexOf('--cwd');
  if (cwdIndex !== -1 && args[cwdIndex + 1]) {
    options.cwd = args[cwdIndex + 1];
  }

  // Show help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
faf-taf-git - Platform-agnostic TAF updater

USAGE:
  npx faf-taf-git [OPTIONS]

OPTIONS:
  --command <cmd>     Test command to run (default: npm test)
  --commit            Auto-commit .taf changes to git
  --message <msg>     Custom commit message
  --cwd <dir>         Working directory (default: current)
  --verbose, -v       Verbose output
  --help, -h          Show this help

EXAMPLES:
  # Run tests and update .taf
  npx faf-taf-git

  # Custom test command
  npx faf-taf-git --command "npm run test:unit"

  # Auto-commit changes
  npx faf-taf-git --commit

  # Custom commit message
  npx faf-taf-git --commit --message "test: update TAF"

  # Verbose mode
  npx faf-taf-git --verbose

PLATFORM SUPPORT:
  ✅ GitHub Actions
  ✅ GitLab CI
  ✅ Bitbucket Pipelines
  ✅ Jenkins
  ✅ CircleCI
  ✅ Local development
  ✅ Any CI/CD that runs Node.js

LEARN MORE:
  https://github.com/Wolfe-Jam/faf-taf-git
`);
    process.exit(0);
  }

  // Run the tool
  const result = await runTafGit(options);

  if (result.success) {
    if (result.testResults) {
      console.log(`✅ Tests: ${result.testResults.passed}/${result.testResults.total} passing`);
      console.log(`✅ Result: ${result.testResults.result}`);
    }
    if (result.tafUpdated) {
      console.log('✅ .taf file updated');
    }
    process.exit(0);
  } else {
    console.error(`❌ Error: ${result.error}`);
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
