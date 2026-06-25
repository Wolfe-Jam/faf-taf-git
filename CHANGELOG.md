<!-- faf: faf-taf-git | TypeScript | cli | A Test Receipt Printer for git -->
<!-- faf: doc=changelog | latest=v2.2.2 | canonical=project.faf | family=TAF -->

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
