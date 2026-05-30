/**
 * Bun test output parser
 *
 * Extracts test counts from `bun test` CLI output.
 */
import { TestResults } from './jest';
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
export declare function parseBunOutput(output: string): TestResults | null;
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
//# sourceMappingURL=bun.d.ts.map