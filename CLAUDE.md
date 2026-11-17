<!-- faf:start -->
<!-- faf: faf-taf-git | TypeScript | cli | A Test Receipt Printer for git. Every CI run prints a receipt to .taf: append-only, timestamped, kept in git. Proof over time. -->
<!-- faf: claim=project.faf | family=FAF -->

# CLAUDE.md — faf-taf-git

## What This Is

A Test Receipt Printer for git. Every CI run prints a receipt to .taf: append-only, timestamped, kept in git. Proof over time.

## Stack

- **Language:** TypeScript
- **Hosting:** npm registry + GitHub Actions Marketplace
- **Build:** TypeScript (tsc)
- **CI/CD:** GitHub Actions

## Context

- **Who:** Maintainers and teams who want proof their tests kept passing on main, and the reviewers, auditors and AI agents who check it
- **What:** A Test Receipt Printer for git. Every CI run prints a receipt to .taf: append-only, timestamped, kept in git. Proof over time.
- **Why:** Test results vanish when CI logs expire. Receipts stay in git, so anyone can look back and check whether main was green before a release.
- **Where:** https://github.com/Wolfe-Jam/faf-taf-git
- **When:** v2.6.0 (2026-11-05) Safe Receipts Edition, receipts never lost and the checkout never touched (worktree, lock, byte-for-byte .taf); v2.5.0 (2026-11-05) Named Skips Edition, receipts name the skipped tests (skipped_tests, RECEIPT-FORMAT v1.1); v2.4.6 (2026-11-03), no build-machine paths in the package + "no tests ran" message; v2.4.5 (2026-11-02) node:test JUnit counted by testcase; v2.4.4 (2026-11-01) SKIPPED result + honest badge count + true trigger; v2.4.3 (2026-10-31) push-race retry + JUnit skipped count; v2.4.2 undici security fix + CLI-only npm package; v2.4.1 --version fix; v2.4.0 (2026-10-29) JUnit XML parser; live since v1.0.0 (2025-10-27)
- **How:** The test job saves its output; a separate receipt job, the only one with write access, parses it (Jest, Vitest, Bun, WJTTC or JUnit XML), appends one receipt to .taf and pushes it to the taf-receipts branch from a temporary worktree, retrying when another run pushed first.

---

*STATUS: SYNC ACTIVE — 2026-11-17T06:30:10.302Z*
<!-- faf:end -->
