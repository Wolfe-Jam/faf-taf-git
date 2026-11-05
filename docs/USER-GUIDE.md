# FAF TAF Action - User Guide

## Introduction

The FAF TAF Action automatically maintains a `.taf` (Testing Activity Feed) file that tracks your test runs over time. This creates a permanent, git-tracked record of your project's test quality.

### The Golden Triangle

```
        .faf
      (WHAT IT IS)
         /    \
        /      \
       /        \
    repo    ←→   .taf
(IMPLEMENTATION) (PROOF IT WORKS)
```

- **.faf** - Project DNA that tells AI what your project is
- **repo** - Your actual implementation (code doesn't lie)
- **.taf** - Permanent proof that your code works (formats don't negotiate)

## Prerequisites

### 1. Install FAF CLI

```bash
npm install -g faf-cli
# or
brew install faf-cli
```

### 2. Initialize .taf File

In your project root:

```bash
faf taf init
```

This creates a `.taf` file that tracks your testing timeline.

### 3. Commit .taf to Git

```bash
git add .taf
git commit -m "feat: add testing timeline"
```

## Basic Setup

### Minimal Configuration

Add to `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run tests and update .taf
        uses: Wolfe-Jam/faf-taf-action@v1
```

That's it! The action will:
1. Run `npm test` (default)
2. Parse Jest output
3. Update `.taf` file
4. Commit changes automatically

## Advanced Configuration

### Custom Test Command

```yaml
- uses: Wolfe-Jam/faf-taf-action@v1
  with:
    test-command: 'npm run test:coverage'
```

### Custom Commit Message

```yaml
- uses: Wolfe-Jam/faf-taf-action@v1
  with:
    commit-message: 'test: update .taf timeline [skip ci]'
```

### Disable Auto-Commit

Handle commits yourself:

```yaml
- uses: Wolfe-Jam/faf-taf-action@v1
  id: taf
  with:
    auto-commit: false

- name: Custom commit logic
  if: steps.taf.outputs.taf-updated == 'true'
  run: |
    git add .taf
    git commit -m "test: $(date +'%Y-%m-%d') test results"
    git push
```

### Skipped Test Names

From 2.5.0 each receipt names the skipped tests (up to 25), with a hash of the full set and what changed since the previous receipt, so a skipped count that stays at 3 can't hide a different 3:

```yaml
    skipped_tests:
      names:
        - "a.test.ts > outer > skipped one"
      hash: sha256:…
      newly_skipped:
        - "a.test.ts > outer > skipped one"
```

Names come from JUnit XML (`<testcase>` with `<skipped/>`) and from Bun's output. Change how many are written, or turn it off:

```yaml
- uses: Wolfe-Jam/faf-taf-git@v2.6.0
  with:
    test-output-file: test-output.txt
    target-branch: taf-receipts
    skipped-names: 0   # off; default 25
```

The block is left off, with a one-line note in the log, when the output doesn't name every skipped test (Jest and Vitest print names only in verbose mode, for example). Let one job per branch write receipts, or the "newly skipped" list compares different suites.

## Using Outputs

The action provides several outputs you can use:

```yaml
- uses: Wolfe-Jam/faf-taf-action@v1
  id: taf

- name: Check test results
  run: |
    echo "Result: ${{ steps.taf.outputs.result }}"
    echo "Tests: ${{ steps.taf.outputs.passed }}/${{ steps.taf.outputs.total }}"

- name: Fail if tests failed
  if: steps.taf.outputs.result == 'FAILED'
  run: exit 1

- name: Celebrate improvement
  if: steps.taf.outputs.result == 'IMPROVED'
  run: echo "Tests are improving!"
```

### Available Outputs

- `result` - PASSED, FAILED, SKIPPED, IMPROVED, or DEGRADED
- `passed` - Number of passing tests
- `failed` - Number of failing tests
- `total` - Total test count
- `skipped` - Number of skipped tests
- `newly-skipped` - Skipped in this run but not in the previous receipt (2.5.0)
- `taf-updated` - Whether .taf was modified
- `receipt-pushed` - Whether the receipt reached the remote: `false` with `auto-commit: false`, with no upstream (a pull request checkout), or when the push failed

## Workflow Patterns

### Skip CI on .taf Updates

Prevent infinite loops:

```yaml
- uses: Wolfe-Jam/faf-taf-action@v1
  with:
    commit-message: 'test: update .taf [skip ci]'
```

### Only Update on Main Branch

```yaml
- uses: Wolfe-Jam/faf-taf-action@v1
  if: github.ref == 'refs/heads/main'
```

### Different Commands per Environment

```yaml
- uses: Wolfe-Jam/faf-taf-action@v1
  with:
    test-command: ${{ matrix.os == 'ubuntu-latest' && 'npm test' || 'npm run test:unit' }}
```

### Combine with Coverage

```yaml
- name: Run tests with coverage
  uses: Wolfe-Jam/faf-taf-action@v1
  with:
    test-command: 'npm run test:coverage'

- name: Upload coverage
  uses: codecov/codecov-action@v3
  if: always()
```

## Permissions

For auto-commit to work, ensure your workflow has write permissions:

```yaml
permissions:
  contents: write
```

If using a fine-grained PAT:

```yaml
- uses: actions/checkout@v4
  with:
    token: ${{ secrets.GITHUB_TOKEN }}

- uses: Wolfe-Jam/faf-taf-action@v1
```

## Troubleshooting

### "No .taf file found"

Run `faf taf init` in your project root and commit the file.

### "Could not parse test output"

Currently only Jest is supported. Check that your test command outputs Jest format.

### Tests pass but action fails

Check the action logs for parsing errors. The action needs the standard Jest summary line:

```
Tests: 173 passed, 173 total
```

### Commits not pushing

A receipt that can't be pushed is a warning with git's reason in the log, and `receipt-pushed` is `false`. Set `fail-on-push-error: true` to fail the step instead. With `target-branch`, a push still rejected after 5 tries always fails the step.

1. Verify `permissions: contents: write` in workflow
2. Check that `.taf` is not in `.gitignore`
3. On a busy branch, use `target-branch: taf-receipts`: a push another run beat is tried again, up to 5 times

### Action shows "up to date" but .taf wasn't updated

The action may have determined there were no changes. Check:
- Did tests actually run?
- Was there Jest output to parse?
- Check action logs for details

## Best Practices

### 1. Run on Every Push

Keep your .taf file current:

```yaml
on: [push, pull_request]
```

### 2. Use [skip ci] for .taf Commits

Prevent infinite loops:

```yaml
commit-message: 'test: update .taf [skip ci]'
```

### 3. Track .taf in Git

Never add `.taf` to `.gitignore`. It's meant to be tracked!

### 4. Review .taf Changes

When reviewing PRs, check .taf changes to see test quality trends.

### 5. Combine with .faf

Use both `.faf` (project context) and `.taf` (proof of quality) together for maximum value.

## Philosophy

### You Don't Negotiate with a Format

.taf files are structured data, not prose. They describe themselves. No interpretation needed.

### Software Accountability

Every test run becomes permanent, git-tracked proof that your code works (or doesn't). No hiding, no forgetting.

### The Format Describes Itself

Open your `.taf` file. You'll immediately understand what it tracks and why it matters.

## Learn More

- [.taf Format Specification](https://faf.one/docs/taf)
- [FAF CLI Documentation](https://faf.one/docs)
- [Example .taf Files](https://github.com/Wolfe-Jam/faf-cli/blob/main/.taf)
- [GitHub Discussions](https://github.com/Wolfe-Jam/faf/discussions)

## Support

- Report issues: [GitHub Issues](https://github.com/Wolfe-Jam/faf-taf-action/issues)
- Ask questions: [GitHub Discussions](https://github.com/Wolfe-Jam/faf/discussions)
- Email: team@faf.one

## License

MIT - Free forever, no strings attached.
