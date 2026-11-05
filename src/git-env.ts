/**
 * The bot's git identity, given to each git command through the environment.
 * Never written to git config: `git config --global` on a developer's machine
 * would replace their own name and email for every repo.
 */
export function botGitEnv(base: NodeJS.ProcessEnv = process.env): { [key: string]: string } {
  const env: { [key: string]: string } = {};
  for (const [k, v] of Object.entries(base)) {if (v !== undefined) {env[k] = v;}}
  env.GIT_AUTHOR_NAME = 'faf-taf-git[bot]';
  env.GIT_AUTHOR_EMAIL = 'faf-taf-git[bot]@users.noreply.github.com';
  env.GIT_COMMITTER_NAME = 'faf-taf-git[bot]';
  env.GIT_COMMITTER_EMAIL = 'faf-taf-git[bot]@users.noreply.github.com';
  return env;
}

/**
 * The line of a failed `git push`'s stderr that says why: the `[rejected]` /
 * `error:` / `fatal:` line, not the hint git prints after it.
 */
export function pushFailureReason(stderr: string): string {
  const lines = stderr.split('\n').map((l) => l.trim()).filter(Boolean);
  const why = lines.find((l) => /\[rejected\]|^error:|^fatal:/.test(l)) ?? lines[lines.length - 1] ?? 'push failed';
  return why.replace(/\.+$/, '');
}
