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
 * Parse test output from any supported framework.
 *
 * Order matters:
 * 1. Bun — `Ran N tests across M files` is bun-unique.
 * 2. WJTTC — `pc-ai WJTTC` / suite `pc-ai-wjttc` (FAF bar; not Jest-shaped).
 * 3. Jest — `Tests: … total`.
 * 4. Vitest — `Tests  … (N)`.
 */
export function parseTestOutput(output: string): TestResults | null {
  return (
    parseBunOutput(output) ||
    parseWjttcOutput(output) ||
    parseJestOutput(output) ||
    parseVitestOutput(output)
  );
}
