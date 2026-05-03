# faf-taf-git

[![TAF](./badge.svg)](https://github.com/Wolfe-Jam/faf-taf-git)
[![Claude Code](https://img.shields.io/badge/Claude_Code-enabled-00D4D4)](https://github.com/anthropics/claude-code-action)

> **Q: What does TAF do?** A: It prints Receipts.
> **Q: What sort of Receipts?** A: Test Receipts.
> **Q: Why do I need Test Receipts?** A: Proof over time.
>
> *Bonus: Cannot be gamed.*

**TAF is a Receipt Printer.** Every CI run prints a receipt to `.taf`. The receipts accumulate on a git branch. The history is append-only. The proof is permanent.

`npm: faf-taf-git` · `action: Wolfe-Jam/faf-taf-git`

Part of the **CAR Framework**: **C**laim (`.faf`) → **A**udit (WJTTC) → **R**eceipt (`.taf`).

---

## 🎯 WHAT

**A Test Receipt Printer for git.** Every CI run produces one receipt — timestamp, counts, result, trigger — appended to `.taf` on the `taf-receipts` branch. The timeline is the proof.

**Example Test Receipt:**
```yaml
- timestamp: 2026-02-17T19:12:14.810Z
  result: PASSED
  tests:
    total: 808
    passed: 799
    failed: 0
    skipped: 9
  trigger: github-actions
```

**Every field maps to a real receipt:** timestamp = receipt date, tests = itemized lines, result = total, trigger = cashier/register, run_id = receipt number, project = vendor, format_version = receipt template.

**What you get:**
- **Proof over time** — longitudinal evidence, not snapshots
- **Pattern detection** — pass-rate trends, regression vs new failure
- **AI-readable** — feeds into `.faf` project DNA
- **Platform-agnostic** — works in ANY CI/CD (GitHub Actions, GitLab, Jenkins, CircleCI, Bitbucket, Azure, local, pre-commit)
- **Git-native** — no external services, no SaaS lock-in
- **Cannot be gamed** — git SHA detects edits, append-only history detects deletions, CI sandbox prevents output forgery

---

## 👥 WHO

**For development teams who need:**
- Proof of testing over time (not just current state)
- Git-tracked test accountability (visible in PRs, commits, history)
- AI-readable test context (feeds into `.faf` project DNA)
- Platform-agnostic testing receipts (works in ANY CI/CD)

**Use cases:**
- Open source projects (prove your tests pass)
- Regulated industries (auditable test history)
- AI-augmented development (give AI your test timeline)
- Championship engineering (F1-grade accountability)

---

## 🤔 WHY

### The Problem
Tests run, results disappear. No permanent record. No accountability.

**Before:**
```
✅ Tests passing (right now)
❓ Were they passing yesterday?
❓ When did that flaky test start failing?
❓ What's the trend over time?
```

**After (with .taf):**
```
✅ Tests passing (tracked in git)
✅ History shows: 99% pass rate over 30 days
✅ Flaky test identified: started failing Feb 10
✅ Trend: improving (was 85%, now 99%)
```

### The Solution
**Git-native receipts.** Every test run becomes a permanent, auditable record.

`.taf` is software accountability - proof that your code works, tracked over time, visible to everyone.

---

## 📍 WHERE

Works in **ANY CI/CD** environment that runs Node.js:

| Platform | Status | Example |
|----------|--------|---------|
| **GitHub Actions** | ✅ Tested | See Quick Start |
| **GitLab CI** | ✅ Tested | `npx faf-taf-git --commit` |
| **Jenkins** | ✅ Compatible | `sh 'npx faf-taf-git --commit'` |
| **CircleCI** | ✅ Compatible | `run: npx faf-taf-git --commit` |
| **Bitbucket Pipelines** | ✅ Compatible | `npx faf-taf-git --commit` |
| **Travis CI** | ✅ Compatible | `npx faf-taf-git --commit` |
| **Azure Pipelines** | ✅ Compatible | `npx faf-taf-git --commit` |
| **Local development** | ✅ Works | `npm test && npx faf-taf-git` |
| **Pre-commit hooks** | ✅ Works | See Examples |

**Architecture:** Platform-agnostic core. No CI-specific dependencies. Pure functions.

---

## ⏰ WHEN

**Use faf-taf-git when you need:**

1. **Proof of testing over time**
   - Regulated industries (SOC 2, ISO, HIPAA)
   - Open source credibility (show your tests pass)
   - Client deliverables (prove quality)

2. **AI-augmented development**
   - Give AI your test history (feeds `.faf` format)
   - AI can see: "Tests were 85% passing, now 99%"
   - Better context = better AI assistance

3. **Debugging flaky tests**
   - Timeline shows when tests started failing
   - Pattern detection (fails on Windows only, etc.)
   - Root cause analysis with historical data

4. **Team accountability**
   - PRs show test impact (IMPROVED, DEGRADED, etc.)
   - No hiding broken tests
   - Git history = test history

**Don't use when:**
- You only need current test status (use a test reporter)
- You don't commit to git (TAF is git-native)
- You're not ready for accountability 😉

---

## 🚀 HOW

### Quick Start (GitHub Actions)

**Step 1:** Create `.taf` file
```bash
npm install -g faf-cli
faf taf init
```

**Step 2:** Add to CI workflow
```yaml
name: Tests

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    permissions:
      contents: write  # Required for auto-commit

    steps:
      - uses: actions/checkout@v6

      - name: Setup Node.js
        uses: actions/setup-node@v6
        with:
          node-version: '20.x'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Run Tests and Capture Output
        run: npm test 2>&1 | tee test-output.txt

      - name: Generate TAF Receipt
        uses: Wolfe-Jam/faf-taf-git@v2.0.4
        with:
          test-output-file: test-output.txt
          auto-commit: 'true'
          commit-message: 'chore(taf): update .taf receipt [skip ci]'
```

**Step 3:** Push and watch
- Tests run automatically
- `.taf` file updates with new entry
- Changes committed back to repo
- History tracked in git

### Standalone CLI (Any Platform)

```bash
# Run tests and update .taf
npm test 2>&1 | tee test-output.txt
npx faf-taf-git --file test-output.txt --commit

# Or in one command (legacy v1.x CLI)
npx faf-taf-git --command "npm test" --commit
```

### GitLab CI

```yaml
test:
  script:
    - npm ci
    - npm test 2>&1 | tee test-output.txt
    - npx faf-taf-git --file test-output.txt --commit --message "ci: update .taf [skip ci]"
```

### Jenkins

```groovy
stage('Test') {
  steps {
    sh 'npm ci'
    sh 'npm test 2>&1 | tee test-output.txt'
    sh 'npx faf-taf-git --file test-output.txt --commit'
  }
}
```

### Local Development

```bash
# Run tests and update .taf (no commit)
npm test 2>&1 | tee test-output.txt
npx faf-taf-git --file test-output.txt --verbose

# Pre-commit hook
#!/bin/bash
npm test 2>&1 | tee test-output.txt && npx faf-taf-git --file test-output.txt
```

---

## 🎨 HOW IT WORKS

### v2.0.0+ Architecture (Pre-Capture Pattern)

```
Step 1: Run Tests              Step 2: Generate Receipt
┌─────────────────────┐        ┌──────────────────────┐
│ npm test 2>&1 |     │        │ faf-taf-git reads    │
│ tee test-output.txt │───────▶│ test-output.txt and  │
│                     │        │ updates .taf file    │
└─────────────────────┘        └──────────────────────┘
```

**Why separate steps?**
- Avoids GitHub Actions execution context corruption
- More reliable (tested 19 methods before this breakthrough)
- Platform-agnostic (works in ANY CI/CD)
- Simpler architecture (400+ lines removed)

**Process:**
1. **Capture output** - `npm test 2>&1 | tee test-output.txt`
2. **Parse results** - Extracts test counts from Jest output
3. **Update .taf** - Appends new test run to timeline
4. **Commit** - Optionally commits changes to git

---

## 📋 API

### GitHub Action Inputs

| Input | Description | Default | Required |
|-------|-------------|---------|----------|
| `test-output-file` | Path to file containing test output | - | ✅ Yes |
| `auto-commit` | Automatically commit .taf updates | `true` | No |
| `commit-message` | Custom commit message | `chore(taf): update .taf receipt [skip ci]` | No |

### GitHub Action Outputs

| Output | Description | Example |
|--------|-------------|---------|
| `result` | Test result | `PASSED`, `FAILED`, `IMPROVED`, `DEGRADED` |
| `passed` | Number of tests passed | `799` |
| `failed` | Number of tests failed | `0` |
| `total` | Total number of tests | `808` |
| `skipped` | Number of skipped tests | `9` |
| `taf-updated` | Whether .taf was updated | `true` or `false` |

### CLI Options

```bash
npx faf-taf-git [options]

Options:
  --file <path>       Path to test output file (v2.0.0+)
  --command <cmd>     Test command to run (legacy v1.x)
  --commit            Auto-commit .taf changes
  --message <msg>     Custom commit message
  --cwd <dir>         Working directory
  --verbose, -v       Verbose output
  --help, -h          Show help
```

---

## 🧪 Test Framework Support

| Framework | Status | Notes |
|-----------|--------|-------|
| **Jest** | ✅ Fully supported | All output formats |
| **Vitest** | ✅ Fully supported | Including todo counts |
| Mocha | ⏳ Planned | - |
| Pytest | ⏳ Planned | - |
| Go test | ⏳ Planned | - |
| Rust cargo test | ⏳ Planned | - |

---

## 🎓 Examples

### Using Outputs

```yaml
- name: Generate TAF Receipt
  id: taf
  uses: Wolfe-Jam/faf-taf-git@v2.0.4
  with:
    test-output-file: test-output.txt

- name: Check Results
  run: |
    echo "Result: ${{ steps.taf.outputs.result }}"
    echo "Tests: ${{ steps.taf.outputs.passed }}/${{ steps.taf.outputs.total }} passing"
    if [ "${{ steps.taf.outputs.result }}" == "DEGRADED" ]; then
      echo "⚠️ Test quality degraded!"
      exit 1
    fi
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
      - run: npm test 2>&1 | tee test-output.txt
      - run: npx faf-taf-git --file test-output.txt --commit
```

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Run tests and capture output
npm test 2>&1 | tee test-output.txt
TEST_EXIT=$?

# Update .taf (don't commit yet - that's what the commit is for!)
npx faf-taf-git --file test-output.txt

# Exit with test status
exit $TEST_EXIT
```

---

## 🏆 The Golden Triangle

Projects with `.faf` + `repo` + `.taf` are **engineered to succeed**:

```
       .faf
     (WHAT IT IS)
         /    \
        /      \
       /        \
    repo    ←→   .taf
(IMPLEMENTATION) (PROOF IT WORKS)
```

- **.faf** - Tells AI what the repo is (better than prose)
- **repo** - The implementation (code doesn't lie)
- **.taf** - Proves it works (receipts don't negotiate)

**Why this matters:**
- AI reads `.faf` to understand your project
- AI reads `.taf` to understand test quality
- Better context = better AI assistance
- Accountability built in

---

## 🔧 Development

### Build
```bash
npm run build
```

### Test
```bash
npm test
```

### Package (GitHub Action)
```bash
npm run package  # Creates bundled dist/index.js
```

### Test Locally
```bash
npm run build
node dist/cli.js --help
```

---

## 📖 Migration from v1.x

**v2.0.0 is a breaking change** - the architecture was redesigned for reliability.

### What Changed

**v1.x (test-command):**
```yaml
- uses: Wolfe-Jam/faf-taf-git@v1
  with:
    test-command: npm test
```

**v2.x (test-output-file):**
```yaml
- run: npm test 2>&1 | tee test-output.txt

- uses: Wolfe-Jam/faf-taf-git@v2.0.4
  with:
    test-output-file: test-output.txt
```

### Why the Change

v1.x ran tests inside the action using `@actions/exec`. This caused:
- GitHub Actions execution context corruption
- Logging failures (tested 19 different methods)
- Filesystem operations failing silently
- Unreliable receipt generation

v2.0.0 uses **pre-capture pattern** - separate test execution from receipt generation. This is:
- ✅ More reliable (no execution context issues)
- ✅ Platform-agnostic (works everywhere)
- ✅ Simpler (400+ lines removed, 11KB smaller)
- ✅ Production-ready (tested thoroughly)

### Migration Steps

1. Update workflow to use `test-output-file` instead of `test-command`
2. Add test output capture step: `npm test 2>&1 | tee test-output.txt`
3. Update version to `@v2.0.4`

See [CHANGELOG.md](CHANGELOG.md) for complete version history.

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

---

## 📚 Learn More

- [FAF CLI](https://npmjs.com/package/faf-cli) - Create and manage `.faf` files
- [MCP Server](https://npmjs.com/package/claude-faf-mcp) - Claude MCP integration
- [Website](https://faf.one) - Official FAF website
- [GitHub Discussions](https://github.com/Wolfe-Jam/faf/discussions) - Ask questions

---

If `faf-taf-git` has been useful, consider starring the repo — it helps others find it.

## 📄 License

MIT - FREE FOREVER

---

## 💎 Philosophy

**Software Accountability**

This tool implements a paradigm shift:

**Before:** Tests run → results disappear → no permanent record

**After:** Tests run → `.taf` updated → git-tracked forever

`.taf` is about accountability. Proof that your code works. Tracked over time. Visible to everyone.

**Built with championship standards. F1-inspired engineering. Methodically tested.**

*Platform-agnostic core. Works everywhere. Trust the format.*
