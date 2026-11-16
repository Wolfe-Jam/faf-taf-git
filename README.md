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

`result` is `PASSED`, `FAILED` or `SKIPPED` (every test skipped). The full format is in [RECEIPT-FORMAT.md](./RECEIPT-FORMAT.md).

When tests are skipped, the receipt also names them (up to 25), with a hash of the full set and what changed since the previous receipt. A skipped count that stays at 7 can't hide a different 7:

```yaml
  skipped_tests:
    names:
      - "auth.test.ts > login > uses the refresh token"
    hash: sha256:…
    newly_skipped:
      - "auth.test.ts > login > uses the refresh token"
```

Names come from JUnit XML reports and Bun's output. Other formats keep the count only.

## Set it up (GitHub Actions)

Two jobs: your test job runs the tests and uploads their output; a receipt job reads that output and saves the receipt. [faf-cli](https://github.com/Wolfe-Jam/faf-cli)'s CI uses the same two jobs. Add it to a workflow, for example `.github/workflows/tests.yml`, and swap the install and test lines for your own.

```yaml
name: Tests

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    permissions:
      contents: read               # the tests never run with write access

    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: '24.x'
      - run: npm ci

      - name: Run tests
        run: |
          set -o pipefail
          npm test 2>&1 | tee test-output.txt

      - name: Upload the test output
        if: ${{ !cancelled() }}    # a failed run uploads too
        uses: actions/upload-artifact@v7
        with:
          name: test-output
          path: test-output.txt

  receipt:
    needs: test
    # runs when the tests failed too; only for pushes to main
    if: ${{ !cancelled() && github.event_name == 'push' && github.ref == 'refs/heads/main' }}
    permissions:
      contents: write              # lets this job, and only this job, save receipts
    uses: Wolfe-Jam/faf-taf-git/.github/workflows/receipt.yml@v2.7.0
    with:
      artifact-name: test-output
      test-output-file: test-output.txt
```

That's it. The first run creates the `taf-receipts` branch for you.

**Five things this setup gets right:**

1. **Failed runs get a receipt too.** A red run is recorded as `FAILED`, not left out. A history with only green runs proves less.
2. **Only `main` gets receipts.** Pull requests still run the tests, but the record is about `main`. A pull request from a fork gets a read-only token, so it could not save a receipt anyway.
3. **The test job goes red** when tests fail, with no extra steps: it runs the tests the normal way.
4. **Tests run once.** The receipt reads the output of the run that just happened.
5. **Only the receipt job can write.** Your test code runs with a read-only token.

Give the `receipt` job `permissions: contents: write`: a reusable workflow gets no more access than the job that calls it.

**Reusable workflow inputs**

| Input | What it does | Default |
|---|---|---|
| `artifact-name` | The artifact your test job uploaded | required |
| `test-output-file` | The file inside that artifact: the test output or JUnit XML report | required |
| `target-branch` | The branch receipts are saved to | `taf-receipts` |
| `skipped-names` | How many skipped test names each receipt carries. `0` turns it off | `25` |
| `runs-on` | The runner for the receipt job | `ubuntu-latest` |
| `commit-message` | The commit message for each receipt | `chore(taf): update .taf receipt [skip ci]` |

If the tests never ran (the build failed first), there is no test output to download: the receipt job says so in a notice and writes no receipt, without failing.

Its outputs are the action's outputs (see [Settings](#settings)), for example `${{ needs.receipt.outputs.result }}`.

### One job instead

If you want a single job, use the action as a step. The job needs `contents: write`, so your tests run with write access too.

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    permissions:
      contents: write              # lets the action save receipts

    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: '24.x'
      - run: npm ci

      - name: Run tests
        # on main: keep going, so a failed run still gets a receipt
        continue-on-error: ${{ github.ref == 'refs/heads/main' && github.event_name != 'pull_request' }}
        run: |
          set -o pipefail
          npm test 2>&1 | tee test-output.txt

      - name: Print the receipt
        if: github.ref == 'refs/heads/main' && github.event_name != 'pull_request'
        uses: Wolfe-Jam/faf-taf-git@v2.7.0
        with:
          test-output-file: test-output.txt
          target-branch: taf-receipts
          fail-on-failed-tests: 'true'   # receipt first, then the step fails if tests failed
```

On `main` the test step keeps going when tests fail, the receipt is saved as `FAILED`, and `fail-on-failed-tests` turns the job red. Everywhere else the test step fails the job itself.

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

**Maven and Gradle write one XML file per test class.** Join them into one file first, or the receipt covers a single class, and one class's file can read PASSED for a run that failed:

```bash
cat target/surefire-reports/TEST-*.xml > report.xml     # Maven
cat build/test-results/test/TEST-*.xml > report.xml     # Gradle
```

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
| `target-branch` | The branch receipts are saved to. Use `taf-receipts`. Written in a separate worktree, so your checkout isn't touched. | the current branch |
| `auto-commit` | Commit and push the receipt | `true` |
| `commit-message` | The commit message | `chore(taf): update .taf receipt [skip ci]` |
| `skipped-names` | How many skipped test names each receipt carries. `0` turns it off | `25` |
| `fail-on-push-error` | Fail the step when the receipt can't be pushed to the current branch (a warning otherwise). A push another run beat is tried again first, up to 5 times. With `target-branch`, a push that fails after 5 tries always fails | `false` |
| `fail-on-failed-tests` | Fail the step when the run had failing tests, after the receipt is saved and the outputs are set | `false` |

**Action outputs:** `result`, `passed`, `failed`, `skipped`, `newly-skipped`, `total`, `taf-updated`, `receipt-pushed`. For example, `${{ steps.taf.outputs.passed }}`.

**Command-line options:** `--file`, `--commit`, `--message`, `--cwd`, `--verbose` (`--name value` or `--name=value`). With `--commit`, a push that fails exits 1. Run `npx faf-taf-git --help` for the full list.

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
