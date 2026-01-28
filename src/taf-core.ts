/**
 * TAF Core - Simplified for GitHub Action
 *
 * Pure functions for reading, parsing, and updating .taf files
 * Derived from faf-cli TAF implementation (MCP-portable)
 */

import * as fs from 'fs';
import * as yaml from 'yaml';
import { TestResults } from './parsers/jest';

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
  result: 'PASSED' | 'FAILED' | 'IMPROVED' | 'DEGRADED';
  tests: {
    total: number;
    passed: number;
    failed: number;
    skipped?: number;
  };
  command?: string;
  trigger?: string;
}

/**
 * Update .taf file with new test results
 * Creates the file if it doesn't exist
 */
export function updateTafFile(
  tafPath: string,
  testResults: TestResults
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
      trigger: 'github-actions',
    };

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
