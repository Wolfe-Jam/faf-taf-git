/**
 * Badge Generator Tests
 *
 * Tests SVG output validity, .taf parsing, and edge cases.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { renderBadgeSvg, generateBadge } from '../src/badge';

function createTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SVG RENDERING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('SVG Rendering', () => {
  test('should produce valid SVG with label and value', () => {
    const svg = renderBadgeSvg('TAF', '10/10 passing', '#00D4D4');

    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('TAF');
    expect(svg).toContain('10/10 passing');
  });

  test('should include correct color', () => {
    const svg = renderBadgeSvg('TAF', '10/10 passing', '#00D4D4');

    expect(svg).toContain('fill="#00D4D4"');
  });

  test('should include accessibility attributes', () => {
    const svg = renderBadgeSvg('TAF', '5/5 passing', '#00D4D4');

    expect(svg).toContain('role="img"');
    expect(svg).toContain('aria-label="TAF: 5/5 passing"');
    expect(svg).toContain('<title>TAF: 5/5 passing</title>');
  });

  test('should use Verdana font', () => {
    const svg = renderBadgeSvg('TAF', 'test', '#555');

    expect(svg).toContain('Verdana');
  });

  test('should have 20px height', () => {
    const svg = renderBadgeSvg('TAF', 'test', '#555');

    expect(svg).toContain('height="20"');
  });

  test('should have rounded corners via clipPath', () => {
    const svg = renderBadgeSvg('TAF', 'test', '#555');

    expect(svg).toContain('rx="3"');
    expect(svg).toContain('clip-path="url(#r)"');
  });

  test('should handle custom label', () => {
    const svg = renderBadgeSvg('tests', '99/100 passing', '#E32400');

    expect(svg).toContain('tests');
    expect(svg).toContain('99/100 passing');
    expect(svg).toContain('#E32400');
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BADGE GENERATION FROM .taf
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Badge Generation', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir('badge-test-');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('should generate cyan badge when all tests pass', () => {
    const tafPath = path.join(tempDir, '.taf');
    fs.writeFileSync(tafPath, `format_version: 1.0.0
project: test
test_history:
  - timestamp: "2026-01-01T00:00:00Z"
    result: PASSED
    tests:
      total: 38
      passed: 38
      failed: 0
`);

    const result = generateBadge({ tafPath });

    expect(result.success).toBe(true);
    expect(result.svg).toContain('38/38 passing');
    expect(result.svg).toContain('#00D4D4');
  });

  test('should generate red badge when tests fail', () => {
    const tafPath = path.join(tempDir, '.taf');
    fs.writeFileSync(tafPath, `format_version: 1.0.0
project: test
test_history:
  - timestamp: "2026-01-01T00:00:00Z"
    result: FAILED
    tests:
      total: 38
      passed: 35
      failed: 3
`);

    const result = generateBadge({ tafPath });

    expect(result.success).toBe(true);
    expect(result.svg).toContain('35/38 passing');
    expect(result.svg).toContain('#E32400');
  });

  test('should generate gray badge when .taf is missing', () => {
    const tafPath = path.join(tempDir, '.taf');
    // Don't create the file

    const result = generateBadge({ tafPath });

    expect(result.success).toBe(true);
    expect(result.svg).toContain('no data');
    expect(result.svg).toContain('#9F9F9F');
  });

  test('should generate gray badge when test_history is empty', () => {
    const tafPath = path.join(tempDir, '.taf');
    fs.writeFileSync(tafPath, `format_version: 1.0.0
project: test
test_history: []
`);

    const result = generateBadge({ tafPath });

    expect(result.success).toBe(true);
    expect(result.svg).toContain('no data');
    expect(result.svg).toContain('#9F9F9F');
  });

  test('should use latest run from multiple entries', () => {
    const tafPath = path.join(tempDir, '.taf');
    fs.writeFileSync(tafPath, `format_version: 1.0.0
project: test
test_history:
  - timestamp: "2026-01-01T00:00:00Z"
    result: FAILED
    tests:
      total: 10
      passed: 7
      failed: 3
  - timestamp: "2026-01-02T00:00:00Z"
    result: PASSED
    tests:
      total: 10
      passed: 10
      failed: 0
`);

    const result = generateBadge({ tafPath });

    expect(result.success).toBe(true);
    expect(result.svg).toContain('10/10 passing');
    expect(result.svg).toContain('#00D4D4');
  });

  test('should use custom label', () => {
    const tafPath = path.join(tempDir, '.taf');
    fs.writeFileSync(tafPath, `format_version: 1.0.0
project: test
test_history:
  - timestamp: "2026-01-01T00:00:00Z"
    result: PASSED
    tests:
      total: 5
      passed: 5
      failed: 0
`);

    const result = generateBadge({ tafPath, label: 'tests' });

    expect(result.success).toBe(true);
    expect(result.svg).toContain('tests');
    expect(result.svg).not.toContain('>TAF<');
  });

  test('should handle single test run', () => {
    const tafPath = path.join(tempDir, '.taf');
    fs.writeFileSync(tafPath, `format_version: 1.0.0
project: test
test_history:
  - timestamp: "2026-01-01T00:00:00Z"
    result: PASSED
    tests:
      total: 1
      passed: 1
      failed: 0
`);

    const result = generateBadge({ tafPath });

    expect(result.success).toBe(true);
    expect(result.svg).toContain('1/1 passing');
  });

  test('should handle large test counts', () => {
    const tafPath = path.join(tempDir, '.taf');
    fs.writeFileSync(tafPath, `format_version: 1.0.0
project: test
test_history:
  - timestamp: "2026-01-01T00:00:00Z"
    result: PASSED
    tests:
      total: 10000
      passed: 10000
      failed: 0
`);

    const result = generateBadge({ tafPath });

    expect(result.success).toBe(true);
    expect(result.svg).toContain('10000/10000 passing');
  });

  test('should handle invalid YAML gracefully', () => {
    const tafPath = path.join(tempDir, '.taf');
    fs.writeFileSync(tafPath, '{{{{ not yaml at all');

    const result = generateBadge({ tafPath });

    // Should either return no-data badge or error, but never throw
    expect(result).toBeDefined();
  });

  test('should handle .taf with missing tests field', () => {
    const tafPath = path.join(tempDir, '.taf');
    fs.writeFileSync(tafPath, `format_version: 1.0.0
project: test
test_history:
  - timestamp: "2026-01-01T00:00:00Z"
    result: PASSED
`);

    const result = generateBadge({ tafPath });

    expect(result.success).toBe(true);
    expect(result.svg).toContain('no data');
  });
});
