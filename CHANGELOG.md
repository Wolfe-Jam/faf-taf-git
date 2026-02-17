# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
