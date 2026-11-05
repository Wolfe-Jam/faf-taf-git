<!-- faf: faf-taf-git | TypeScript | cli | A Test Receipt Printer for git -->
<!-- faf: doc=changelog | latest=v2.5.0 | canonical=project.faf | family=TAF -->

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- **No shell for the commit message** ([#39](https://github.com/Wolfe-Jam/faf-taf-git/pull/39)): the CLI ran `git commit -m "<message>"` through a shell, so `--message 'x$(touch INJECTED)y'` ran a command. Every git call now takes an argument list.
- **Receipt commits hold `.taf` only** ([#39](https://github.com/Wolfe-Jam/faf-taf-git/pull/39), and the `target-branch` path in this release): `git add` and `git commit` name `-- .taf`, so whatever else is staged stays out of the receipt.
- **`target-branch` with a step `working-directory`:** the first run committed the repository's other tracked files onto the receipts branch (the orphan init kept the whole index, and `git rm -rf .` only cleared the subfolder). The receipts branch now gets that `.taf` only. A receipts branch created this way by 2.5.0 or earlier keeps the files it already has: delete it, or remove them by hand.
- **The Action never writes git config** ([#39](https://github.com/Wolfe-Jam/faf-taf-git/pull/39)): it used `git config --global user.name/user.email`, which on a developer machine replaces their identity for every repo. The bot identity now goes to each git command as `GIT_AUTHOR_*` / `GIT_COMMITTER_*`.
- **A receipt write keeps the rest of the file:** the file was rebuilt from parsed data, which dropped comments, blank lines and any later `---` document. The receipts document is now edited as YAML (its comments and key order stay), and anything after it is kept byte for byte, even a document with a YAML error. As before, CRLF line ends become LF and history indentation becomes 2 spaces.
- **Runs that write the same `.taf` at once each keep their receipt:** 20 parallel runs kept as few as 1–6 receipts, depending on the machine. Each write now holds `.taf.lock` (`host:pid:token`) and renames a temp file over `.taf`; 20 parallel runs keep 20. A lock left by a killed run (its process gone, or older than a minute) is taken over by one waiter at a time, so a live lock is never removed. A symlinked `.taf` stays a symlink and keeps its mode.
- **CLI `--commit`: a receipt that isn't pushed is an error.** A rejected push exits 1 with git's reason (and the server's message), plus what to do: `git pull --rebase && git push` when the remote moved on, a check of push access and branch protection when the server refused. A branch with no upstream keeps the receipt in a local commit and says so.
- **`target-branch` found a branch that only ends in the same name** (`ls-remote` matched `archive/taf-receipts` for `taf-receipts`) and then failed. It now asks for `refs/heads/<branch>`. A failing git command in the Action names git's own error.
- **`target-branch` no longer touches the job's checkout.** The Action switched the checkout to the receipts branch, stashed changes it never restored, and on the first run emptied the working tree with `git rm -rf .`. On a developer machine that lost staged work. It now writes the receipt in a separate git worktree, in a temporary folder that is removed afterwards: the checkout keeps its branch, its staged work and its files.
- **`--name=value` works for every CLI option:** `--message=…` was ignored and the default message used.

### Added
- Action output `receipt-pushed`: `true` when the receipt reached the remote; `false` with `auto-commit: false`, with no upstream (a pull request checkout), or when the push failed.
- Action input `fail-on-push-error` (default `false`): fail the step when the receipt can't be pushed to the current branch.

### Changed
- **A receipt that the Action can't push is no longer quiet.** On `target-branch`, a push still rejected after 5 tries fails the step (it was a warning, and the receipt was lost). On the current branch it stays a warning, now saying the receipt is lost when the job ends and why (a read-only token, a protected branch, another run first), with `receipt-pushed: false`; set `fail-on-push-error: true` to fail the step instead. Many workflows push with a read-only `GITHUB_TOKEN`, so failing by default would turn them red.
- After a `target-branch` run the job's checkout is still on its own branch. Before, later steps in the same job ran on the receipts branch.
- **During a merge, the CLI's `--commit` now fails** (`cannot do a partial commit during a merge`) and leaves `.taf` staged. Before, it silently committed your merge as the receipt. Finish the merge, then commit the receipt.

## [2.5.0] - 2026-11-05 — Named Skips Edition

Receipts name the skipped tests, so a skipped count that stays the same can't hide a different set.

### Added
- `skipped_tests` on each receipt with skips (RECEIPT-FORMAT.md v1.1): the names (sorted, up to 25, `truncated: true` past that), a `sha256` hash of the full set, and `newly_skipped` / `no_longer_skipped` against the previous receipt. A return to zero writes `names: []` with `no_longer_skipped`.
- Names from JUnit XML (`<testcase>` with `<skipped/>`, as `classname > name`) and Bun (`(skip)` and `(todo)` lines, with their file). Names are cleaned so they compare across runs: colour codes, timings and absolute path prefixes removed, whitespace collapsed, at most 200 characters.
- The block is written only when the output names every skipped test; otherwise the log says why (Jest and Vitest print names only in verbose mode).
- Action input `skipped-names` and CLI flag `--skipped-names` (default 25, `0` turns it off; anything but a whole number is an error). Action output `newly-skipped`.
- On a push-race retry the diff is worked out again against the receipt that won.

### Changed
- RECEIPT-FORMAT.md v1.1: readers ignore keys they don't know. The file's `format_version` stays `"1.0.0"`.
- `action.yml` lists `SKIPPED` among the `result` values.

## [2.4.6] - 2026-11-03

The package no longer carries build-machine paths, and a report with no tests says "no tests ran" instead of "could not parse".

### Fixed
- A JUnit report that lists no tests (`node --test` with no test files) says `No tests ran: the JUnit report lists 0 tests, so there is no receipt to print.` instead of `Could not parse test output`. Still no receipt, still exit 1.
- The npm package no longer carries this machine's file paths: the `.d.ts.map` files (which pointed at `file:///Users/…/src`, a folder the package doesn't ship) are gone, and so are `dist/main.*`, left over from a source file deleted long ago. 52 files → 37.

### Changed
- `npm run check:no-hardcode` fails when `dist/` holds a build-machine path. CI runs it after the build, and `npm publish` runs it first.

## [2.4.5] - 2026-11-02

node:test receipts count every test: a failing top-level test beside a `describe` is no longer dropped, and nested `describe`s are counted in full.

### Fixed
- node:test JUnit reports (`--test-reporter=junit`) are counted by their `<testcase>`s. node counts a nested `describe` as one test in its parent, and puts top-level tests beside its suites, so a run with a `describe` was miscounted: a failing top-level test was dropped and the receipt said PASSED. Now counted when suites are nested, or when there are more testcases than the suites count. Other reports are read as before.

## [2.4.4] - 2026-11-01

Receipts tell the truth about skips: a run where every test was skipped is recorded as SKIPPED, the badge counts only real passes, and each receipt says where it ran.

### Fixed
- With no `.taf`, the error said to run `faf taf init`, a command that doesn't exist. It now gives the line that makes one: `echo 'test_history: []' > .taf`.
- Every receipt said `trigger: github-actions`, even a local run. It now says `github-actions` on GitHub Actions, `ci` on another CI, and `local` otherwise.
- A run where every test was skipped was recorded as `PASSED`. It is now `SKIPPED`, a new `result` value in the receipt format (`RECEIPT-FORMAT.md`), and its badge is gray.
- The badge counted skipped tests as passing: 2332 passed and 1 skipped showed `2333/2333 passing (1 skipped)`. It now shows `2332/2333 passing (1 skipped)`.

## [2.4.3] - 2026-10-31

A receipt that loses a push race is retried instead of lost, and skipped Go tests count as skipped, not passed.

### Fixed
- **A receipt that lost a push race is no longer lost.** Two runs finishing close together both commit on the same `taf-receipts` tip, and the second push was rejected with a warning. The Action now fetches the branch again, adds its receipt on top of the winner's, and pushes, up to 5 tries. Only with `target-branch`: that branch holds nothing but `.taf`. Nothing is force-pushed; the branch only grows. Pushing to the current branch is unchanged
- **Skipped tests in a JUnit report no longer count as passed** when the report leaves `skipped` out of its counts. gotestsum (Go) writes `tests` and `failures` on its root and nothing else, so 1 pass, 1 fail and 1 skip read as 2 passed. The `<skipped>` testcases are counted instead

### Changed
- **The README recipe no longer has a `concurrency` group.** GitHub cancels a waiting run when a newer one joins the group, so a run could end with no tests and no receipt. Runs that race for the push are retried instead (above)

## [2.4.2] - 2026-10-30

undici 6.29.1 in the Action bundle (security), and the npm package ships only the CLI: 34 kB instead of 1.0 MB.

### Security
- **undici 6.28.1 → 6.29.1** in the lockfile and the rebuilt Action bundle (`dist/index.js`). Clears 5 Dependabot alerts (TLS certificate check bypass, denial of service). undici comes in through `@actions/core`; faf-taf-git makes no HTTP requests itself, so the risk was low, but the bundle no longer carries a known-vulnerable copy.

### Changed
- **The npm package ships only the CLI:** a `files` list in package.json. 1.0 MB → 34 kB packed, 94 → 48 files. Out: `src/`, `tests/`, `.github/`, dev configs, and the GitHub Action bundle (`dist/index.js`), which workflows run from the git tag, never from npm. The Action itself is unchanged.

## [2.4.1] - 2026-10-30

`faf-taf-git --version` answers, and the descriptions say tamper-evident, not "cannot be gamed".

### Fixed
- **`--version` / `-V`** print the package version and exit 0. Before, `faf-taf-git --version` fell through to "No test output file specified" and exit 1, so a stranger's first check failed (found by a cold install of the published 2.4.0). `-v` is still `--verbose`. `tests/cli-version.test.ts`.

### Changed
- **Descriptions:** `package.json` (npm) and `action.yml` (GitHub Marketplace) no longer say "cannot be gamed"; they now read "append-only, timestamped, kept in git. Proof over time." The RECEIPT-FORMAT heading is "Tamper-evident, not tamper-proof", matching the README.
- **project.faf:** rebuilt lean from the repo (267 → 57 lines), Trophy. `.faf-dna` unchanged.
- **README recipe** pins `@v2.4.1`. The Action itself is unchanged from 2.4.0.

## [2.4.0] - 2026-10-29

JUnit XML parser: TAF now reads the report format most test runners can write, so Python, Rust, Go, Java and .NET projects get receipts with no conversion script.

### Added
- **JUnit XML parser** (`parseJunitOutput`). Pass a JUnit XML report as `test-output-file`. Handles a `<testsuites>` root with or without totals, a single `<testsuite>`, nested suites (counted once), and suites with no counts (the `<testcase>` elements are counted). Failures and errors count as failed; skipped and disabled count as skipped. Tried first, because a report's captured stdout can hold another runner's summary line. Checked against a real pytest report: 202 passed, 4 skipped, the same as pytest printed.
- **`skipped` Action output.** The README listed it; the Action now sets it.

### Changed
- **README rewritten in plain English**, with a recommended workflow: failed runs get a `FAILED` receipt (tests run with `continue-on-error`, then the job fails after the receipt), receipts on `main` only, one test run.
- CLI `--help` lists JUnit XML among the parsers.

## [2.3.1] - 2026-09-15

Marketplace metadata — the GitHub Action's description is now under the Marketplace's 125-character limit (it was 153), so the listing can show its current name, **TAF — Testing AI Format**. No code change — same `dist/` as 2.3.0.

## [2.3.0] - 2026-09-14

WJTTC parser — TAF now receipts a WJTTC run directly, no Jest shim. The Action now runs on `node24`.

### Added
- **WJTTC parser** (`parseWjttcOutput`) — reads both WJTTC output forms: the `--json` suite (`"suite": "pc-ai-wjttc"`) and the human log (`pc-ai WJTTC` + `N/N passed`). Wired second in the dispatcher, after Bun.
- **`RECEIPT-FORMAT.md`** — the canonical `.taf` receipt format spec, linked from the README.

### Changed
- **Action runtime `node20` → `node24`.** GitHub-hosted runners already run node20 actions on Node 24 and warn on every run ("Node.js 20 is deprecated"); declaring `node24` matches what runs and drops the warning. Self-hosted runners need a runner release that supports `node24`.

### Fixed
- **CLI and Action parse-error text** now name every supported parser: Bun, WJTTC, Jest, Vitest. Both are built from the parser table itself, so a new parser shows up in both (the CLI was missing Bun; the Action said "Jest, Vitest").
- **undici** — `@actions/github` pulled a vulnerable undici 5.x; `overrides.undici ^6.28.0` pins past it, on the 6.x line `@actions/http-client` declares.

## [2.2.2] - 2026-06-25

Marketplace metadata — surfaces the pinned brand: **TAF = Testing AI Format** (sibling of FAF, independent). Refreshes the GitHub Action name + description and adds the README definition line. No code change — same `dist/` as 2.2.1.

## [2.2.1] - 2026-06-17

Catch-up release — npm was stuck at 2.0.4 while 2.1.0–2.2.0 were tagged but never published. This rolls the full span to npm, plus the navy badge.

### Added
- **Native bun-test parser** (was v2.2.0) — closes the shim-shaped undercount; reads `bun test` output directly.
- **`target-branch` input** (was v2.1.0) — write `.taf` receipts to a dedicated branch.

### Changed
- **TAF badge pass color cyan `#00D4D4` → navy `#003366`** — white text needs a deep-shade background; cyan was too light.

### Fixed
- **`switchToTargetBranch`** no longer fails on first run when the consumer repo has no `.taf` seed (was v2.1.2).
- undici vulnerabilities resolved via `@actions/github` / `@actions/core` upgrade; `@actions/core` pinned to v2 (v3 breaks CJS exports in CI).

### Notes
- faf-taf-git is now 100% Trophy (TAF identity cleanup). Security Policy + Code of Conduct added.

## [2.1.2] - 2026-05-06

### Fixed
- **`switchToTargetBranch` no longer fails on first run when consumer repo has no `.taf` seed.** Previously, the orphan-create path called `git add .taf` unconditionally; if no seed existed on the source branch, that step failed with `fatal: pathspec '.taf' did not match any files` (exit code 128) and the whole TAF Receipt step errored out.
- New behavior: when no seed is present, the action now writes a minimal valid YAML seed (`format_version`, `project`, `created`, `test_history: []`) so the first commit on the target branch always succeeds. `updateTafFile` then populates `test_history` on the same run.
- Affects any consumer using `target-branch:` for the first time without a pre-seeded `.taf` on `main`. Previous workaround (manually committing a `.taf` seed) is no longer required.

## [2.0.4] - 2026-02-17

### Fixed
- **Parser now correctly identifies Jest summary line** - fixes "Could not parse test output" error
- Parser pattern now matches "Tests:" lines containing "total" (Jest summary format)
- Prevents matching test descriptions like "Brake Tests: Critical dogfooding scenarios"
- TAF Receipt now works end-to-end in GitHub Actions CI ✅

### Changed
- Pattern: `/Tests:\s+(.+?\d+\s+total)/im` (more specific than previous `/Tests:\s*(.+?)/`)

## [2.0.3] - 2026-02-17

### Added
- Debug logging to diagnose parser failures
- Shows sample of summary line if found, or last 20 lines if not found
- Revealed root cause: parser was matching test descriptions instead of Jest summary

## [2.0.2] - 2026-02-17

### Fixed
- **Fixed action.yml bundle path** - now points to `dist/index.js` (correct build output location)
- Previous versions pointed to `dist/bundle/index.js` which caused "Cannot find module" errors

## [2.0.1] - 2026-02-17

### Fixed
- Attempted bundle location fix (incomplete - see v2.0.2)

## [2.0.0] - 2026-02-17

### Changed
- **ARCHITECTURAL REDESIGN: Pre-capture pattern** 🎯
- Separate test execution from receipt generation
- Step 1: Run tests in normal shell with output redirect (`npm test 2>&1 | tee test-output.txt`)
- Step 2: Read file and generate receipt
- **Breaking change:** Replaces `test-command` input with `test-output-file` input

### Why
- GitHub Actions execution context corruption after `@actions/exec.getExecOutput()`
- ALL logging and filesystem operations failed silently after subprocess execution
- Tested 19 different methods (console.log, console.error, fs.writeFileSync, etc.) - all failed
- No canary files found anywhere despite writing to 4 different locations
- Pre-capture pattern bypasses the problematic execution context entirely

### Removed
- Removed 400+ lines of @actions/exec complexity
- Bundle size reduced by 11KB
- No more subprocess execution in receipt generation step

### Migration
```yaml
# OLD (v1.x):
- name: Generate TAF Receipt
  uses: Wolfe-Jam/faf-taf-git@v1
  with:
    test-command: npm test

# NEW (v2.x):
- name: Run Tests and Capture Output
  run: npm test 2>&1 | tee test-output.txt

- name: Generate TAF Receipt
  uses: Wolfe-Jam/faf-taf-git@v2.0.4
  with:
    test-output-file: test-output.txt
```

## [1.2.2] - 2026-02-17

### Added
- Multi-location canary file attempts (4 different paths)
- Result: NO files found anywhere - confirmed execution context corruption

## [1.2.1] - 2026-02-17

### Added
- Nuclear canary: Direct filesystem write after getExecOutput
- Result: File never created - filesystem operations completely fail

## [1.2.0] - 2026-02-17

### Added
- Direct console.error logging attempt
- Result: Still suppressed by GitHub Actions

## [1.1.6] - 2026-02-17

### Added
- Dual logging (core.info + console.log)
- Result: Both methods failed silently

## [1.1.5] - 2026-02-17

### Fixed
- JavaScript 'this' binding with arrow function wrapper
- Result: Not the issue - logging still failed

## [1.1.4] - 2026-02-17

### Added
- CHECKPOINT debug logs at multiple locations
- Result: Logs before getExecOutput worked, logs after failed

## [1.1.3] - 2026-02-17

### Added
- Unconditional debug logs (no conditionals)
- Result: Still no output in GitHub Actions

## [1.1.2] - 2026-02-17

### Changed
- Use `exec.getExecOutput()` instead of `exec.exec()` to capture stdout/stderr
- Result: Still failing - deeper execution context issue

## [1.1.1] - 2026-02-17

### Fixed
- Command parsing edge case (split "npm test" into executable + args)
- Result: Still failing - execution context corruption

## [1.1.0] - 2026-02-17

### Changed
- Switch from `child_process` to `@actions/exec` for GitHub Actions compatibility
- Result: Still failing - wrong function used

## [1.0.9] - 2026-02-17

### Added
- Write captured test output to /tmp/taf-debug-output.txt for inspection
- Enhanced debug logging to show last 10 lines when Tests: line not found

## [1.0.8] - 2026-02-17

### Fixed
- Improved Jest output parser robustness (handles carriage returns, multiple line endings, flexible pattern matching)
- Parser now tries multiple patterns to find test summary line
- Better handling of padded output from CI environments

## [1.0.7] - 2026-02-17

### Added
- Use core.info for GitHub Actions logging (console.log doesn't show in Actions)

## [1.0.6] - 2026-02-17

### Added
- Debug logging to troubleshoot Jest output parsing issues in CI

## [1.0.5] - 2026-02-17

### Fixed
- Rebuild action bundle with ANSI stripping fix (v1.0.4 had the code but not the bundle)

## [1.0.4] - 2026-02-17

### Fixed
- Strip ANSI color codes from Jest output before parsing (fixes CI parsing failures)
- Parser now handles Jest output with ANSI codes from GitHub Actions and other CI systems
- Case-insensitive matching for test status keywords (passed, failed, skipped, total)

## [1.0.0] - 2025-10-28

### Added
- Initial release of faf-taf-git
- Platform-agnostic TAF updater (works in ANY CI/CD)
- Jest parser with comprehensive format support
- Standalone CLI mode (`npx faf-taf-git`)
- GitHub Action wrapper (`uses: Wolfe-Jam/faf-taf-git@v1`)
- Auto-commit functionality for .taf updates
- MCP-portable TAF core operations

### Architecture
- Core + wrappers design for universal CI/CD support
- Thin GitHub Action wrapper (60 lines)
- Platform-agnostic core (277 lines)
- Pure functions, no CI-specific dependencies

### Testing
- 7/7 unit tests passing
- Integration tested in faf-cli and claude-faf-mcp
- Jest parser handles all output formats

### Documentation
- Comprehensive README with platform examples
- CONTRIBUTING guide for developers
- CLAUDE.md project DNA
- .faf and .taf files (Golden Triangle complete)

### Platform Support
- GitHub Actions
- GitLab CI
- Bitbucket Pipelines
- Jenkins
- CircleCI
- Local development
- Any CI/CD that runs Node.js

[1.0.0]: https://github.com/Wolfe-Jam/faf-taf-git/releases/tag/v1.0.0
