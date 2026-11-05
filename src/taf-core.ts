/**
 * TAF Core - Simplified for GitHub Action
 *
 * Pure functions for reading, parsing, and updating .taf files
 * Derived from faf-cli TAF implementation (MCP-portable)
 */

import * as fs from 'fs';
import * as os from 'os';
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
 * The receipts document is edited as YAML, not rebuilt from an object, so its
 * comments and key order stay. Anything after it (a later `---` document, even
 * one with a YAML error) is kept byte for byte.
 */
function appendReceipt(tafPath: string, testResults: TestResults, options: UpdateOptions): boolean {
  let doc: yaml.Document;
  let tail = '';

  if (fs.existsSync(tafPath)) {
    ({ doc, tail } = readTaf(fs.readFileSync(tafPath, 'utf-8')));
  } else {
    doc = new yaml.Document(createTAF(path.basename(path.dirname(tafPath))));
  }
  const taf = doc.toJS() as TAFFile;

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
  const history = doc.get('test_history', true);
  if (yaml.isSeq(history)) {history.flow = false;}
  doc.addIn(['test_history'], run);
  doc.set('last_updated', new Date().toISOString());

  writeAtomically(tafPath, String(doc) + tail);
  return true;
}

/** How long a writer waits for another one's lock, and when any lock counts as left behind. */
const LOCK_WAIT_MS = 30_000;
const LOCK_STALE_MS = 60_000;

const sleep = (ms: number): void => {Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);};

const readFileOrNull = (file: string): string | null => {
  try {
    return fs.readFileSync(file, 'utf-8');
  } catch {
    return null;
  }
};

/**
 * True when the lock's owner can't still be writing: a process on this
 * machine that has exited, or a lock older than LOCK_STALE_MS (a writer holds
 * it for milliseconds, so an old lock is left over whoever's PID it names:
 * another machine's, or one reused since).
 */
function lockIsStale(token: string, lock: string): boolean {
  try {
    if (Date.now() - fs.statSync(lock).mtimeMs > LOCK_STALE_MS) {return true;}
  } catch {
    return false; // gone: not stale, just free
  }
  const [host, pidText] = token.split(':');
  const pid = Number(pidText);
  if (host !== os.hostname() || !Number.isInteger(pid) || pid <= 0) {return false;}
  try {
    process.kill(pid, 0);
    return false; // still running
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'ESRCH';
  }
}

/**
 * Run `fn` holding `<tafPath>.lock`, so two runs that finish together each add
 * their receipt instead of one overwriting the other.
 *
 * The lock holds `host:pid:random`. A stale lock (its owner has exited) is
 * removed by one waiter at a time: the one holding `<lock>.takeover`, which
 * re-reads the lock first and removes it only if it is still the stale one.
 * Nobody else can change the lock meanwhile (writers wait for it; only a
 * takeover removes it), so a live lock is never removed. The lock is released
 * only by its owner.
 */
function withTafLock<T>(tafPath: string, fn: () => T): T {
  const lock = `${tafPath}.lock`;
  const token = `${os.hostname()}:${process.pid}:${Math.random().toString(36).slice(2)}`;
  const deadline = Date.now() + LOCK_WAIT_MS;
  for (;;) {
    try {
      fs.writeFileSync(lock, token, { flag: 'wx' });
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {throw error;}
    }
    const seen = readFileOrNull(lock);
    if (seen !== null && lockIsStale(seen, lock)) {
      takeOverStaleLock(lock, seen, token);
      continue;
    }
    if (Date.now() > deadline) {throw new Error(`${lock} is held by another run (waited ${LOCK_WAIT_MS / 1000}s)`);}
    sleep(20 + Math.floor(Math.random() * 30));
  }
  try {
    return fn();
  } finally {
    if (readFileOrNull(lock) === token) {fs.rmSync(lock, { force: true });}
  }
}

/** Remove `lock` if it still holds the stale `seen` token, as the one waiter holding `<lock>.takeover`. */
function takeOverStaleLock(lock: string, seen: string, token: string): void {
  const takeover = `${lock}.takeover`;
  try {
    fs.writeFileSync(takeover, token, { flag: 'wx' });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {throw error;}
    // Another waiter is taking over; clear its claim only if it died doing so.
    const claim = readFileOrNull(takeover);
    if (claim !== null && lockIsStale(claim, takeover)) {
      try {
        if (readFileOrNull(takeover) === claim) {fs.rmSync(takeover, { force: true });}
      } catch {
        // gone already
      }
    }
    sleep(10 + Math.floor(Math.random() * 20));
    return;
  }
  try {
    if (readFileOrNull(lock) === seen) {fs.rmSync(lock, { force: true });}
  } finally {
    if (readFileOrNull(takeover) === token) {fs.rmSync(takeover, { force: true });}
  }
}

/**
 * Write to a temp file beside the real file, then rename it over: a reader
 * never sees half a file. A symlinked .taf stays a symlink (the target is
 * replaced), and the file keeps its mode.
 */
function writeAtomically(file: string, text: string): void {
  const target = fs.existsSync(file) ? fs.realpathSync(file) : file;
  const mode = fs.existsSync(target) ? fs.statSync(target).mode & 0o777 : undefined;
  const tmp = path.join(path.dirname(target), `.${path.basename(target)}.${process.pid}.${Date.now()}.tmp`);
  fs.writeFileSync(tmp, text, { encoding: 'utf-8', ...(mode !== undefined ? { mode } : {}) });
  if (mode !== undefined) {fs.chmodSync(tmp, mode);}
  try {
    fs.renameSync(tmp, target);
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
 * The receipts document of a .taf (the first YAML document), and the source
 * text after it: later `---` documents, kept byte for byte whatever they hold.
 */
function readTaf(content: string): { doc: yaml.Document; tail: string } {
  const tokens = [...new yaml.Parser().parse(content)];
  const first = tokens.findIndex((t) => t.type === 'document');
  if (first === -1) {throw new Error('Invalid .taf file: not a valid YAML object');}
  const end = tokens[first + 1]?.offset ?? content.length;
  const doc = yaml.parseDocument(content.slice(0, end));
  if (doc.errors.length > 0) {
    throw new Error(`Invalid .taf file: ${doc.errors[0].message}`);
  }
  const parsed = doc.toJS();
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid .taf file: not a valid YAML object');
  }
  if (!parsed.test_history || !Array.isArray(parsed.test_history)) {
    throw new Error('Invalid .taf file: missing or invalid test_history');
  }
  return { doc, tail: content.slice(end) };
}
