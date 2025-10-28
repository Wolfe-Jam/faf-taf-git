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
 */
export function parseJestOutput(output: string): TestResults | null {
  // Look for the test summary line
  const testLineMatch = output.match(/Tests:\s+(.+)/);

  if (!testLineMatch) {
    return null;
  }

  const testLine = testLineMatch[1];

  // Extract counts
  let total = 0;
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  // Parse "173 total"
  const totalMatch = testLine.match(/(\d+)\s+total/);
  if (totalMatch) {
    total = parseInt(totalMatch[1], 10);
  }

  // Parse "172 passed"
  const passedMatch = testLine.match(/(\d+)\s+passed/);
  if (passedMatch) {
    passed = parseInt(passedMatch[1], 10);
  }

  // Parse "1 failed"
  const failedMatch = testLine.match(/(\d+)\s+failed/);
  if (failedMatch) {
    failed = parseInt(failedMatch[1], 10);
  }

  // Parse "5 skipped"
  const skippedMatch = testLine.match(/(\d+)\s+skipped/);
  if (skippedMatch) {
    skipped = parseInt(skippedMatch[1], 10);
  }

  // Validate
  if (total === 0) {
    return null;
  }

  // Determine result (simple for now, no history comparison)
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
 */
