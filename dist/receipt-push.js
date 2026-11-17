"use strict";
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
 * remote tip that holds only .taf), never in the job's own checkout. HEAD is
 * moved to the remote tip and .taf taken from it, which throws away only this
 * run's own rejected receipt commit and touches no other file; the job's
 * checkout is never moved, so later steps run on the code that was tested.
 * Tries are spaced by a short random wait, so runs that keep colliding drift
 * apart.
 *
 * Both push HEAD to the branch and fetch with an explicit refspec (a
 * single-branch checkout's fetch config doesn't cover a receipts branch).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.pushReceipt = pushReceipt;
const randomWait = (attempt) => new Promise((resolve) => setTimeout(resolve, (500 + Math.random() * 1000) * (attempt - 1)));
async function pushReceipt(git, targetBranch, message, addReceipt, options = {}) {
    const { attempts = 5, remote = 'origin', retry = () => true, wait = randomWait } = options;
    const remoteRef = `refs/remotes/${remote}/${targetBranch}`;
    // Name .taf on both: the receipt commit holds the receipt and nothing else.
    const commit = async () => (await git(['add', '--', '.taf'])) === 0 && (await git(['commit', '-m', message, '--', '.taf'])) === 0;
    // Pushes actually tried: a fetch or commit that fails ends the loop early.
    let pushes = 0;
    for (let attempt = 1; attempt <= attempts; attempt++) {
        if (attempt > 1) {
            // Another run pushed first: start again from its receipts.
            await wait(attempt);
            if ((await git(['fetch', remote, `+refs/heads/${targetBranch}:${remoteRef}`])) !== 0) {
                break;
            }
            if ((await git(['reset', '--soft', remoteRef])) !== 0) {
                break;
            }
            if ((await git(['checkout', remoteRef, '--', '.taf'])) !== 0) {
                break;
            }
            if (!addReceipt()) {
                break;
            }
        }
        if (!(await commit())) {
            break;
        }
        pushes++;
        if ((await git(['push', remote, `HEAD:refs/heads/${targetBranch}`])) === 0) {
            return { pushed: true, attempts: pushes };
        }
        if (!retry()) {
            break;
        }
    }
    return { pushed: false, attempts: pushes };
}
//# sourceMappingURL=receipt-push.js.map