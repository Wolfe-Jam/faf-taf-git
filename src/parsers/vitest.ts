/**
 * Vitest output parser
 *
 * Extracts test counts from Vitest CLI output
 */

import { TestResults } from './jest';

/**
 * Parse Vitest output to extract test results
 *
 * Vitest output formats:
 * - " Tests  8 passed (8)"
 * - " Tests  2 failed | 6 passed (8)"
 * - " Tests  1 skipped | 7 passed (8)"
 * - " Tests  1 failed | 2 skipped | 5 passed (8)"
 */
export function parseVitestOutput(output: string): TestResults | null {
  // Strip ANSI color codes
  // eslint-disable-next-line no-control-regex
  let cleanOutput = output.replace(/\x1b\[[0-9;]*m/g, '');
  cleanOutput = cleanOutput.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Vitest summary pattern: " Tests  ... (N)" where N is total in parens
  const testSummaryPattern = /^\s*Tests\s+(.+?\(\d+\))/m;
  const testLineMatch = cleanOutput.match(testSummaryPattern);

  if (!testLineMatch || !testLineMatch[1]) {
    return null;
  }

  const testLine = testLineMatch[1];

  // Extract total from parentheses at end
  const totalMatch = testLine.match(/\((\d+)\)\s*$/);
  if (!totalMatch) return null;
  const total = parseInt(totalMatch[1], 10);
  if (total === 0) return null;

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  const passedMatch = testLine.match(/(\d+)\s+passed/i);
  if (passedMatch) passed = parseInt(passedMatch[1], 10);

  const failedMatch = testLine.match(/(\d+)\s+failed/i);
  if (failedMatch) failed = parseInt(failedMatch[1], 10);

  const skippedMatch = testLine.match(/(\d+)\s+skipped/i);
  if (skippedMatch) skipped = parseInt(skippedMatch[1], 10);

  const todoMatch = testLine.match(/(\d+)\s+todo/i);
  if (todoMatch) skipped += parseInt(todoMatch[1], 10);

  let result: 'PASSED' | 'FAILED' = failed > 0 ? 'FAILED' : 'PASSED';

  return {
    total,
    passed,
    failed,
    skipped: skipped > 0 ? skipped : undefined,
    result,
  };
}
