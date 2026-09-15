/**
 * Unified test output parser
 *
 * Tries each framework parser in order until one succeeds.
 */

import { TestResults } from './jest';
import { parseBunOutput } from './bun';
import { parseJestOutput } from './jest';
import { parseVitestOutput } from './vitest';
import { parseWjttcOutput } from './wjttc';

export { TestResults } from './jest';
export { parseWjttcOutput } from './wjttc';

/**
 * Every parser, in the order parseTestOutput tries them. Order matters:
 * 1. Bun — `Ran N tests across M files` is bun-unique.
 * 2. WJTTC — `pc-ai WJTTC` / suite `pc-ai-wjttc` (FAF bar; not Jest-shaped).
 * 3. Jest — `Tests: … total`.
 * 4. Vitest — `Tests  … (N)`.
 */
const PARSERS: ReadonlyArray<readonly [name: string, parse: (output: string) => TestResults | null]> = [
  ['Bun', parseBunOutput],
  ['WJTTC', parseWjttcOutput],
  ['Jest', parseJestOutput],
  ['Vitest', parseVitestOutput],
];

export const SUPPORTED_PARSERS: readonly string[] = PARSERS.map(([name]) => name);

/** What the CLI and the Action report when no parser matches. */
export const UNPARSEABLE_OUTPUT = `Could not parse test output. Supported: ${SUPPORTED_PARSERS.join(', ')}.`;

/**
 * Parse test output from any supported framework: the first parser in
 * PARSERS that recognises the output wins.
 */
export function parseTestOutput(output: string): TestResults | null {
  for (const [, parse] of PARSERS) {
    const results = parse(output);
    if (results) return results;
  }
  return null;
}
