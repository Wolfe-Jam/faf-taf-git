/**
 * TAF Core - Simplified for GitHub Action
 *
 * Pure functions for reading, parsing, and updating .taf files
 * Derived from faf-cli TAF implementation (MCP-portable)
 */

import * as fs from 'fs';
import * as yaml from 'yaml';
import { TestResult, TestResults } from './parsers/jest';
import { buildSkippedTests, DEFAULT_SKIPPED_NAMES_CAP, SkippedTestsBlock } from './skipped-names';

interface TAFFile {
  format_version?: string;
  project?: string;
  created?: string;
  last_updated?: string;
  test_history: TestRun[];
  [key: string]: any; // Allow other fields
}

interface TestRun {
  timestamp: string;
  result: TestResult;
  tests: {
    total: number;
    passed: number;
    failed: number;
    skipped?: number;
  };
  command?: string;
  trigger?: string;
  skipped_tests?: SkippedTestsBlock;
}

export interface UpdateOptions {
  /** Skipped names to write; 0 turns the skipped_tests block off. */
  skippedNamesCap?: number;
}

/** What the last updateTafFile call wrote, for outputs and logs. */
export interface UpdateReport {
  skippedTests?: SkippedTestsBlock;
  /** Why no skipped_tests block was written although tests were skipped. */
  skippedNamesNote?: string;
}

export const lastUpdate: UpdateReport = {};

/**
 * Update .taf file with new test results
 * Creates the file if it doesn't exist
 */
export function updateTafFile(
  tafPath: string,
  testResults: TestResults,
  options: UpdateOptions = {}
): boolean {
  try {
    let taf: TAFFile;

    // Check if .taf exists, create if not
    if (fs.existsSync(tafPath)) {
      const content = fs.readFileSync(tafPath, 'utf-8');
      taf = parseTAF(content);
    } else {
      // Create new .taf file
      const projectName = require('path').basename(require('path').dirname(tafPath));
      taf = createTAF(projectName);
    }

    // Create test run entry
    const run: TestRun = {
      timestamp: new Date().toISOString(),
      result: testResults.result,
      tests: {
        total: testResults.total,
        passed: testResults.passed,
        failed: testResults.failed,
        skipped: testResults.skipped,
      },
      trigger: runTrigger(),
    };

    // Skipped names, compared with the receipt before this one. On a push-race
    // retry this runs again against the receipts that won, so the diff is
    // always against the true previous receipt.
    const previous = taf.test_history[taf.test_history.length - 1];
    const skipped = buildSkippedTests(
      testResults.skippedNames,
      testResults.skipped ?? 0,
      previous,
      options.skippedNamesCap ?? DEFAULT_SKIPPED_NAMES_CAP,
    );
    if (skipped.block) run.skipped_tests = skipped.block;
    lastUpdate.skippedTests = skipped.block;
    lastUpdate.skippedNamesNote = skipped.reason;

    // Append to history
    taf.test_history.push(run);

    // Serialize and write back
    const updated = serializeTAF(taf);
    fs.writeFileSync(tafPath, updated, 'utf-8');

    return true;
  } catch (error) {
    console.error('Failed to update .taf file:', error);
    return false;
  }
}

/**
 * What fired the run: GitHub Actions, another CI, or a local run
 */
export function runTrigger(env: NodeJS.ProcessEnv = process.env): string {
  if (env.GITHUB_ACTIONS === 'true') return 'github-actions';
  if (env.CI && env.CI !== 'false') return 'ci';
  return 'local';
}

/**
 * The error when there is no .taf to append to, with the command that makes one
 */
export const NO_TAF_FILE = "No .taf file found. Create one: echo 'test_history: []' > .taf";

/**
 * Create a new TAF file structure
 */
function createTAF(projectName: string): TAFFile {
  return {
    format_version: '1.0.0',
    project: projectName,
    created: new Date().toISOString(),
    last_updated: new Date().toISOString(),
    test_history: [],
  };
}

/**
 * Parse .taf file content
 */
function parseTAF(content: string): TAFFile {
  // Split on document separator and take only first document
  const lines = content.split('\n');
  const yamlLines: string[] = [];

  for (const line of lines) {
    // Stop at document separator (but skip initial one if present)
    if (line.trim() === '---' && yamlLines.length > 0) {
      break;
    }
    // Skip initial document separator
    if (line.trim() === '---' && yamlLines.length === 0) {
      continue;
    }
    yamlLines.push(line);
  }

  const parsed = yaml.parse(yamlLines.join('\n'));

  // Basic validation
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid .taf file: not a valid YAML object');
  }

  if (!parsed.test_history || !Array.isArray(parsed.test_history)) {
    throw new Error('Invalid .taf file: missing or invalid test_history');
  }

  return parsed as TAFFile;
}

/**
 * Serialize TAF object back to YAML
 * Uses yaml library to maintain existing format
 */
function serializeTAF(taf: TAFFile): string {
  // Update last_updated timestamp
  taf.last_updated = new Date().toISOString();

  // Use yaml.stringify to preserve format
  return yaml.stringify(taf);
}
