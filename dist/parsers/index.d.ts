/**
 * Unified test output parser
 *
 * Tries each framework parser in order until one succeeds.
 */
import { TestResults } from './jest';
export { TestResults } from './jest';
/**
 * Parse test output from any supported framework.
 *
 * Order matters: Bun is tried first because its `Ran N tests across M files`
 * anchor is bun-unique — it never false-matches on jest/vitest output. Putting
 * it first also lets bun consumers ship truthful totals even when their CI
 * still has a legacy `Tests: N passed, N total` jest-shim line appended to the
 * test output (the bun parser ignores it and reads the canonical `Ran` line).
 *
 * Tries parsers in order: Bun, Jest, Vitest.
 */
export declare function parseTestOutput(output: string): TestResults | null;
//# sourceMappingURL=index.d.ts.map