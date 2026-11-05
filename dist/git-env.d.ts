/**
 * The bot's git identity, given to each git command through the environment.
 * Never written to git config: `git config --global` on a developer's machine
 * would replace their own name and email for every repo.
 */
export declare function botGitEnv(base?: NodeJS.ProcessEnv): {
    [key: string]: string;
};
/**
 * Why a `git push` failed, from its stderr: the `[remote rejected]` /
 * `[rejected]` line (else `error:` / `fatal:`), plus the server's own
 * `remote:` message when it sent one. Never the hint git prints after them.
 */
export declare function pushFailureReason(stderr: string): string;
/** True when the push was refused because the remote moved on (pulling first fixes it). */
export declare function pushWasBehind(stderr: string): boolean;
