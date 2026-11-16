/**
 * Push a receipt, and try again when another run got there first.
 *
 * Two runs that finish close together both commit a receipt on top of the
 * same branch tip; the second push is rejected (non-fast-forward). Before
 * 2.4.3 that was a warning and the receipt was lost. Now the run fetches the
 * branch again, catches up with it, adds its receipt to the fresh .taf, and
 * pushes, up to `attempts` times.
 *
 * Catching up, by where the receipt goes:
 *   - `reset` (a dedicated receipts branch, `target-branch`): the branch
 *     holds nothing but .taf, so resetting to the remote throws away only
 *     this run's own rejected commit. Runs in the receipts worktree on a
 *     detached HEAD.
 *   - `rebase` (the current branch): never a hard reset, the checkout may
 *     hold other work. This run's rejected receipt commit (it holds .taf
 *     only) is taken off, the branch is rebased onto the remote, and the
 *     receipt is added again. When the rebase can't be done (changed tracked
 *     files, a conflict) it is aborted, the receipt is committed again where
 *     it was, and the push is given up.
 *
 * Both push HEAD to the branch and fetch with an explicit refspec (a
 * single-branch checkout's fetch config doesn't cover a receipts branch).
 */
/** Runs git with these args in the repo; resolves to the exit code. */
export type Git = (args: string[]) => Promise<number>;
export interface PushResult {
    pushed: boolean;
    attempts: number;
}
export interface PushOptions {
    /** How many pushes to try. Default 5. */
    attempts?: number;
    /** The remote to fetch from and push to. Default `origin`. */
    remote?: string;
    /** How to catch up with the remote before another try. Default `reset`. */
    catchUp?: 'reset' | 'rebase';
    /** Asked after a failed push: is another try worth it? Default: always. */
    retry?: () => boolean;
}
export declare function pushReceipt(git: Git, targetBranch: string, message: string, addReceipt: () => boolean, options?: PushOptions): Promise<PushResult>;
