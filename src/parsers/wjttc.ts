/**
 * WJTTC output parser
 *
 * Extracts test counts from the FAF / pc-ai WJTTC bar runner
 * (tests/wjttc/run-wjttc.mjs and sibling suite runners).
 *
 * Two shapes:
 *
 * 1) Human log (default):
 * ```
 * pc-ai WJTTC
 * ----------
 * PASS  VAL-01  valid-simple portfolio accepts
 * FAIL  OPT-01  …
 * ----------
 * 31/33 passed
 * ```
 *
 * 2) Machine JSON (`--json`):
 * ```
 * {
 *   "suite": "pc-ai-wjttc",
 *   "total": 33,
 *   "passed": 31,
 *   "failed": 2,
 *   "results": [ … ]
 * }
 * ```
 *
 * Anchors are WJTTC-specific so this never false-matches Jest/Vitest/Bun.
 * Prefer JSON when both appear in a teed stream (structured totals win).
 */

import { TestResults } from './jest';

function stripAnsi(output: string): string {
  // eslint-disable-next-line no-control-regex
  return output
    .replace(/\x1b\[[0-9;]*m/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

/**
 * Try to parse a WJTTC --json summary object from output.
 * Handles pure JSON or JSON embedded after build noise in a tee file.
 */
function parseJsonSuite(clean: string): TestResults | null {
  // Prefer a top-level object that names the suite.
  const candidates: string[] = [];

  const trimmed = clean.trim();
  if (trimmed.startsWith('{')) {
    candidates.push(trimmed);
  }

  // Last {...} block often is the suite when logs precede JSON.
  const lastBrace = clean.lastIndexOf('{');
  if (lastBrace !== -1) {
    candidates.push(clean.slice(lastBrace));
  }

  for (const raw of candidates) {
    try {
      const body = JSON.parse(raw);
      if (!body || typeof body !== 'object') continue;
      if (body.suite !== 'pc-ai-wjttc') continue;

      const total = Number(body.total);
      const passed = Number(body.passed);
      const failed = Number(body.failed);
      if (!Number.isFinite(total) || total <= 0) continue;
      if (!Number.isFinite(passed) || !Number.isFinite(failed)) continue;

      // Prefer explicit fields; fall back to results[] length if needed.
      let p = passed;
      let f = failed;
      let t = total;
      if (Array.isArray(body.results) && body.results.length > 0) {
        const fromRows = body.results.length;
        if (t !== fromRows && fromRows > 0) {
          // Trust results array as the executed set (partition honesty).
          t = fromRows;
          p = body.results.filter((r: { ok?: boolean }) => r && r.ok === true).length;
          f = t - p;
        }
      }

      return {
        total: t,
        passed: p,
        failed: f,
        result: f > 0 ? 'FAILED' : 'PASSED',
      };
    } catch {
      // try next candidate
    }
  }

  return null;
}

/**
 * Human WJTTC log: header + optional PASS/FAIL lines + "N/N passed".
 */
function parseHumanLog(clean: string): TestResults | null {
  // Require the suite banner so we do not steal "12/12 passed" from other tools.
  if (!/pc-ai\s+WJTTC/i.test(clean)) {
    return null;
  }

  const summary = clean.match(/(\d+)\s*\/\s*(\d+)\s+passed\b/i);
  if (!summary) return null;

  const passedFromSummary = parseInt(summary[1], 10);
  const totalFromSummary = parseInt(summary[2], 10);
  if (totalFromSummary <= 0) return null;

  // Cross-check with PASS/FAIL lines when present (stronger than summary alone).
  const passLines = clean.match(/^PASS\s+\S+/gm);
  const failLines = clean.match(/^FAIL\s+\S+/gm);
  const linePassed = passLines ? passLines.length : -1;
  const lineFailed = failLines ? failLines.length : -1;

  let total = totalFromSummary;
  let passed = passedFromSummary;
  let failed = total - passed;

  if (linePassed >= 0 && lineFailed >= 0) {
    const lineTotal = linePassed + lineFailed;
    if (lineTotal === totalFromSummary) {
      passed = linePassed;
      failed = lineFailed;
      total = lineTotal;
    }
    // If lines disagree with summary, still use summary (runner is source of truth)
    // but failed must be non-negative.
    if (failed < 0) failed = 0;
  }

  return {
    total,
    passed,
    failed,
    result: failed > 0 ? 'FAILED' : 'PASSED',
  };
}

/**
 * Parse WJTTC (pc-ai bar) output to TestResults, or null if not WJTTC.
 */
export function parseWjttcOutput(output: string): TestResults | null {
  const clean = stripAnsi(output);

  // JSON first — structured totals when --json was used.
  const fromJson = parseJsonSuite(clean);
  if (fromJson) return fromJson;

  return parseHumanLog(clean);
}
