"use strict";
/**
 * Bun test output parser
 *
 * Extracts test counts from `bun test` CLI output.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseBunOutput = parseBunOutput;
/**
 * Parse Bun test output to extract test results.
 *
 * Bun output format (summary block at the end of a run):
 *
 * ```
 *    232 pass
 *    1 skip
 *    1 todo
 *    0 fail
 *    848 expect() calls
 *   Ran 234 tests across 9 files. [21.53s]
 * ```
 *
 * Notes:
 * - Anchored on `Ran <N> tests across <M> files.` — the canonical truthful
 *   total (includes skip + todo + pass + fail). Without this line, the parser
 *   returns null and the dispatcher falls through to jest/vitest.
 * - Per-category counts (`pass`, `fail`, `skip`, `todo`) come from their own
 *   lines elsewhere in the same output. Singular forms — bun does not use
 *   `passed`/`failed`/`skipped` (intentional differentiator from jest/vitest).
 * - `skipped` aggregates `skip` + `todo` (matches the convention vitest.ts
 *   already uses for parity in the shared TestResults shape).
 */
function parseBunOutput(output) {
    // Strip ANSI color codes + normalize line endings (parity with siblings).
    // eslint-disable-next-line no-control-regex
    let cleanOutput = output.replace(/\x1b\[[0-9;]*m/g, '');
    cleanOutput = cleanOutput.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    // Canonical anchor: bun-unique "Ran N tests across M files." summary line.
    // Without this, this isn't bun output — let the dispatcher try the others.
    const ranMatch = cleanOutput.match(/^Ran\s+(\d+)\s+tests?\s+across\s+\d+\s+files?/m);
    if (!ranMatch)
        return null;
    const total = parseInt(ranMatch[1], 10);
    if (total === 0)
        return null;
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    // Per-line counts. Each line is `<leading-ws><N> <singular-word>` on its own.
    // Anchored with ^...$ + multiline to avoid catching the "expect() calls" line
    // or any noise inside test descriptions.
    const passedMatch = cleanOutput.match(/^\s*(\d+)\s+pass\s*$/m);
    if (passedMatch)
        passed = parseInt(passedMatch[1], 10);
    const failedMatch = cleanOutput.match(/^\s*(\d+)\s+fail\s*$/m);
    if (failedMatch)
        failed = parseInt(failedMatch[1], 10);
    const skipMatch = cleanOutput.match(/^\s*(\d+)\s+skip\s*$/m);
    if (skipMatch)
        skipped += parseInt(skipMatch[1], 10);
    const todoMatch = cleanOutput.match(/^\s*(\d+)\s+todo\s*$/m);
    if (todoMatch)
        skipped += parseInt(todoMatch[1], 10);
    const result = failed > 0 ? 'FAILED' : 'PASSED';
    return {
        total,
        passed,
        failed,
        skipped: skipped > 0 ? skipped : undefined,
        result,
    };
}
/**
 * Example Bun outputs for testing:
 *
 * All passing:
 * ```
 *  173 pass
 *  0 fail
 *  Ran 173 tests across 8 files. [4.2s]
 * ```
 *
 * Mixed (the grok-faf-mcp 1.4.9 shape):
 * ```
 *  232 pass
 *  1 skip
 *  1 todo
 *  0 fail
 *  848 expect() calls
 *  Ran 234 tests across 9 files. [21.53s]
 * ```
 *
 * Failing:
 * ```
 *  170 pass
 *  3 fail
 *  Ran 173 tests across 8 files. [5.1s]
 * ```
 */
//# sourceMappingURL=bun.js.map