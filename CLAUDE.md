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
- **When:** v2.4.0 (2026-10-29), JUnit XML parser; live since v1.0.0 (2025-10-27)
- **How:** Run tests, save the output (or a JUnit XML report), then `uses: Wolfe-Jam/faf-taf-git@v2.4.0` with `target-branch: taf-receipts`. Anywhere else: `npx faf-taf-git --file test-output.txt --commit`. The taf-receipts branch only grows: never rewrite it.

---

*STATUS: SYNC ACTIVE — 2026-10-29T21:43:51.901Z*
<!-- faf:end -->
