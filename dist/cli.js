#!/usr/bin/env node
"use strict";
/**
 * faf-taf-git - Standalone CLI for TAF operations
 *
 * Platform-agnostic core that works in ANY CI/CD environment
 * Can be used standalone or as a library by wrappers
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runTafGit = runTafGit;
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const jest_1 = require("./parsers/jest");
const taf_core_1 = require("./taf-core");
const exec = (0, util_1.promisify)(child_process_1.exec);
/**
 * Main CLI function - platform-agnostic
 * Can be called from GitHub Actions, GitLab CI, or standalone
 */
async function runTafGit(options = {}) {
    const { command = 'npm test', autoCommit = false, commitMessage = 'chore: update .taf with test results', cwd = process.cwd(), verbose = false, logger = console.log, } = options;
    try {
        if (verbose)
            console.log(`Running test command: ${command}`);
        // Run tests and capture output
        let output = '';
        let exitCode = 0;
        try {
            const result = await exec(command, { cwd });
            output = result.stdout + result.stderr;
        }
        catch (error) {
            // Tests might fail but we still want to capture output
            output = error.stdout + error.stderr;
            exitCode = error.code || 1;
        }
        if (verbose)
            logger(`Test command exit code: ${exitCode}`);
        // Debug: Show sample of output for troubleshooting
        if (verbose) {
            const lines = output.split('\n');
            const testLine = lines.find(l => l.includes('Tests:'));
            logger(`DEBUG: Output lines: ${lines.length}, Found "Tests:" line: ${testLine ? 'YES' : 'NO'}`);
            if (testLine) {
                logger(`DEBUG: Tests line: "${testLine}"`);
                logger(`DEBUG: Tests line (hex): ${Buffer.from(testLine).toString('hex').slice(0, 100)}`);
            }
        }
        // Parse test output
        const testResults = (0, jest_1.parseJestOutput)(output);
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
        const updated = await (0, taf_core_1.updateTafFile)(tafPath, testResults);
        if (updated) {
            if (verbose)
                logger('✅ .taf file updated successfully');
            // Commit changes if enabled
            if (autoCommit) {
                await commitTafUpdate(cwd, commitMessage, verbose, logger);
                if (verbose)
                    logger('✅ Changes committed to git');
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
        }
        else {
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
    }
    catch (error) {
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
async function commitTafUpdate(cwd, message, verbose, logger = console.log) {
    try {
        // Configure git if needed
        await exec('git config --global user.name "faf-taf-git[bot]"', { cwd });
        await exec('git config --global user.email "faf-taf-git[bot]@users.noreply.github.com"', { cwd });
        // Stage .taf file
        await exec('git add .taf', { cwd });
        // Check if there are changes to commit
        const { stdout } = await exec('git diff --cached --name-only', { cwd });
        if (stdout.trim().length > 0) {
            await exec(`git commit -m "${message}"`, { cwd });
            // Try to push (might fail in some environments, that's ok)
            try {
                await exec('git push', { cwd });
            }
            catch (error) {
                if (verbose) {
                    logger('Could not push changes (this is ok in some CI environments)');
                }
            }
        }
        else {
            if (verbose)
                logger('No changes to commit');
        }
    }
    catch (error) {
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
    const options = {
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
    }
    else {
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
//# sourceMappingURL=cli.js.map