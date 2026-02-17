/**
 * Jest output parser
 *
 * Extracts test counts from Jest CLI output
 */

export interface TestResults {
  total: number;
  passed: number;
  failed: number;
  skipped?: number;
  result: 'PASSED' | 'FAILED' | 'IMPROVED' | 'DEGRADED';
}

/**
 * Parse Jest output to extract test results
 *
 * Jest output formats:
 * - "Tests: 1 failed, 172 passed, 173 total"
 * - "Tests: 173 passed, 173 total"
 * - "Test Suites: 2 failed, 16 passed, 18 total"
 * - "Tests:       9 skipped, 799 passed, 808 total" (with padding)
 */
export function parseJestOutput(output: string): TestResults | null {
  // Strip ANSI color codes and other control characters
  // eslint-disable-next-line no-control-regex
  let cleanOutput = output.replace(/\x1b\[[0-9;]*m/g, '');
  // Also strip carriage returns and normalize line endings
  cleanOutput = cleanOutput.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Try multiple patterns to find the test summary
  // Pattern 1: Standard "Tests:" line
  let testLineMatch = cleanOutput.match(/Tests:\s*(.+?)(?:\n|$)/im);

  // Pattern 2: Try to find numbers with "total" keyword anywhere in output
  if (!testLineMatch) {
    const totalPattern = /(\d+)\s+(?:skipped|passed|failed).*?(\d+)\s+total/im;
    const match = cleanOutput.match(totalPattern);
    if (match) {
      // Found a line with total, use that
      const fullLine = cleanOutput.substring(
        Math.max(0, match.index! - 100),
        Math.min(cleanOutput.length, (match.index || 0) + match[0].length + 20)
      );
      testLineMatch = fullLine.match(/Tests?:?\s*(.+?)(?:\n|$)/im);
    }
  }

  if (!testLineMatch || !testLineMatch[1]) {
    return null;
  }

  const testLine = testLineMatch[1];

  // Extract counts using flexible patterns
  let total = 0;
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  // Parse numbers - use global search on the whole output near the Tests: line
  const totalMatch = testLine.match(/(\d+)\s+total/i);
  if (totalMatch) {
    total = parseInt(totalMatch[1], 10);
  }

  const passedMatch = testLine.match(/(\d+)\s+passed/i);
  if (passedMatch) {
    passed = parseInt(passedMatch[1], 10);
  }

  const failedMatch = testLine.match(/(\d+)\s+failed/i);
  if (failedMatch) {
    failed = parseInt(failedMatch[1], 10);
  }

  const skippedMatch = testLine.match(/(\d+)\s+skipped/i);
  if (skippedMatch) {
    skipped = parseInt(skippedMatch[1], 10);
  }

  // Validate
  if (total === 0) {
    return null;
  }

  // Determine result
  let result: 'PASSED' | 'FAILED' | 'IMPROVED' | 'DEGRADED' = 'PASSED';
  if (failed > 0) {
    result = 'FAILED';
  }

  return {
    total,
    passed,
    failed,
    skipped: skipped > 0 ? skipped : undefined,
    result,
  };
}

/**
 * Example Jest outputs for testing:
 *
 * All passing:
 * "Tests: 173 passed, 173 total"
 *
 * Some failing:
 * "Tests: 1 failed, 172 passed, 173 total"
 *
 * With skipped:
 * "Tests: 1 failed, 2 skipped, 170 passed, 173 total"
 *
 * With padding (CI):
 * "Tests:       9 skipped, 799 passed, 808 total"
 */
