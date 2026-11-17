/**
 * Push a receipt, and try again when another run got there first.
 *
 * Two runs that finish close together both commit a receipt on top of the
 * same branch tip; the second push is rejected (non-fast-forward). Before
 * 2.4.3 that was a warning and the receipt was lost. Now the run fetches the
 * branch again, catches up with it, adds its receipt to the fresh .taf, and
 * pushes, up to `attempts` times.
 *
 * Catching up: the receipt is written in a temporary worktree on a detached
 * HEAD (the receipts branch, or for the current branch a worktree at the
 * remote tip), never in the job's own checkout. Resetting that worktree to
 * the remote throws away only this run's own rejected receipt commit; the
 * job's checkout is never moved, so later steps run on the code that was
 * tested.
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
    /** Asked after a failed push: is another try worth it? Default: always. */
    retry?: () => boolean;
}
export declare function pushReceipt(git: Git, targetBranch: string, message: string, addReceipt: () => boolean, options?: PushOptions): Promise<PushResult>;
