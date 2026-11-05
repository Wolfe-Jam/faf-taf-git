/**
 * TAF Core - Simplified for GitHub Action
 *
 * Pure functions for reading, parsing, and updating .taf files
 * Derived from faf-cli TAF implementation (MCP-portable)
 */

import * as fs from 'fs';
import * as path from 'path';
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
    return withTafLock(tafPath, () => appendReceipt(tafPath, testResults, options));
  } catch (error) {
    console.error('Failed to update .taf file:', error);
    return false;
  }
}

/**
 * Read, add one receipt, write. Runs under the .taf lock.
 *
 * The file is edited as a YAML document, not rebuilt from an object: comments,
 * key order and any later `---` documents stay as they were, and only the new
 * receipt and `last_updated` change.
 */
function appendReceipt(tafPath: string, testResults: TestResults, options: UpdateOptions): boolean {
  let docs: yaml.Document[];

  if (fs.existsSync(tafPath)) {
    docs = readTafDocuments(fs.readFileSync(tafPath, 'utf-8'));
  } else {
    docs = [new yaml.Document(createTAF(path.basename(path.dirname(tafPath))))];
  }
  const taf = docs[0].toJS() as TAFFile;

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

  // Append to history, in block style even when the file had `test_history: []`.
  const history = docs[0].get('test_history', true);
  if (yaml.isSeq(history)) {history.flow = false;}
  docs[0].addIn(['test_history'], run);
  docs[0].set('last_updated', new Date().toISOString());

  writeAtomically(tafPath, docs.map((d) => String(d)).join(''));
  return true;
}

/** How long a writer waits for another one's lock, and when a lock counts as left behind. */
const LOCK_WAIT_MS = 30_000;
const LOCK_STALE_MS = 60_000;

/**
 * Run `fn` holding `<tafPath>.lock`, so two runs that finish together each add
 * their receipt instead of one overwriting the other. A lock older than
 * LOCK_STALE_MS (a run that was killed) is taken over.
 */
function withTafLock<T>(tafPath: string, fn: () => T): T {
  const lock = `${tafPath}.lock`;
  const deadline = Date.now() + LOCK_WAIT_MS;
  for (;;) {
    try {
      fs.writeFileSync(lock, String(process.pid), { flag: 'wx' });
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {throw error;}
      try {
        if (Date.now() - fs.statSync(lock).mtimeMs > LOCK_STALE_MS) {fs.rmSync(lock, { force: true });}
      } catch {
        // gone between the two calls: try again
      }
      if (Date.now() > deadline) {throw new Error(`${lock} is held by another run (waited ${LOCK_WAIT_MS / 1000}s)`);}
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20 + Math.floor(Math.random() * 30));
    }
  }
  try {
    return fn();
  } finally {
    fs.rmSync(lock, { force: true });
  }
}

/** Write to a temp file in the same folder, then rename it over: a reader never sees half a file. */
function writeAtomically(file: string, text: string): void {
  const tmp = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.${Date.now()}.tmp`);
  fs.writeFileSync(tmp, text, 'utf-8');
  try {
    fs.renameSync(tmp, file);
  } catch (error) {
    fs.rmSync(tmp, { force: true });
    throw error;
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
 * The YAML documents in a .taf. The receipts are in the first; anything after a
 * `---` is kept as it is.
 */
function readTafDocuments(content: string): yaml.Document[] {
  const docs = yaml.parseAllDocuments(content);
  if (!Array.isArray(docs) || docs.length === 0) {
    throw new Error('Invalid .taf file: not a valid YAML object');
  }
  if (docs[0].errors.length > 0) {
    throw new Error(`Invalid .taf file: ${docs[0].errors[0].message}`);
  }
  const parsed = docs[0].toJS();
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid .taf file: not a valid YAML object');
  }
  if (!parsed.test_history || !Array.isArray(parsed.test_history)) {
    throw new Error('Invalid .taf file: missing or invalid test_history');
  }
  return docs;
}
