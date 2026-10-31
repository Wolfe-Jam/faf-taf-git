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
export declare function pushReceipt(git: Git, targetBranch: string, message: string, addReceipt: () => boolean, attempts?: number): Promise<PushResult>;
