"use strict";
/**
 * faf-taf-action - GitHub Action for automatic .taf updates
 *
 * Runs tests, parses output, updates .taf file, commits changes
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
const core = __importStar(require("@actions/core"));
const exec = __importStar(require("@actions/exec"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const jest_1 = require("./parsers/jest");
const taf_core_1 = require("./taf-core");
async function run() {
    try {
        // Get inputs
        const testCommand = core.getInput('test-command') || 'npm test';
        const autoCommit = core.getInput('auto-commit') !== 'false';
        const commitMessage = core.getInput('commit-message') || 'chore: update .taf with test results';
        core.info(`Running test command: ${testCommand}`);
        // Run tests and capture output
        let output = '';
        let exitCode = 0;
        const options = {
            listeners: {
                stdout: (data) => {
                    output += data.toString();
                },
                stderr: (data) => {
                    output += data.toString();
                },
            },
            ignoreReturnCode: true, // Don't fail action if tests fail
        };
        exitCode = await exec.exec(testCommand, [], options);
        core.info(`Test command exit code: ${exitCode}`);
        core.debug(`Test output length: ${output.length} characters`);
        // Parse test output
        const testResults = (0, jest_1.parseJestOutput)(output);
        if (!testResults) {
            core.setFailed('Could not parse test output. Ensure you are using Jest.');
            return;
        }
        core.info(`Parsed results: ${testResults.passed}/${testResults.total} tests passing`);
        // Set outputs
        core.setOutput('result', testResults.result);
        core.setOutput('passed', testResults.passed.toString());
        core.setOutput('failed', testResults.failed.toString());
        core.setOutput('total', testResults.total.toString());
        // Check if .taf file exists
        const tafPath = path.join(process.cwd(), '.taf');
        if (!fs.existsSync(tafPath)) {
            core.warning('No .taf file found. Run `faf taf init` to create one.');
            core.setOutput('taf-updated', 'false');
            return;
        }
        // Update .taf file
        const updated = await (0, taf_core_1.updateTafFile)(tafPath, testResults);
        if (updated) {
            core.info('✅ .taf file updated successfully');
            core.setOutput('taf-updated', 'true');
            // Commit changes if enabled
            if (autoCommit) {
                await commitTafUpdate(commitMessage);
                core.info('✅ Changes committed to git');
            }
        }
        else {
            core.warning('⚠️ .taf file was not updated');
            core.setOutput('taf-updated', 'false');
        }
    }
    catch (error) {
        if (error instanceof Error) {
            core.setFailed(error.message);
        }
        else {
            core.setFailed('Unknown error occurred');
        }
    }
}
/**
 * Commit .taf file changes to git
 */
async function commitTafUpdate(message) {
    // Configure git if needed
    await exec.exec('git', ['config', '--global', 'user.name', 'github-actions[bot]']);
    await exec.exec('git', ['config', '--global', 'user.email', 'github-actions[bot]@users.noreply.github.com']);
    // Stage .taf file
    await exec.exec('git', ['add', '.taf']);
    // Check if there are changes to commit
    let hasChanges = false;
    const options = {
        listeners: {
            stdout: (data) => {
                if (data.toString().trim().length > 0) {
                    hasChanges = true;
                }
            },
        },
        ignoreReturnCode: true,
    };
    await exec.exec('git', ['diff', '--cached', '--name-only'], options);
    if (hasChanges) {
        await exec.exec('git', ['commit', '-m', message]);
        await exec.exec('git', ['push']);
    }
    else {
        core.info('No changes to commit');
    }
}
// Run the action
run();
//# sourceMappingURL=main.js.map