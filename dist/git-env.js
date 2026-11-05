"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.botGitEnv = botGitEnv;
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
//# sourceMappingURL=git-env.js.map