"use strict";
/**
 * TAF Core - Simplified for GitHub Action
 *
 * Pure functions for reading, parsing, and updating .taf files
 * Derived from faf-cli TAF implementation (MCP-portable)
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.NO_TAF_FILE = exports.lastUpdate = void 0;
exports.updateTafFile = updateTafFile;
exports.runTrigger = runTrigger;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const yaml = __importStar(require("yaml"));
const skipped_names_1 = require("./skipped-names");
exports.lastUpdate = {};
/**
 * Update .taf file with new test results
 * Creates the file if it doesn't exist
 */
function updateTafFile(tafPath, testResults, options = {}) {
    try {
        return withTafLock(tafPath, () => appendReceipt(tafPath, testResults, options));
    }
    catch (error) {
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
function appendReceipt(tafPath, testResults, options) {
    let docs;
    if (fs.existsSync(tafPath)) {
        docs = readTafDocuments(fs.readFileSync(tafPath, 'utf-8'));
    }
    else {
        docs = [new yaml.Document(createTAF(path.basename(path.dirname(tafPath))))];
    }
    const taf = docs[0].toJS();
    // Create test run entry
    const run = {
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
    const skipped = (0, skipped_names_1.buildSkippedTests)(testResults.skippedNames, testResults.skipped ?? 0, previous, options.skippedNamesCap ?? skipped_names_1.DEFAULT_SKIPPED_NAMES_CAP);
    if (skipped.block)
        run.skipped_tests = skipped.block;
    exports.lastUpdate.skippedTests = skipped.block;
    exports.lastUpdate.skippedNamesNote = skipped.reason;
    // Append to history, in block style even when the file had `test_history: []`.
    const history = docs[0].get('test_history', true);
    if (yaml.isSeq(history)) {
        history.flow = false;
    }
    docs[0].addIn(['test_history'], run);
    docs[0].set('last_updated', new Date().toISOString());
    writeAtomically(tafPath, docs.map((d) => String(d)).join(''));
    return true;
}
/** How long a writer waits for another one's lock, and when a lock counts as left behind. */
const LOCK_WAIT_MS = 30000;
const LOCK_STALE_MS = 60000;
/**
 * Run `fn` holding `<tafPath>.lock`, so two runs that finish together each add
 * their receipt instead of one overwriting the other. A lock older than
 * LOCK_STALE_MS (a run that was killed) is taken over.
 */
function withTafLock(tafPath, fn) {
    const lock = `${tafPath}.lock`;
    const deadline = Date.now() + LOCK_WAIT_MS;
    for (;;) {
        try {
            fs.writeFileSync(lock, String(process.pid), { flag: 'wx' });
            break;
        }
        catch (error) {
            if (error.code !== 'EEXIST') {
                throw error;
            }
            try {
                if (Date.now() - fs.statSync(lock).mtimeMs > LOCK_STALE_MS) {
                    fs.rmSync(lock, { force: true });
                }
            }
            catch {
                // gone between the two calls: try again
            }
            if (Date.now() > deadline) {
                throw new Error(`${lock} is held by another run (waited ${LOCK_WAIT_MS / 1000}s)`);
            }
            Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20 + Math.floor(Math.random() * 30));
        }
    }
    try {
        return fn();
    }
    finally {
        fs.rmSync(lock, { force: true });
    }
}
/** Write to a temp file in the same folder, then rename it over: a reader never sees half a file. */
function writeAtomically(file, text) {
    const tmp = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.${Date.now()}.tmp`);
    fs.writeFileSync(tmp, text, 'utf-8');
    try {
        fs.renameSync(tmp, file);
    }
    catch (error) {
        fs.rmSync(tmp, { force: true });
        throw error;
    }
}
/**
 * What fired the run: GitHub Actions, another CI, or a local run
 */
function runTrigger(env = process.env) {
    if (env.GITHUB_ACTIONS === 'true')
        return 'github-actions';
    if (env.CI && env.CI !== 'false')
        return 'ci';
    return 'local';
}
/**
 * The error when there is no .taf to append to, with the command that makes one
 */
exports.NO_TAF_FILE = "No .taf file found. Create one: echo 'test_history: []' > .taf";
/**
 * Create a new TAF file structure
 */
function createTAF(projectName) {
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
function readTafDocuments(content) {
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
//# sourceMappingURL=taf-core.js.map