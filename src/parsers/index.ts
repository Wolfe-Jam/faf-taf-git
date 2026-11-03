/**
 * Unified test output parser
 *
 * Tries each framework parser in order until one succeeds.
 */

import { TestResults } from './jest';
import { parseBunOutput } from './bun';
import { parseJestOutput } from './jest';
import { parseJunitOutput } from './junit';
import { parseVitestOutput } from './vitest';
import { parseWjttcOutput } from './wjttc';

export { TestResults } from './jest';
export { parseJunitOutput } from './junit';
export { parseWjttcOutput } from './wjttc';

/**
 * Every parser, in the order parseTestOutput tries them. Order matters:
 * 1. JUnit XML — a `<testsuite>` element; first, because a report's captured
 *    stdout can hold another runner's summary line.
 * 2. Bun — `Ran N tests across M files` is bun-unique.
 * 3. WJTTC — `pc-ai WJTTC` / suite `pc-ai-wjttc` (FAF bar; not Jest-shaped).
 * 4. Jest — `Tests: … total`.
 * 5. Vitest — `Tests  … (N)`.
 */
const PARSERS: ReadonlyArray<readonly [name: string, parse: (output: string) => TestResults | null]> = [
  ['JUnit XML', parseJunitOutput],
  ['Bun', parseBunOutput],
  ['WJTTC', parseWjttcOutput],
  ['Jest', parseJestOutput],
  ['Vitest', parseVitestOutput],
];

export const SUPPORTED_PARSERS: readonly string[] = PARSERS.map(([name]) => name);

/** What the CLI and the Action report when no parser matches. */
export const UNPARSEABLE_OUTPUT = `Could not parse test output. Supported: ${SUPPORTED_PARSERS.join(', ')}.`;

/** A JUnit report that lists no tests (node --test with no test files): nothing ran, so no receipt. */
export const NO_TESTS = 'No tests ran: the JUnit report lists 0 tests, so there is no receipt to print.';

/** Why the output gave no results: no tests at all, or a format faf-taf-git doesn't read. */
export function noResultsReason(output: string): string {
  const xml = output.replace(/<!--[\s\S]*?-->/g, '');
  const junitShaped = /<testsuites?\b/.test(xml);
  return junitShaped && !/<testcase\b/.test(xml) && !/\btests\s*=\s*["'][1-9]/.test(xml) ? NO_TESTS : UNPARSEABLE_OUTPUT;
}

/**
 * Parse test output from any supported framework: the first parser in
 * PARSERS that recognises the output wins.
 */
export function parseTestOutput(output: string): TestResults | null {
  for (const [, parse] of PARSERS) {
    const results = parse(output);
    if (results) return allSkipped(results) ? { ...results, result: 'SKIPPED' } : results;
  }
  return null;
}

/** Tests were found, but none passed and none failed: every one was skipped. */
function allSkipped(r: TestResults): boolean {
  return r.total > 0 && r.passed === 0 && r.failed === 0;
}
