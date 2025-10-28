# faf-taf-git

**Platform-agnostic TAF (Testing Activity Feed) updater - works in ANY CI/CD**

Part of the Golden Triangle: `.faf` (what it is) + `repo` (implementation) + `.taf` (proof it works)

## What is .taf?

`.taf` files are git-friendly testing timelines that track your test runs over time. They provide:

- Permanent, git-tracked proof of test quality
- Pass rate trends and failure patterns
- Integration with .faf project DNA
- No negotiation with formats - the format describes itself

## Architecture

**faf-taf-git** is the **core package** with platform-agnostic TAF operations.

```
faf-taf-git (CORE)
├── Platform-agnostic TAF operations
├── Works standalone: npx faf-taf-git
├── Pure functions, no CI dependencies
└── Published to npm

Can be used:
├── As standalone CLI
├── As GitHub Action (built-in wrapper)
├── As GitLab CI component (future)
├── As library in your own tools
└── In ANY CI/CD that runs Node.js
```

## Quick Start

### Standalone CLI (Works Everywhere)

```bash
# Run tests and update .taf
npx faf-taf-git

# Custom test command
npx faf-taf-git --command "npm run test:unit"

# Auto-commit changes
npx faf-taf-git --commit

# Verbose output
npx faf-taf-git --verbose
```

### GitHub Actions

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: Wolfe-Jam/faf-taf-git@v1
        with:
          test-command: 'npm test'
```

### GitLab CI

```yaml
test:
  script:
    - npm install
    - npx faf-taf-git --commit
```

### Local Development

```bash
npm test && npx faf-taf-git --verbose
```

## Prerequisites

You need a `.taf` file in your repository root. Create one with:

```bash
npm install -g faf-cli
faf taf init
```

## CLI Options

### `--command <cmd>`
- Test command to run
- Default: `npm test`
- Example: `--command "npm run test:ci"`

### `--commit`
- Auto-commit .taf changes to git
- Default: false
- Example: `--commit`

### `--message <msg>`
- Custom commit message
- Default: `chore: update .taf with test results`
- Example: `--message "test: update TAF [skip ci]"`

### `--cwd <dir>`
- Working directory
- Default: current directory
- Example: `--cwd /path/to/project`

### `--verbose, -v`
- Verbose output
- Default: false

### `--help, -h`
- Show help message

## GitHub Action Inputs/Outputs

When used as a GitHub Action, the same options are available as inputs:

### Inputs

- `test-command` - Command to run tests (default: `npm test`)
- `auto-commit` - Auto-commit .taf updates (default: `true`)
- `commit-message` - Custom commit message

### Outputs

- `result` - Test result: `PASSED`, `FAILED`, `IMPROVED`, or `DEGRADED`
- `passed` - Number of tests that passed
- `failed` - Number of tests that failed
- `total` - Total number of tests
- `taf-updated` - Whether .taf file was updated (`true` or `false`)

## Platform Support

Works in ANY CI/CD environment that runs Node.js:

- ✅ GitHub Actions
- ✅ GitLab CI
- ✅ Bitbucket Pipelines
- ✅ Jenkins
- ✅ CircleCI
- ✅ Travis CI
- ✅ Azure Pipelines
- ✅ Local development
- ✅ Pre-commit hooks

## Examples

### GitHub Actions with Outputs

```yaml
- uses: Wolfe-Jam/faf-taf-git@v1
  id: taf
  with:
    test-command: 'npm test'

- name: Check results
  run: |
    echo "Result: ${{ steps.taf.outputs.result }}"
    echo "Tests: ${{ steps.taf.outputs.passed }}/${{ steps.taf.outputs.total }} passing"
```

### GitLab CI

```yaml
stages:
  - test

test:
  stage: test
  script:
    - npm ci
    - npx faf-taf-git --commit --message "ci: update .taf [skip ci]"
```

### Jenkins

```groovy
stage('Test') {
  steps {
    sh 'npm ci'
    sh 'npx faf-taf-git --commit'
  }
}
```

### CircleCI

```yaml
version: 2.1

jobs:
  test:
    docker:
      - image: node:20
    steps:
      - checkout
      - run: npm ci
      - run: npx faf-taf-git --commit
```

### Local Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

npm test && npx faf-taf-git
```

## Test Framework Support

Currently supports:
- ✅ Jest (all output formats)

Coming soon:
- ⏳ Mocha
- ⏳ Vitest
- ⏳ Pytest
- ⏳ Go test
- ⏳ Rust cargo test

## How It Works

1. **Runs your test command** - Executes the test command and captures output
2. **Parses test results** - Extracts test counts from output
3. **Updates .taf file** - Appends new test run to timeline
4. **Commits changes** - Optionally commits .taf to git

All operations are **platform-agnostic** - no CI-specific code.

## The Golden Triangle

Projects that implement `.faf` + `repo` + `.taf` are **engineered to succeed**:

```
       .faf
     (WHAT IT IS)
         /    \
        /      \
       /        \
    repo    ←→   .taf
(IMPLEMENTATION) (PROOF IT WORKS)
```

- **.faf** tells AI what the repo is (better than any prose)
- **repo** is the implementation (code doesn't lie)
- **.taf** proves it works (formats don't negotiate)

## Philosophy: Software Accountability

This tool implements a paradigm shift in how we think about testing:

**Before:** Tests run, results disappear, no permanent record

**After:** Every test run is git-tracked, auditable, permanent

`.taf` is about accountability - proof that your code works, tracked over time, visible to everyone.

## Development

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Test CLI Locally

```bash
npm run build
node dist/cli.js --help
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

MIT - FREE FOREVER

## Learn More

- [FAF CLI](https://npmjs.com/package/faf-cli)
- [MCP Server](https://npmjs.com/package/claude-faf-mcp)
- [Website](https://faf.one)
- [GitHub Discussions](https://github.com/Wolfe-Jam/faf/discussions)

---

**Built with championship standards. F1-inspired engineering. Methodically tested.**

*Platform-agnostic core. Works everywhere. Trust the format.*
