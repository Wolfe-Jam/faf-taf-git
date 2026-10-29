/**
 * JUnit XML parser
 *
 * Extracts test counts from a JUnit XML report — the common format nearly every
 * test runner can write: pytest (--junitxml), cargo (nextest, cargo2junit), Go
 * (go-junit-report, gotestsum), Maven/Gradle, .NET, PHPUnit, Jest (jest-junit).
 */

import { TestResults } from './jest';

const SUITE_TAG = /<(\/?)testsuite\b([^>]*?)(\/?)>/g;

/** Read one numeric attribute; undefined when the attribute is absent. */
function attr(attrs: string, name: string): number | undefined {
  const match = attrs.match(new RegExp(`\\b${name}\\s*=\\s*["'](\\d+)["']`));
  return match ? parseInt(match[1], 10) : undefined;
}

interface Counts {
  tests: number;
  failed: number;
  skipped: number;
}

/** Counts from a <testsuite> or <testsuites> attribute list, or null without a `tests` count. */
function countsFromAttrs(attrs: string): Counts | null {
  const tests = attr(attrs, 'tests');
  if (tests === undefined) return null;
  return {
    tests,
    failed: (attr(attrs, 'failures') ?? 0) + (attr(attrs, 'errors') ?? 0),
    skipped: (attr(attrs, 'skipped') ?? 0) + (attr(attrs, 'disabled') ?? 0),
  };
}

/** Fallback when suites carry no counts: walk the <testcase> elements themselves. */
function countsFromTestcases(xml: string): Counts {
  const counts: Counts = { tests: 0, failed: 0, skipped: 0 };
  const testcase = /<testcase\b[^>]*?(?:\/>|>([\s\S]*?)<\/testcase>)/g;
  let match: RegExpExecArray | null;
  while ((match = testcase.exec(xml)) !== null) {
    counts.tests++;
    const body = match[1] ?? '';
    if (/<(failure|error)\b/.test(body)) counts.failed++;
    else if (/<skipped\b/.test(body)) counts.skipped++;
  }
  return counts;
}

/**
 * Parse a JUnit XML report to extract test results
 *
 * Handles:
 * - a <testsuites> root that carries the totals (gotestsum, Maven)
 * - a <testsuites> root without totals, around counted <testsuite>s (pytest)
 * - a single <testsuite> root
 * - nested <testsuite>s (only the outermost level is counted, never twice)
 * - suites with no counts at all (the <testcase> elements are counted instead)
 *
 * failures + errors count as failed; skipped + disabled count as skipped.
 */
export function parseJunitOutput(output: string): TestResults | null {
  const xml = output.replace(/<!--[\s\S]*?-->/g, '');
  if (!/<testsuites?\b/.test(xml)) return null;

  let counts: Counts | null = null;

  const root = xml.match(/<testsuites\b([^>]*)>/);
  if (root) counts = countsFromAttrs(root[1]);

  if (!counts) {
    // Sum the outermost <testsuite>s; a suite without counts sends us to the testcases.
    let depth = 0;
    let summed: Counts | null = { tests: 0, failed: 0, skipped: 0 };
    let seen = 0;
    let match: RegExpExecArray | null;
    SUITE_TAG.lastIndex = 0;
    while ((match = SUITE_TAG.exec(xml)) !== null) {
      const [, closing, attrs, selfClosing] = match;
      if (closing) {
        depth--;
        continue;
      }
      if (depth === 0 && summed) {
        seen++;
        const suite = countsFromAttrs(attrs);
        if (suite) {
          summed.tests += suite.tests;
          summed.failed += suite.failed;
          summed.skipped += suite.skipped;
        } else {
          summed = null;
        }
      }
      if (!selfClosing) depth++;
    }
    counts = seen > 0 && summed ? summed : countsFromTestcases(xml);
  }

  if (counts.tests === 0) return null;

  const passed = Math.max(0, counts.tests - counts.failed - counts.skipped);
  return {
    total: counts.tests,
    passed,
    failed: counts.failed,
    skipped: counts.skipped > 0 ? counts.skipped : undefined,
    result: counts.failed > 0 ? 'FAILED' : 'PASSED',
  };
}
