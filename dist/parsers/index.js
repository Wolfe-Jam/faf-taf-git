"use strict";
/**
 * Unified test output parser
 *
 * Tries each framework parser in order until one succeeds.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseTestOutput = parseTestOutput;
const jest_1 = require("./jest");
const vitest_1 = require("./vitest");
/**
 * Parse test output from any supported framework.
 * Tries parsers in order: Jest, Vitest.
 */
function parseTestOutput(output) {
    return (0, jest_1.parseJestOutput)(output) || (0, vitest_1.parseVitestOutput)(output);
}
//# sourceMappingURL=index.js.map