#!/usr/bin/env node
"use strict";
/**
 * faf-taf-git - The Git-Native Receipt Printer
 *
 * v2.x CLI: reads test output from file (pre-capture pattern)
 * Platform-agnostic - works in ANY CI/CD environment or locally
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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const parsers_1 = require("./parsers");
const taf_core_1 = require("./taf-core");
const badge_1 = require("./badge");
/**
 * Main CLI function - reads test output from file
 */
async function runTafGit(options = {}) {
    const { file, autoCommit = false, commitMessage = 'chore: update .taf with test results', cwd = process.cwd(), verbose = false, logger = console.log, } = options;
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
        if (verbose)
            logger(`Read ${output.length} bytes from ${filePath}`);
        // Parse test output
        const testResults = (0, parsers_1.parseTestOutput)(output);
        if (!testResults) {
            if (verbose) {
                logger(`Parser returned null`);
                logger(`Output sample (first 500 chars): ${output.slice(0, 500)}`);
            }
            return {
                success: false,
                tafUpdated: false,
                error: 'Could not parse test output. Supported: Jest, Vitest.',
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
                logger('.taf file updated successfully');
            // Commit changes if enabled
            if (autoCommit) {
                commitTafUpdate(cwd, commitMessage, verbose, logger);
                if (verbose)
                    logger('Changes committed to git');
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
 * Commit .taf file changes to git
 */
function commitTafUpdate(cwd, message, verbose, logger = console.log) {
    try {
        const opts = { cwd, stdio: 'pipe' };
        (0, child_process_1.execSync)('git add .taf', opts);
        const diff = (0, child_process_1.execSync)('git diff --cached --name-only', opts).toString().trim();
        if (diff.length === 0) {
            if (verbose)
                logger('No changes to commit');
            return;
        }
        (0, child_process_1.execSync)(`git commit -m "${message}"`, opts);
        try {
            (0, child_process_1.execSync)('git push', opts);
        }
        catch {
            if (verbose)
                logger('Could not push changes (this is ok in some CI environments)');
        }
    }
    catch (error) {
        if (verbose)
            logger(`Error committing changes: ${error}`);
        throw error;
    }
}
/**
 * Handle the 'badge' subcommand
 */
function handleBadgeCommand(args) {
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
faf-taf-git badge - Generate SVG badge from .taf history

USAGE:
  npx faf-taf-git badge [OPTIONS]

OPTIONS:
  --output <path>     Write SVG to file (default: stdout)
  --label <text>      Badge label (default: TAF)
  --taf <path>        Path to .taf file (default: .taf)
  --help, -h          Show this help
`);
        process.exit(0);
    }
    // Parse --output
    let outputPath;
    const outputIndex = args.indexOf('--output');
    if (outputIndex !== -1 && args[outputIndex + 1]) {
        outputPath = args[outputIndex + 1];
    }
    // Parse --label
    let label;
    const labelIndex = args.indexOf('--label');
    if (labelIndex !== -1 && args[labelIndex + 1]) {
        label = args[labelIndex + 1];
    }
    // Parse --taf
    let tafPath;
    const tafIndex = args.indexOf('--taf');
    if (tafIndex !== -1 && args[tafIndex + 1]) {
        tafPath = args[tafIndex + 1];
    }
    const result = (0, badge_1.generateBadge)({ tafPath, label });
    if (!result.success || !result.svg) {
        console.error(`Error: ${result.error || 'Failed to generate badge'}`);
        process.exit(1);
    }
    if (outputPath) {
        fs.writeFileSync(outputPath, result.svg, 'utf-8');
        console.log(`Badge written to ${outputPath}`);
    }
    else {
        process.stdout.write(result.svg);
    }
}
/**
 * CLI entry point
 */
async function main() {
    const args = process.argv.slice(2);
    // Subcommand: badge
    if (args[0] === 'badge') {
        handleBadgeCommand(args.slice(1));
        return;
    }
    // Show help
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
faf-taf-git - The Git-Native Receipt Printer

USAGE:
  npm test 2>&1 | tee test-output.txt
  npx faf-taf-git --file test-output.txt [OPTIONS]

COMMANDS:
  badge               Generate a shields.io-style SVG badge from .taf

OPTIONS:
  --file <path>       Path to test output file (required)
  --commit            Auto-commit .taf changes to git
  --message <msg>     Custom commit message
  --cwd <dir>         Working directory (default: current)
  --verbose, -v       Verbose output
  --help, -h          Show this help

EXAMPLES:
  # Run tests, capture output, generate receipt
  npm test 2>&1 | tee test-output.txt
  npx faf-taf-git --file test-output.txt

  # Auto-commit changes
  npx faf-taf-git --file test-output.txt --commit

  # Custom commit message
  npx faf-taf-git --file test-output.txt --commit --message "test: update TAF"

  # Generate badge
  npx faf-taf-git badge --output badge.svg

PLATFORM SUPPORT:
  Works in ANY CI/CD that runs Node.js:
  GitHub Actions, GitLab CI, Jenkins, CircleCI,
  Bitbucket Pipelines, Azure Pipelines, local dev

LEARN MORE:
  https://github.com/Wolfe-Jam/faf-taf-git
`);
        process.exit(0);
    }
    const options = {
        verbose: args.includes('--verbose') || args.includes('-v'),
    };
    // Parse --file
    const fileIndex = args.indexOf('--file');
    if (fileIndex !== -1 && args[fileIndex + 1]) {
        options.file = args[fileIndex + 1];
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
    }
    else {
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
//# sourceMappingURL=cli.js.map