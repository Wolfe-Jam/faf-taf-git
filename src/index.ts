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
import { parseTestOutput } from './parsers';
import { updateTafFile } from './taf-core';

/**
 * Switch to a dedicated target branch for TAF receipts.
 * Creates the branch as an orphan on first run, seeded with existing .taf.
 */
async function switchToTargetBranch(cwd: string, targetBranch: string, tafSeed: string | null): Promise<void> {
  const execOptions = { cwd };

  // Configure git (needed before any git operations)
  await exec.exec('git', ['config', '--global', 'user.name', 'faf-taf-git[bot]'], execOptions);
  await exec.exec('git', ['config', '--global', 'user.email', 'faf-taf-git[bot]@users.noreply.github.com'], execOptions);

  // Check if target branch exists on remote
  const { exitCode } = await exec.getExecOutput(
    'git', ['ls-remote', '--exit-code', 'origin', targetBranch],
    { ...execOptions, ignoreReturnCode: true }
  );

  if (exitCode === 0) {
    // Branch exists — fetch and checkout
    await exec.exec('git', ['fetch', 'origin', targetBranch], execOptions);
    await exec.exec('git', ['checkout', targetBranch], execOptions);
    core.info(`Switched to existing branch: ${targetBranch}`);
  } else {
    // Branch doesn't exist — create orphan
    await exec.exec('git', ['checkout', '--orphan', targetBranch], execOptions);
    await exec.getExecOutput('git', ['rm', '-rf', '.'], { ...execOptions, ignoreReturnCode: true });

    // Seed with existing .taf from source branch
    const tafPath = path.join(cwd, '.taf');
    if (tafSeed) {
      fs.writeFileSync(tafPath, tafSeed, 'utf-8');
      core.info(`Seeded ${targetBranch} with existing .taf data`);
    }

    await exec.exec('git', ['add', '.taf'], execOptions);
    await exec.exec('git', ['commit', '-m', `chore(taf): initialize ${targetBranch} branch [skip ci]`], execOptions);
    core.info(`Created new branch: ${targetBranch}`);
  }
}

/**
 * Commit .taf file changes to git and push
 */
async function commitTafUpdate(cwd: string, message: string, targetBranch?: string): Promise<void> {
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

    // Push to target branch or current branch
    const pushArgs = targetBranch ? ['push', 'origin', targetBranch] : ['push'];
    try {
      await exec.exec('git', pushArgs, execOptions);
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
    const targetBranch = core.getInput('target-branch') || '';
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

    // Debug: Show sample of what we're parsing
    const lines = testOutput.split('\n');
    const testSummaryLine = lines.find(line => line.includes('Tests:'));
    if (testSummaryLine) {
      core.info(`Found summary line: ${testSummaryLine.substring(0, 200)}`);
    } else {
      core.warning('No "Tests:" summary line found in output');
      // Show last 20 lines to help debug
      core.info('Last 20 lines of output:');
      lines.slice(-20).forEach((line, i) => {
        core.info(`  ${i}: ${line.substring(0, 150)}`);
      });
    }

    // Parse test results
    const testResults = parseTestOutput(testOutput);

    if (!testResults) {
      core.setFailed('Could not parse test output. Supported: Jest, Vitest.');
      return;
    }

    core.info(`Parsed results: ${testResults.passed}/${testResults.total} tests passing`);

    // Set GitHub Action outputs
    core.setOutput('result', testResults.result);
    core.setOutput('passed', testResults.passed.toString());
    core.setOutput('failed', testResults.failed.toString());
    core.setOutput('total', testResults.total.toString());

    // If target-branch is set, save .taf seed and switch branches
    let tafSeed: string | null = null;
    const tafPath = path.join(cwd, '.taf');

    if (targetBranch) {
      // Save existing .taf from source branch as seed for first-run
      if (fs.existsSync(tafPath)) {
        tafSeed = fs.readFileSync(tafPath, 'utf-8');
      }
      core.info(`Switching to target branch: ${targetBranch}`);
      await switchToTargetBranch(cwd, targetBranch, tafSeed);
    }

    // Check if .taf file exists (on current or target branch)
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
      await commitTafUpdate(cwd, commitMessage, targetBranch || undefined);
      core.info(`✅ Changes committed${targetBranch ? ` to ${targetBranch}` : ''}`);
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
