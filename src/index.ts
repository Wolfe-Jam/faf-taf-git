/**
 * faf-taf-action - GitHub Action for automatic .taf updates
 *
 * Runs tests, parses output, updates .taf file, commits changes
 */

import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as fs from 'fs';
import * as path from 'path';
import { parseJestOutput } from './parsers/jest';
import { updateTafFile } from './taf-core';

async function run(): Promise<void> {
  try {
    // Get inputs
    const testCommand = core.getInput('test-command') || 'npm test';
    const autoCommit = core.getInput('auto-commit') !== 'false';
    const commitMessage = core.getInput('commit-message') || 'chore: update .taf with test results';

    core.info(`Running test command: ${testCommand}`);

    // Run tests and capture output
    let output = '';
    let exitCode = 0;

    const options: exec.ExecOptions = {
      listeners: {
        stdout: (data: Buffer) => {
          output += data.toString();
        },
        stderr: (data: Buffer) => {
          output += data.toString();
        },
      },
      ignoreReturnCode: true, // Don't fail action if tests fail
    };

    exitCode = await exec.exec(testCommand, [], options);

    core.info(`Test command exit code: ${exitCode}`);
    core.debug(`Test output length: ${output.length} characters`);

    // Parse test output
    const testResults = parseJestOutput(output);

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
    const updated = await updateTafFile(tafPath, testResults);

    if (updated) {
      core.info('✅ .taf file updated successfully');
      core.setOutput('taf-updated', 'true');

      // Commit changes if enabled
      if (autoCommit) {
        await commitTafUpdate(commitMessage);
        core.info('✅ Changes committed to git');
      }
    } else {
      core.warning('⚠️ .taf file was not updated');
      core.setOutput('taf-updated', 'false');
    }

  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed('Unknown error occurred');
    }
  }
}

/**
 * Commit .taf file changes to git
 */
async function commitTafUpdate(message: string): Promise<void> {
  // Configure git if needed
  await exec.exec('git', ['config', '--global', 'user.name', 'github-actions[bot]']);
  await exec.exec('git', ['config', '--global', 'user.email', 'github-actions[bot]@users.noreply.github.com']);

  // Stage .taf file
  await exec.exec('git', ['add', '.taf']);

  // Check if there are changes to commit
  let hasChanges = false;
  const options: exec.ExecOptions = {
    listeners: {
      stdout: (data: Buffer) => {
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
  } else {
    core.info('No changes to commit');
  }
}

// Run the action
run();
