"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.pushReceipt = pushReceipt;
async function pushReceipt(git, targetBranch, message, addReceipt, attempts = 3) {
    for (let attempt = 1; attempt <= attempts; attempt++) {
        if (attempt > 1) {
            // Another run pushed first: start again from its receipts.
            if ((await git(['fetch', 'origin', targetBranch])) !== 0) {
                break;
            }
            if ((await git(['reset', '--hard', `origin/${targetBranch}`])) !== 0) {
                break;
            }
            if (!addReceipt()) {
                break;
            }
        }
        if ((await git(['add', '.taf'])) !== 0) {
            break;
        }
        if ((await git(['commit', '-m', message])) !== 0) {
            break;
        }
        if ((await git(['push', 'origin', targetBranch])) === 0) {
            return { pushed: true, attempts: attempt };
        }
    }
    return { pushed: false, attempts };
}
//# sourceMappingURL=receipt-push.js.map