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
/**
 * Parse WJTTC (pc-ai bar) output to TestResults, or null if not WJTTC.
 */
export declare function parseWjttcOutput(output: string): TestResults | null;
//# sourceMappingURL=wjttc.d.ts.map