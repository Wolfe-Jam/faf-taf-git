/**
 * faf-taf-git - GitHub Actions wrapper
 *
 * Thin wrapper around the platform-agnostic CLI core
 * Handles GitHub Actions-specific inputs/outputs
 */

import * as core from '@actions/core';
import { runTafGit } from './cli';

async function run(): Promise<void> {
  try {
    // Get GitHub Action inputs
    const testCommand = core.getInput('test-command') || 'npm test';
    const autoCommit = core.getInput('auto-commit') !== 'false';
    const commitMessage = core.getInput('commit-message') || 'chore: update .taf with test results';

    core.info(`Running test command: ${testCommand}`);

    // Call the platform-agnostic core
    const result = await runTafGit({
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
    } else {
      core.setFailed(result.error || 'Unknown error occurred');
    }

  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed('Unknown error occurred');
    }
  }
}

// Run the GitHub Action
run();
