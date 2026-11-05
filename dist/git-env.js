"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.botGitEnv = botGitEnv;
exports.pushFailureReason = pushFailureReason;
exports.pushWasBehind = pushWasBehind;
/**
 * The bot's git identity, given to each git command through the environment.
 * Never written to git config: `git config --global` on a developer's machine
 * would replace their own name and email for every repo.
 */
function botGitEnv(base = process.env) {
    const env = {};
    for (const [k, v] of Object.entries(base)) {
        if (v !== undefined) {
            env[k] = v;
        }
    }
    env.GIT_AUTHOR_NAME = 'faf-taf-git[bot]';
    env.GIT_AUTHOR_EMAIL = 'faf-taf-git[bot]@users.noreply.github.com';
    env.GIT_COMMITTER_NAME = 'faf-taf-git[bot]';
    env.GIT_COMMITTER_EMAIL = 'faf-taf-git[bot]@users.noreply.github.com';
    return env;
}
/**
 * Why a `git push` failed, from its stderr: the `[remote rejected]` /
 * `[rejected]` line (else `error:` / `fatal:`), plus the server's own
 * `remote:` message when it sent one. Never the hint git prints after them.
 */
function pushFailureReason(stderr) {
    const lines = stderr.split('\n').map((l) => l.trim()).filter(Boolean);
    const pick = (re) => lines.find((l) => re.test(l));
    const why = pick(/\[remote rejected\]/) ?? pick(/\[rejected\]/) ?? pick(/^(error|fatal):/) ?? lines[lines.length - 1] ?? 'push failed';
    const remote = lines.find((l) => /^remote:\s*\S/.test(l) && !/^remote:\s*(Resolving|Counting|Compressing|Total|Enumerating)/.test(l));
    return [why, remote].filter(Boolean).join(' — ').replace(/\.+$/, '');
}
/** True when the push was refused because the remote moved on (pulling first fixes it). */
function pushWasBehind(stderr) {
    return /\[rejected\].*\((fetch first|non-fast-forward)\)/.test(stderr);
}
//# sourceMappingURL=git-env.js.map