"use strict";
/**
 * Unified test output parser
 *
 * Tries each framework parser in order until one succeeds.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UNPARSEABLE_OUTPUT = exports.SUPPORTED_PARSERS = exports.parseWjttcOutput = void 0;
exports.parseTestOutput = parseTestOutput;
const bun_1 = require("./bun");
const jest_1 = require("./jest");
const vitest_1 = require("./vitest");
const wjttc_1 = require("./wjttc");
var wjttc_2 = require("./wjttc");
Object.defineProperty(exports, "parseWjttcOutput", { enumerable: true, get: function () { return wjttc_2.parseWjttcOutput; } });
/**
 * Every parser, in the order parseTestOutput tries them. Order matters:
 * 1. Bun — `Ran N tests across M files` is bun-unique.
 * 2. WJTTC — `pc-ai WJTTC` / suite `pc-ai-wjttc` (FAF bar; not Jest-shaped).
 * 3. Jest — `Tests: … total`.
 * 4. Vitest — `Tests  … (N)`.
 */
const PARSERS = [
    ['Bun', bun_1.parseBunOutput],
    ['WJTTC', wjttc_1.parseWjttcOutput],
    ['Jest', jest_1.parseJestOutput],
    ['Vitest', vitest_1.parseVitestOutput],
];
exports.SUPPORTED_PARSERS = PARSERS.map(([name]) => name);
/** What the CLI and the Action report when no parser matches. */
exports.UNPARSEABLE_OUTPUT = `Could not parse test output. Supported: ${exports.SUPPORTED_PARSERS.join(', ')}.`;
/**
 * Parse test output from any supported framework: the first parser in
 * PARSERS that recognises the output wins.
 */
function parseTestOutput(output) {
    for (const [, parse] of PARSERS) {
        const results = parse(output);
        if (results)
            return results;
    }
    return null;
}
//# sourceMappingURL=index.js.map