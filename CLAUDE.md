<!-- faf:start -->
<!-- faf: taf-git | TypeScript | cli | A Test Receipt Printer for git. Every CI run prints a receipt to .taf: append-only, timestamped, kept in git. Proof over time. -->
<!-- faf: claim=project.faf | family=FAF -->

# CLAUDE.md — taf-git

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
- **Where:** https://github.com/Wolfe-Jam/taf-git
- **When:** Stable and in daily use since October 2025; since November 2026 red runs get FAILED receipts from a separate receipt job.
- **How:** The test job saves its output; a separate receipt job, the only one with write access, parses it (Jest, Vitest, Bun, WJTTC or JUnit XML), appends one receipt to .taf and pushes it to the taf-receipts branch from a temporary worktree, retrying when another run pushed first.

---

*STATUS: SYNC ACTIVE — 2026-11-17T06:36:28.879Z*
<!-- faf:end -->
