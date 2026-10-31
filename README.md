<!-- faf: faf-taf-git | TypeScript | cli | A Test Receipt Printer for git -->
<!-- faf: doc=readme | canonical=project.faf | score=100 | family=TAF -->

# faf-taf-git

[![TAF](./badge.svg)](https://github.com/Wolfe-Jam/faf-taf-git)
[![Claude Code](https://img.shields.io/badge/Claude_Code-enabled-00D4D4)](https://github.com/anthropics/claude-code-action)
[![Business card · Get yours →](https://wolfe-jam.github.io/agent-business-card/badge.svg)](https://wolfe-jam.github.io/agent-business-card/?repo=Wolfe-Jam/faf-taf-git)

**A receipt printer for your tests.**

Every time your tests run in CI, faf-taf-git writes a small receipt: when they ran, how many passed, failed and were skipped. The receipts are saved in your repo, one after another, on their own branch. Over time they show whether your tests really kept passing.

Anyone can get green once. Receipts show it over time.

`npm: faf-taf-git` · `GitHub Action: Wolfe-Jam/faf-taf-git` · MIT, free

## Why

- **Test results usually vanish.** CI shows today's run, then the log expires. Receipts stay.
- **You can look back.** When did that test start failing? Was main green before the last release?
- **Other people can check.** Users, reviewers, auditors and AI agents can read the history themselves instead of taking your word for it.

## What a receipt looks like

Receipts are saved in a file called `.taf`, on a branch called `taf-receipts`:

```yaml
- timestamp: 2026-10-29T20:28:58.090Z
  result: PASSED
  tests:
    total: 628
    passed: 621
    failed: 0
    skipped: 7
  trigger: github-actions
```

`result` is `PASSED` or `FAILED`. The full format is in [RECEIPT-FORMAT.md](./RECEIPT-FORMAT.md).

## Set it up (GitHub Actions)

Add this to a workflow, for example `.github/workflows/tests.yml`. Swap the install and test lines for your own.

```yaml
name: Tests

on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    permissions:
      contents: write              # lets the action save receipts

    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: '24.x'
      - run: npm ci

      - name: Run tests
        id: tests
        continue-on-error: true    # keep going, so a failed run still gets a receipt
        run: |
          set -o pipefail
          npm test 2>&1 | tee test-output.txt

      - name: Print the receipt
        if: github.ref == 'refs/heads/main' && github.event_name != 'pull_request'
        uses: Wolfe-Jam/faf-taf-git@v2.4.2
        with:
          test-output-file: test-output.txt
          target-branch: taf-receipts

      - name: Fail the job if the tests failed
        if: steps.tests.outcome == 'failure'
        run: exit 1
```

That's it. The first run creates the `taf-receipts` branch for you.

**Four things this recipe gets right:**

1. **Failed runs get a receipt too.** A red run is recorded as `FAILED`, not left out. A history with only green runs proves less.
2. **Only `main` gets receipts.** Pull requests and other branches still run the tests, but the record is about `main`.
3. **The job still goes red** when tests fail, so your checks stay honest.
4. **Tests run once.** The receipt reads the output of the run that just happened.

If your tests run on several operating systems, print the receipt from the one that runs the most tests.

## Works with your test runner

| Runner | What to give the action |
|---|---|
| **Python (pytest)** | `pytest --junitxml=report.xml`, then `test-output-file: report.xml` |
| **Any runner that writes JUnit XML** | the XML report file (Rust with `cargo nextest`, Go with `gotestsum --junitfile`, Java with Maven or Gradle, .NET, PHPUnit, Jest with `jest-junit`) |
| **Jest** | the console output (`npm test 2>&1 \| tee test-output.txt`) |
| **Vitest** | the console output |
| **Bun** | the console output of `bun test` |
| **WJTTC** | the console output |

JUnit XML is the common report format most test runners can write. If your runner isn't in the table, check whether it can write JUnit XML.

## Other CI systems

The command-line tool does the same job anywhere Node.js runs (GitLab, Jenkins, CircleCI, Bitbucket, Azure, your own machine):

```bash
npm test 2>&1 | tee test-output.txt
npx faf-taf-git --file test-output.txt --commit
```

`--commit` commits the updated `.taf` for you. Leave it off to just update the file.

## Read your receipts

```bash
git fetch origin taf-receipts
git show origin/taf-receipts:.taf
```

Make a badge for your README:

```bash
npx faf-taf-git badge --output badge.svg
```

## Settings

**Action inputs**

| Input | What it does | Default |
|---|---|---|
| `test-output-file` | The file with your test output or JUnit XML report | required |
| `target-branch` | The branch receipts are saved to. Use `taf-receipts`. | the current branch |
| `auto-commit` | Commit and push the receipt | `true` |
| `commit-message` | The commit message | `chore(taf): update .taf receipt [skip ci]` |

**Action outputs:** `result`, `passed`, `failed`, `skipped`, `total`, `taf-updated`. For example, `${{ steps.taf.outputs.passed }}`.

**Command-line options:** `--file`, `--commit`, `--message`, `--cwd`, `--verbose`. Run `npx faf-taf-git --help` for the full list.

## How hard is it to fake?

Receipts are written by CI from the real test output and saved in git. Editing or deleting an old receipt changes the git history, so anyone comparing the history can see it. The `taf-receipts` branch only ever grows: never rewrite, squash or force-push it.

A receipt proves the tests passed on that commit. It does not prove a published package was built from that exact commit.

## With FAF (optional)

faf-taf-git works on any git repo; you don't need anything else. If your project also uses [FAF](https://faf.one) (a `project.faf` file describing the project for AI), the two fit together: `project.faf` says what the project is, and `.taf` shows its tests kept passing.

## Upgrading from v1

v1 ran your tests inside the action. v2 reads a file your own test step wrote. Replace `test-command:` with a test step that saves its output, and point `test-output-file:` at that file (see the setup above).

## Develop

```bash
npm ci
npm test          # the test suite
npm run build     # rebuilds dist/, which the action runs
```

See [CONTRIBUTING.md](CONTRIBUTING.md) and [CHANGELOG.md](CHANGELOG.md).

## License

MIT. Free forever.

If faf-taf-git is useful to you, a star helps other people find it.
