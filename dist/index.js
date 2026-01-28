"use strict";
/**
 * faf-taf-git - GitHub Actions wrapper
 *
 * Thin wrapper around the platform-agnostic CLI core
 * Handles GitHub Actions-specific inputs/outputs
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
const cli_1 = require("./cli");
async function run() {
    try {
        // Get GitHub Action inputs
        const testCommand = core.getInput('test-command') || 'npm test';
        const autoCommit = core.getInput('auto-commit') !== 'false';
        const commitMessage = core.getInput('commit-message') || 'chore: update .taf with test results';
        core.info(`Running test command: ${testCommand}`);
        // Call the platform-agnostic core
        const result = await (0, cli_1.runTafGit)({
            command: testCommand,
            autoCommit,
            commitMessage,
            verbose: true,
        });
        // Set GitHub Action outputs
        if (result.testResults) {
            core.setOutput('result', result.testResults.result);
            core.setOutput('passed', result.testResults.passed.toString());
            core.setOutput('failed', result.testResults.failed.toString());
            core.setOutput('total', result.testResults.total.toString());
            core.info(`Parsed results: ${result.testResults.passed}/${result.testResults.total} tests passing`);
        }
        core.setOutput('taf-updated', result.tafUpdated ? 'true' : 'false');
        if (result.success) {
            core.info('✅ .taf file updated successfully');
            if (autoCommit) {
                core.info('✅ Changes committed to git');
            }
        }
        else {
            core.setFailed(result.error || 'Unknown error occurred');
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
// Run the GitHub Action
run();
//# sourceMappingURL=index.js.map