"use strict";
/**
 * Unified test output parser
 *
 * Tries each framework parser in order until one succeeds.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NO_TESTS = exports.UNPARSEABLE_OUTPUT = exports.SUPPORTED_PARSERS = exports.parseWjttcOutput = exports.parseJunitOutput = void 0;
exports.noResultsReason = noResultsReason;
exports.parseTestOutput = parseTestOutput;
const bun_1 = require("./bun");
const jest_1 = require("./jest");
const junit_1 = require("./junit");
const vitest_1 = require("./vitest");
const wjttc_1 = require("./wjttc");
var junit_2 = require("./junit");
Object.defineProperty(exports, "parseJunitOutput", { enumerable: true, get: function () { return junit_2.parseJunitOutput; } });
var wjttc_2 = require("./wjttc");
Object.defineProperty(exports, "parseWjttcOutput", { enumerable: true, get: function () { return wjttc_2.parseWjttcOutput; } });
/**
 * Every parser, in the order parseTestOutput tries them. Order matters:
 * 1. JUnit XML — a `<testsuite>` element; first, because a report's captured
 *    stdout can hold another runner's summary line.
 * 2. Bun — `Ran N tests across M files` is bun-unique.
 * 3. WJTTC — `pc-ai WJTTC` / suite `pc-ai-wjttc` (FAF bar; not Jest-shaped).
 * 4. Jest — `Tests: … total`.
 * 5. Vitest — `Tests  … (N)`.
 */
const PARSERS = [
    ['JUnit XML', junit_1.parseJunitOutput],
    ['Bun', bun_1.parseBunOutput],
    ['WJTTC', wjttc_1.parseWjttcOutput],
    ['Jest', jest_1.parseJestOutput],
    ['Vitest', vitest_1.parseVitestOutput],
];
exports.SUPPORTED_PARSERS = PARSERS.map(([name]) => name);
/** What the CLI and the Action report when no parser matches. */
exports.UNPARSEABLE_OUTPUT = `Could not parse test output. Supported: ${exports.SUPPORTED_PARSERS.join(', ')}.`;
/** A JUnit report that lists no tests (node --test with no test files): nothing ran, so no receipt. */
exports.NO_TESTS = 'No tests ran: the JUnit report lists 0 tests, so there is no receipt to print.';
/** Why the output gave no results: no tests at all, or a format faf-taf-git doesn't read. */
function noResultsReason(output) {
    const xml = output.replace(/<!--[\s\S]*?-->/g, '');
    const junitShaped = /<testsuites?\b/.test(xml);
    return junitShaped && !/<testcase\b/.test(xml) && !/\btests\s*=\s*["'][1-9]/.test(xml) ? exports.NO_TESTS : exports.UNPARSEABLE_OUTPUT;
}
/**
 * Parse test output from any supported framework: the first parser in
 * PARSERS that recognises the output wins.
 */
function parseTestOutput(output) {
    for (const [, parse] of PARSERS) {
        const results = parse(output);
        if (results)
            return allSkipped(results) ? { ...results, result: 'SKIPPED' } : results;
    }
    return null;
}
/** Tests were found, but none passed and none failed: every one was skipped. */
function allSkipped(r) {
    return r.total > 0 && r.passed === 0 && r.failed === 0;
}
//# sourceMappingURL=index.js.map