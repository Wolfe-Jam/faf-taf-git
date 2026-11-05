/**
 * faf-taf-git v2.0.0 - GitHub Actions wrapper
 *
 * Pre-Capture Pattern: Reads test output from file (written by previous step)
 * Handles GitHub Actions-specific inputs/outputs
 */

import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { noResultsReason, parseTestOutput } from './parsers';
import { lastUpdate, NO_TAF_FILE, updateTafFile } from './taf-core';
import { parseSkippedNamesCap } from './skipped-names';
import { botGitEnv, pushFailureReason } from './git-env';
import { pushReceipt } from './receipt-push';

/** The .taf a new receipts branch starts with when the source branch has none. */
function minimalTaf(projectName: string): string {
  return `format_version: 1.0.0\nproject: ${projectName}\ncreated: ${new Date().toISOString()}\ntest_history: []\n`;
}

/** git in `cwd` with the bot identity; resolves to trimmed stdout, throws with git's stderr on a non-zero exit. */
async function gitOut(cwd: string, args: string[], extraEnv: { [key: string]: string } = {}): Promise<string> {
  const r = await exec.getExecOutput('git', args, { cwd, env: { ...botGitEnv(), ...extraEnv }, silent: true, ignoreReturnCode: true });
  if (r.exitCode !== 0) {
    throw new Error(`git ${args[0]} failed (exit ${r.exitCode}): ${r.stderr.trim().split('\n').filter(Boolean).pop() ?? ''}`);
  }
  return r.stdout.trim();
}

/**
 * A worktree of the receipts branch in a temporary folder, so the job's own
 * checkout is never switched, stashed or emptied (it may be a developer's
 * checkout). The branch exists → the worktree starts at its tip. It doesn't →
 * an orphan commit holding only `<subfolder>/.taf` (seeded from the source
 * branch's .taf, or a minimal one) is made with git plumbing and a temporary
 * index, then checked out there. Returns the worktree's root.
 */
async function openReceiptsWorktree(repoRoot: string, rel: string, targetBranch: string, tafSeed: string | null): Promise<string> {
  const base = fs.mkdtempSync(path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'faf-taf-receipts-'));
  try {
    return await addReceiptsWorktree(base, repoRoot, rel, targetBranch, tafSeed);
  } catch (error) {
    fs.rmSync(base, { recursive: true, force: true });
    throw error;
  }
}

async function addReceiptsWorktree(base: string, repoRoot: string, rel: string, targetBranch: string, tafSeed: string | null): Promise<string> {
  const worktree = path.join(base, 'wt');
  const remoteRef = `refs/remotes/origin/${targetBranch}`;

  const { exitCode } = await exec.getExecOutput(
    'git', ['ls-remote', '--exit-code', 'origin', `refs/heads/${targetBranch}`],
    { cwd: repoRoot, env: botGitEnv(), ignoreReturnCode: true, silent: true }
  );

  let start: string;
  if (exitCode === 0) {
    await gitOut(repoRoot, ['fetch', 'origin', `+refs/heads/${targetBranch}:${remoteRef}`]);
    start = remoteRef;
    core.info(`Receipts branch ${targetBranch} exists: adding to it`);
  } else {
    const tafText = tafSeed ?? minimalTaf(path.basename(path.join(repoRoot, rel)));
    const blobFile = path.join(base, 'seed.taf');
    fs.writeFileSync(blobFile, tafText, 'utf-8');
    const blob = await gitOut(repoRoot, ['hash-object', '-w', '--', blobFile]);
    const index = { GIT_INDEX_FILE: path.join(base, 'index') };
    const tafEntry = rel ? `${rel.split(path.sep).join('/')}/.taf` : '.taf';
    await gitOut(repoRoot, ['update-index', '--add', '--cacheinfo', `100644,${blob},${tafEntry}`], index);
    const tree = await gitOut(repoRoot, ['write-tree'], index);
    start = await gitOut(repoRoot, ['commit-tree', tree, '-m', `chore(taf): initialize ${targetBranch} branch [skip ci]`]);
    core.info(tafSeed ? `Seeded new ${targetBranch} branch with the existing .taf` : `Created new ${targetBranch} branch with an empty .taf`);
  }

  await gitOut(repoRoot, ['worktree', 'add', '--detach', worktree, start]);
  return worktree;
}

/** Remove the receipts worktree and its temporary folder. */
async function closeReceiptsWorktree(repoRoot: string, worktree: string): Promise<void> {
  await exec.getExecOutput('git', ['worktree', 'remove', '--force', worktree], { cwd: repoRoot, ignoreReturnCode: true, silent: true });
  fs.rmSync(path.dirname(worktree), { recursive: true, force: true });
  await exec.getExecOutput('git', ['worktree', 'prune'], { cwd: repoRoot, ignoreReturnCode: true, silent: true });
}

/**
 * Commit the receipt and push it. On a receipts branch, a push another run
 * beat is tried again on top of its receipts (see receipt-push.ts);
 * `addReceipt` adds this run's receipt to the fresh .taf. Returns whether the
 * receipt reached the remote (null: nothing to push to).
 */
