# .taf — Test Receipt Format
**v1.0 · TAF = Testing AI Format · tagline: "Test Receipts"**

> **Proof Over Time.** Anyone can get green **once.** TAF proves it **over time** — an append-only Test Receipt on every CI run, git-anchored and tamper-evident. Solid engineering shows in the timeline; everything else gets exposed.

*The canonical `.taf` file format. This repo (`faf-taf-git`) is the receipt printer; this spec pins the file it writes.*

---

## What a `.taf` is

A **Receipt Printer for git.** Every CI run prints one receipt — timestamp, counts, result, trigger — appended to a `.taf` file. The receipts accumulate on a `taf-receipts` branch. The history is append-only. **The proof is the timeline, not any single run.**

- **Standalone.** Works on any git repo. No FAF required — install the action, get receipts.
- **Git-native + portable.** The receipt lives *in the repo*, versioned — it survives a CI-vendor migration, which vendor-locked run history does not.
- **The unique value:** a one-time green is a snapshot (gameable); *"1,847 receipts over 14 months, none missing"* is proof. The format exists to make that timeline portable and falsifiable — nothing more. Thinness is the point.

## Cannot be gamed — tamper-*evident* (stated honestly)

Three mechanisms make tampering **visible**:
- **Edits** → the commit SHA changes; a rewritten receipt no longer matches its commit.
- **Deletions** → append-only history on the `taf-receipts` branch makes a removed run a gap you can see.
- **Forgery** → receipts are written in the CI sandbox from real test output, never by hand.

**Honest boundary: tamper-*evident*, not tamper-*proof*.** A maintainer can still decline to run CI on a red commit, or force-push the branch — but those leave *evidence* (missing receipts, a rewritten history). The audit claim is **"none missing,"** not "cannot fail."

## The receipt — pinned schema

What `faf-taf-git` writes today. Minimal by design.

```yaml
format_version: "1.0.0"        # receipt-template version
project: my-repo               # repo / "vendor"
created: 2026-06-28T09:00:00Z  # ISO 8601 UTC
last_updated: 2026-06-28T09:05:00Z  # ISO 8601 UTC — bumped on each append

test_history:                  # append-only, oldest → newest
  - timestamp: 2026-06-28T09:05:00Z   # ISO 8601 UTC — the receipt date
    result: PASSED                    # PASSED | FAILED | IMPROVED | DEGRADED
    tests:                            # itemized lines (nested)
      total: 7
      passed: 7
      failed: 0
      skipped: 0                      # optional
    trigger: github-actions           # optional — what fired the run
    command: npm test                 # optional — the command run
```

**Field rules**

| field | rule | notes |
|---|---|---|
| `test_history[]` | **required** | the spine — the one hard parse requirement; append-only, never edit a past entry |
| `…timestamp` | **required** | ISO 8601 UTC |
| `…result` | **required** | enum: `PASSED` \| `FAILED` \| `IMPROVED` \| `DEGRADED` |
| `…tests{total,passed,failed}` | **required** | nested; `skipped` optional |
| `…trigger` / `…command` | optional | provenance of the run |
| `format_version` `project` `created` `last_updated` | writer-emitted | the canonical writer always emits these; readers tolerate their absence |

**Optional FAF tenant fields (the CAR use case):** a receipt may carry `faf_associated`, `faf_location`, `faf_score` — so it records not just *did tests pass* but *what the project's AI-readiness was when they did*. Optional; absent ≠ invalid.

**Deprecated variants — do NOT emit:** early `.taf` files used `format:`/`version:` headers and *flat* `passed:`/`failed:` per run. Canonical is `format_version`/`project` + *nested* `tests`. Readers MAY accept the old shape; writers MUST emit canonical.

## Where it fits — interoperate, don't compete

`.taf` is a thin git-native **timeline**, not a rival to per-run formats:

- **JUnit XML / TAP** describe **one** run, inside CI. `.taf` is the **portable record across runs**, in the repo. `faf-taf-git` parses Jest/Vitest/JUnit output → appends a receipt.
- **SLSA / in-toto** attest build provenance to a side store. `.taf` keeps **test** provenance **in the repo** — human-readable, vendor-neutral, offline-readable.
- Position: `.taf` is the **lowest-friction, in-repo, vendor-neutral proof-over-time** layer. Where a heavier provenance standard is already in play, `.taf` complements it.

## The CAR Framework

TAF is the **Receipt** in a closed loop — it doesn't stand alone in the FAF world, and doesn't require FAF outside it:
- **FAF** = the **Claim** (project DNA / AI-readiness)
- **WJTTC** = the **Audit** (deep test analysis)
- **TAF** = the **Receipt** (append-only proof the tests ran)

FAF is **one tenant** of the printer, not a precondition.

## Honest scope — who actually needs this

**Yes:** OSS maintainers proving honest history · regulated/audit work (SOC 2 / ISO / HIPAA) needing append-only trails · supply-chain verifiers · **AI-agent accountability** (CI-sandbox receipts an agent can't silently edit) · FAF projects completing CAR.
**Probably not:** the median dev whose CI badge already says enough. *If you have to ask whether you need it, you likely don't — and that's fine.*

## Provenance of this spec

- **v1.0 (2026-06-28)** — single canonical Receipt Format. Pins the `faf-taf-git` emitter schema; leads with Proof Over Time; states the tamper-evidence boundary honestly.
- Supersedes earlier drafts (2025-10-27) that predated `faf-taf-git` and over-formatted a thin-value artifact.
- **License:** MIT.
