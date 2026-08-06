"use strict";
/**
 * Unified test output parser
 *
 * Tries each framework parser in order until one succeeds.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseWjttcOutput = void 0;
exports.parseTestOutput = parseTestOutput;
const bun_1 = require("./bun");
const jest_1 = require("./jest");
const vitest_1 = require("./vitest");
const wjttc_1 = require("./wjttc");
var wjttc_2 = require("./wjttc");
Object.defineProperty(exports, "parseWjttcOutput", { enumerable: true, get: function () { return wjttc_2.parseWjttcOutput; } });
/**
 * Parse test output from any supported framework.
 *
 * Order matters:
 * 1. Bun — `Ran N tests across M files` is bun-unique.
 * 2. WJTTC — `pc-ai WJTTC` / suite `pc-ai-wjttc` (FAF bar; not Jest-shaped).
 * 3. Jest — `Tests: … total`.
 * 4. Vitest — `Tests  … (N)`.
 */
function parseTestOutput(output) {
    return ((0, bun_1.parseBunOutput)(output) ||
        (0, wjttc_1.parseWjttcOutput)(output) ||
        (0, jest_1.parseJestOutput)(output) ||
        (0, vitest_1.parseVitestOutput)(output));
}
//# sourceMappingURL=index.js.map