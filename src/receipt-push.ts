/**
 * Push a receipt to the receipts branch, and try again when another run got
 * there first.
 *
 * Two runs that finish close together both commit a receipt on top of the
 * same branch tip; the second push is rejected (non-fast-forward). Before
 * 2.4.3 that was a warning and the receipt was lost. Now the run fetches the
 * branch again, resets to it, adds its receipt to the fresh .taf, and pushes,
 * up to `attempts` times.
 *
 * Only for a dedicated receipts branch (`target-branch`): it holds nothing
 * but .taf, so resetting to the remote throws away only this run's own
 * rejected commit. Pushing to the current branch never resets.
 */

/** Runs git with these args in the repo; resolves to the exit code. */
export type Git = (args: string[]) => Promise<number>;

export interface PushResult {
  pushed: boolean;
  attempts: number;
}

export async function pushReceipt(
  git: Git,
  targetBranch: string,
  message: string,
  addReceipt: () => boolean,
  attempts = 3,
): Promise<PushResult> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    if (attempt > 1) {
      // Another run pushed first: start again from its receipts.
      if ((await git(['fetch', 'origin', targetBranch])) !== 0) {break;}
      if ((await git(['reset', '--hard', `origin/${targetBranch}`])) !== 0) {break;}
      if (!addReceipt()) {break;}
    }
    if ((await git(['add', '.taf'])) !== 0) {break;}
    if ((await git(['commit', '-m', message])) !== 0) {break;}
    if ((await git(['push', 'origin', targetBranch])) === 0) {return { pushed: true, attempts: attempt };}
  }
  return { pushed: false, attempts };
}
