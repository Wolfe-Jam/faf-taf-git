# FAF TAF Action

**Automatically update .taf (Testing Activity Feed) files with test results from GitHub Actions**

Part of the Golden Triangle: `.faf` (what it is) + `repo` (implementation) + `.taf` (proof it works)

## What is .taf?

`.taf` files are git-friendly testing timelines that track your test runs over time. They provide:

- Permanent, git-tracked proof of test quality
- Pass rate trends and failure patterns
- Integration with .faf project DNA
- No negotiation with formats - the format describes itself

## Quick Start

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: Wolfe-Jam/faf-taf-action@v1
        with:
          test-command: 'npm test'
```

That's it! The action will:
1. Run your tests
2. Parse the results (Jest supported)
3. Update your `.taf` file
4. Commit the changes automatically

## Prerequisites

You need a `.taf` file in your repository root. Create one with:

```bash
npm install -g faf-cli
faf taf init
```

## Inputs

### `test-command`
- **Description**: Command to run tests
- **Default**: `npm test`
- **Example**: `npm run test:ci`

### `auto-commit`
- **Description**: Automatically commit .taf updates
- **Default**: `true`
- **Example**: `false` (to handle commits yourself)

### `commit-message`
- **Description**: Custom commit message for .taf updates
- **Default**: `chore: update .taf with test results`
- **Example**: `test: update testing timeline [skip ci]`

## Outputs

### `result`
- Test result: `PASSED`, `FAILED`, `IMPROVED`, or `DEGRADED`

### `passed`
- Number of tests that passed

### `failed`
- Number of tests that failed

### `total`
- Total number of tests

### `taf-updated`
- Whether .taf file was updated (`true` or `false`)

## Example: Using Outputs

```yaml
- uses: Wolfe-Jam/faf-taf-action@v1
  id: taf
  with:
    test-command: 'npm test'

- name: Check results
  run: |
    echo "Result: ${{ steps.taf.outputs.result }}"
    echo "Tests: ${{ steps.taf.outputs.passed }}/${{ steps.taf.outputs.total }} passing"
```

## Example: Custom Workflow

```yaml
name: Advanced Testing

on: [push]

jobs:
  test:
    runs-on: ubuntu-latest

    permissions:
      contents: write  # Required for auto-commit

    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run tests and update .taf
        uses: Wolfe-Jam/faf-taf-action@v1
        id: taf
        with:
          test-command: 'npm run test:coverage'
          commit-message: 'test: update .taf [skip ci]'

      - name: Fail if tests failed
        if: steps.taf.outputs.result == 'FAILED'
        run: exit 1
```

## Supported Test Frameworks

Currently supported:
- **Jest** (automatic detection)

Coming soon:
- Mocha
- Vitest
- Pytest
- Go test

## How It Works

1. **Run Tests**: Executes your test command
2. **Parse Output**: Extracts test counts from CLI output
3. **Update .taf**: Appends results to your .taf file
4. **Commit**: Pushes changes back to repo (optional)

## The Golden Triangle

```
        .faf
      (WHAT IT IS)
         /    \
        /      \
       /        \
    repo    ←→   .taf
(IMPLEMENTATION) (PROOF IT WORKS)
```

Projects that work this way are engineered to succeed.

## Permissions

For auto-commit to work, ensure your workflow has write permissions:

```yaml
permissions:
  contents: write
```

## Skip CI

To prevent infinite loops, add `[skip ci]` to your commit message:

```yaml
- uses: Wolfe-Jam/faf-taf-action@v1
  with:
    commit-message: 'chore: update .taf [skip ci]'
```

## Philosophy

> You don't negotiate with a format. The format describes itself.

`.taf` is about software accountability - permanent, git-tracked proof that your code works. No prose, no interpretation, just facts.

## Learn More

- [FAF Format Specification](https://faf.one/docs)
- [.taf Documentation](https://faf.one/docs/taf)
- [CLI Installation](https://npmjs.com/package/faf-cli)

## License

MIT
