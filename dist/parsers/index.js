"use strict";
/**
 * Unified test output parser
 *
 * Tries each framework parser in order until one succeeds.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseTestOutput = parseTestOutput;
const bun_1 = require("./bun");
const jest_1 = require("./jest");
const vitest_1 = require("./vitest");
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
function parseTestOutput(output) {
    return (0, bun_1.parseBunOutput)(output) || (0, jest_1.parseJestOutput)(output) || (0, vitest_1.parseVitestOutput)(output);
}
//# sourceMappingURL=index.js.map