async function commitTafUpdate(cwd: string, message: string, targetBranch: string | undefined, failOnPushError: boolean, addReceipt: () => boolean): Promise<boolean | null> {
  const execOptions = { cwd, env: botGitEnv() };

  // Check if there are changes to commit
  await exec.exec('git', ['add', '--', '.taf'], execOptions);
  const { stdout } = await exec.getExecOutput('git', ['diff', '--cached', '--name-only', '--', '.taf'], execOptions);
  if (stdout.trim() === '') {return null;}

  if (targetBranch) {
    const git = (args: string[]) => exec.exec('git', args, { ...execOptions, ignoreReturnCode: true });
    const { pushed, attempts } = await pushReceipt(git, targetBranch, message, addReceipt);
    if (pushed && attempts > 1) {core.info(`Pushed on try ${attempts}: another run pushed a receipt first`);}
    if (!pushed) {core.setFailed(`The receipt did not reach ${targetBranch}: the push failed ${attempts} times`);}
    return pushed;
  }

  // Name .taf so nothing else that is staged goes into the receipt commit.
  await exec.exec('git', ['commit', '-m', message, '--', '.taf'], execOptions);
  const upstream = await exec.getExecOutput('git', ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], { ...execOptions, ignoreReturnCode: true, silent: true });
  if (upstream.exitCode !== 0) {
    core.info('Receipt committed. This branch has no upstream (a pull request checkout, say), so it was not pushed. Use target-branch to keep receipts.');
    return null;
  }
  const push = await exec.getExecOutput('git', ['push'], { ...execOptions, ignoreReturnCode: true });
  if (push.exitCode !== 0) {
    // On the current branch a refused push (a read-only token, a protected
    // branch, another run first) is a warning unless fail-on-push-error says
    // otherwise: it was a warning before 2.6.0, and many workflows rely on it.
    const text = `The receipt is committed but not pushed, so it is lost when this job ends: ${pushFailureReason(push.stderr)}. Use target-branch: taf-receipts (a push another run beat is tried again), or give the job contents: write.`;
    if (failOnPushError) {core.setFailed(text);} else {core.warning(text);}
    return false;
  }
  return true;
}

async function run(): Promise<void> {
  try {
    // Get GitHub Action inputs
    const testOutputFile = core.getInput('test-output-file', { required: true });
    const autoCommit = core.getInput('auto-commit') !== 'false';
    const commitMessage = core.getInput('commit-message') || 'chore(taf): update .taf receipt [skip ci]';
    const targetBranch = core.getInput('target-branch') || '';
    const failOnPushError = core.getInput('fail-on-push-error') === 'true';
    const skippedNamesCap = parseSkippedNamesCap(core.getInput('skipped-names'));
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
      core.setFailed(noResultsReason(testOutput));
      return;
    }

    core.info(`Parsed results: ${testResults.passed}/${testResults.total} tests passing`);

    // Set GitHub Action outputs
    core.setOutput('result', testResults.result);
    core.setOutput('passed', testResults.passed.toString());
    core.setOutput('failed', testResults.failed.toString());
    core.setOutput('total', testResults.total.toString());
    core.setOutput('skipped', (testResults.skipped ?? 0).toString());

    // With target-branch the receipt goes to that branch, written in a
    // separate worktree: this checkout is left exactly as it is.
    let workCwd = cwd;
    let repoRoot = '';
    let worktree = '';
    if (targetBranch) {
      const sourceTaf = path.join(cwd, '.taf');
      const tafSeed = fs.existsSync(sourceTaf) ? fs.readFileSync(sourceTaf, 'utf-8') : null;
      repoRoot = await gitOut(cwd, ['rev-parse', '--show-toplevel']);
      const rel = path.relative(fs.realpathSync(repoRoot), fs.realpathSync(cwd));
      worktree = await openReceiptsWorktree(repoRoot, rel, targetBranch, tafSeed);
      workCwd = path.join(worktree, rel);
    }
    try {
      const tafPath = path.join(workCwd, '.taf');

      // Check if .taf file exists (on current or target branch)
      if (!fs.existsSync(tafPath)) {
        core.setFailed(NO_TAF_FILE);
        return;
      }

      // Update .taf file
      const updated = await updateTafFile(tafPath, testResults, { skippedNamesCap });

      if (!updated) {
        core.setOutput('taf-updated', 'false');
        core.setFailed('.taf file was not updated');
        return;
      }

      core.setOutput('taf-updated', 'true');
      core.info('✅ .taf file updated successfully');

      // Commit changes if enabled
      if (autoCommit) {
        const pushed = await commitTafUpdate(workCwd, commitMessage, targetBranch || undefined, failOnPushError, () => updateTafFile(tafPath, testResults, { skippedNamesCap }));
        core.setOutput('receipt-pushed', String(pushed === true));
        if (pushed) {core.info(`✅ Receipt pushed${targetBranch ? ` to ${targetBranch}` : ''}`);}
      } else {
        core.setOutput('receipt-pushed', 'false');
      }

      // Skipped names: from the receipt actually written (after any push retry).
      core.setOutput('newly-skipped', (lastUpdate.skippedTests?.newly_skipped?.length ?? 0).toString());
      if (lastUpdate.skippedTests?.newly_skipped?.length) {
        core.info(`Newly skipped: ${lastUpdate.skippedTests.newly_skipped.join(' | ')}`);
      }
      if (lastUpdate.skippedNamesNote) core.info(`Skipped names not written: ${lastUpdate.skippedNamesNote}`);
    } finally {
      if (worktree) {await closeReceiptsWorktree(repoRoot, worktree);}
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
