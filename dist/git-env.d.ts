/**
 * The bot's git identity, given to each git command through the environment.
 * Never written to git config: `git config --global` on a developer's machine
 * would replace their own name and email for every repo.
 */
export declare function botGitEnv(base?: NodeJS.ProcessEnv): {
    [key: string]: string;
};
