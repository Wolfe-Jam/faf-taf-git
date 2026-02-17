/**
 * faf-taf-git v2.0.0 - GitHub Actions wrapper
 *
 * Pre-Capture Pattern: Reads test output from file (written by previous step)
 * Handles GitHub Actions-specific inputs/outputs
 */

import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as fs from 'fs';
import * as path from 'path';
import { parseJestOutput } from './parsers/jest';
import { updateTafFile } from './taf-core';

/**
 * Commit .taf file changes to git
 */
async function commitTafUpdate(cwd: string, message: string): Promise<void> {
  const execOptions = { cwd };

  // Configure git
  await exec.exec('git', ['config', '--global', 'user.name', 'faf-taf-git[bot]'], execOptions);
  await exec.exec('git', ['config', '--global', 'user.email', 'faf-taf-git[bot]@users.noreply.github.com'], execOptions);

  // Stage .taf file
  await exec.exec('git', ['add', '.taf'], execOptions);

  // Check if there are changes to commit
  const { exitCode } = await exec.getExecOutput('git', ['diff', '--cached', '--name-only'], execOptions);

  if (exitCode === 0) {
    await exec.exec('git', ['commit', '-m', message], execOptions);

    // Try to push (might fail in some environments, that's ok)
    try {
      await exec.exec('git', ['push'], execOptions);
    } catch (error) {
      core.warning('Could not push changes (this is ok in some CI environments)');
    }
  }
}

async function run(): Promise<void> {
  try {
    // Get GitHub Action inputs
    const testOutputFile = core.getInput('test-output-file', { required: true });
    const autoCommit = core.getInput('auto-commit') !== 'false';
    const commitMessage = core.getInput('commit-message') || 'chore(taf): update .taf receipt [skip ci]';
    const cwd = process.cwd();

    core.info(`Reading test output from: ${testOutputFile}`);

    // Read test output file (written by previous CI step)
    const testOutputPath = path.isAbsolute(testOutputFile)
      ? testOutputFile
      : path.join(cwd, testOutputFile);

    if (!fs.existsSync(testOutputPath)) {
      core.setFailed(`Test output file not found: ${testOutputPath}`);
      return;
    }

    const testOutput = fs.readFileSync(testOutputPath, 'utf-8');
    core.info(`Read ${testOutput.length} bytes from test output file`);

    // Parse test results
    const testResults = parseJestOutput(testOutput);

    if (!testResults) {
      core.setFailed('Could not parse test output. Ensure you are using Jest.');
      return;
    }

    core.info(`Parsed results: ${testResults.passed}/${testResults.total} tests passing`);

    // Set GitHub Action outputs
    core.setOutput('result', testResults.result);
    core.setOutput('passed', testResults.passed.toString());
    core.setOutput('failed', testResults.failed.toString());
    core.setOutput('total', testResults.total.toString());

    // Check if .taf file exists
    const tafPath = path.join(cwd, '.taf');
    if (!fs.existsSync(tafPath)) {
      core.setFailed('No .taf file found. Run `faf taf init` to create one.');
      return;
    }

    // Update .taf file
    const updated = await updateTafFile(tafPath, testResults);

    if (!updated) {
      core.setOutput('taf-updated', 'false');
      core.setFailed('.taf file was not updated');
      return;
    }

    core.setOutput('taf-updated', 'true');
    core.info('✅ .taf file updated successfully');

    // Commit changes if enabled
    if (autoCommit) {
      await commitTafUpdate(cwd, commitMessage);
      core.info('✅ Changes committed to git');
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
