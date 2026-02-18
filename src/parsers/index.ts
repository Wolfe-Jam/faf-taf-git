/**
 * Unified test output parser
 *
 * Tries each framework parser in order until one succeeds.
 */

import { TestResults } from './jest';
import { parseJestOutput } from './jest';
import { parseVitestOutput } from './vitest';

export { TestResults } from './jest';

/**
 * Parse test output from any supported framework.
 * Tries parsers in order: Jest, Vitest.
 */
export function parseTestOutput(output: string): TestResults | null {
  return parseJestOutput(output) || parseVitestOutput(output);
}
