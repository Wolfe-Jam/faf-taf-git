"use strict";
/**
 * Skipped test names on the receipt
 *
 * A count can stay the same while the tests behind it change: yesterday's 3
 * skipped tests and today's 3 may not be the same 3. So a receipt can carry
 * the skipped names, a hash of the full set, and what changed since the
 * previous receipt (RECEIPT-FORMAT.md v1.1, `skipped_tests`).
 *
 * The list is capped (25 by default) so a receipt stays small; the hash always
 * covers the full set, so a reader can tell "same set" from "different set"
 * even past the cap.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SKIPPED_NAMES_CAP = void 0;
exports.parseSkippedNamesCap = parseSkippedNamesCap;
exports.decodeXmlEntities = decodeXmlEntities;
exports.normalizeName = normalizeName;
exports.sortNames = sortNames;
exports.hashNames = hashNames;
exports.buildSkippedTests = buildSkippedTests;
const crypto_1 = require("crypto");
/** Default number of names written on a receipt. 0 turns the block off. */
exports.DEFAULT_SKIPPED_NAMES_CAP = 25;
/**
 * The `skipped-names` setting: a whole number of names to write, 0 for off.
 * Empty means the default. Anything else is an error, so a typo can't turn
 * the feature off unnoticed.
 */
function parseSkippedNamesCap(raw) {
    const value = (raw ?? '').trim();
    if (value === '')
        return exports.DEFAULT_SKIPPED_NAMES_CAP;
    if (!/^\d+$/.test(value))
        throw new Error(`skipped-names must be a whole number (0 turns it off), got "${value}"`);
    return parseInt(value, 10);
}
/** Longest name kept, in characters; longer names are cut. */
const MAX_NAME_LENGTH = 200;
const XML_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
/** Turn &gt; &#62; &#x3e; back into characters. */
function decodeXmlEntities(text) {
    return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, ref) => {
        if (ref[0] === '#') {
            const code = ref[1].toLowerCase() === 'x' ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10);
            return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
        }
        return XML_ENTITIES[ref.toLowerCase()] ?? whole;
    });
}
/**
 * One name, made stable across runs and machines: no colour codes, NFC,
 * single spaces, no timing suffix, no absolute path prefix, at most 200
 * characters.
 */
function normalizeName(raw) {
    let name = raw
        // eslint-disable-next-line no-control-regex
        .replace(/\x1b\[[0-9;]*m/g, '')
        .normalize('NFC')
        .replace(/\s+/g, ' ')
        .trim()
        // timing suffixes: "[0.38ms]", "(12 ms)", "(1.2s)"
        .replace(/\s*[[(]\d+(?:\.\d+)?\s*m?s[\])]$/, '')
        // absolute path prefixes (a CI work folder, a home folder, a Windows drive
        // path) at the start or after a space; relative paths like sub/a.test.ts stay
        .replace(/(^|[\s(])(?:[A-Za-z]:)?[\\/](?:[^\s\\/:>]+[\\/])+(?=[^\s\\/]+)/g, '$1');
    if (name.length > MAX_NAME_LENGTH)
        name = name.slice(0, MAX_NAME_LENGTH);
    return name;
}
/** Sorted by code unit (no locale), duplicates kept: the same set always sorts the same. */
function sortNames(names) {
    return [...names].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}
/** sha256 of the sorted names joined with "\n", UTF-8. */
function hashNames(sorted) {
    return `sha256:${(0, crypto_1.createHash)('sha256').update(sorted.join('\n'), 'utf8').digest('hex')}`;
}
/**
 * The previous receipt's skipped set: a full list, a hash only, or unknown.
 * - a block that isn't truncated gives its names
 * - a truncated block gives its hash only
 * - no block and no skips: the set was empty (works for receipts from before 2.5.0)
 * - no block but skips: unknown
 */
function previousSet(prev) {
    if (!prev)
        return undefined;
    const block = prev.skipped_tests;
    if (block && typeof block === 'object') {
        if (!block.truncated && Array.isArray(block.names))
            return { names: sortNames(block.names.map(String)) };
        if (typeof block.hash === 'string')
            return { hash: block.hash };
        return undefined;
    }
    return (prev.tests?.skipped ?? 0) === 0 ? { names: [] } : undefined;
}
/** a − b as multisets, sorted. */
function difference(a, b) {
    const left = new Map();
    for (const n of b)
        left.set(n, (left.get(n) ?? 0) + 1);
    const out = [];
    for (const n of a) {
        const k = left.get(n) ?? 0;
        if (k > 0)
            left.set(n, k - 1);
        else
            out.push(n);
    }
    return out;
}
/**
 * Build the `skipped_tests` block for a new receipt.
 *
 * @param rawNames names the parser read, or undefined when the format names none
 * @param skipped  this run's skipped count
 * @param prev     the last receipt in test_history (undefined on the first)
 * @param cap      names to write; 0 turns the block off
 */
function buildSkippedTests(rawNames, skipped, prev, cap = exports.DEFAULT_SKIPPED_NAMES_CAP) {
    if (cap <= 0)
        return {};
    const before = previousSet(prev);
    if (skipped === 0) {
        // Back to zero: say which ones stopped being skipped, if there were any.
        if (before?.names && before.names.length > 0) {
            return { block: { names: [], hash: hashNames([]), no_longer_skipped: before.names } };
        }
        if (before?.hash && before.hash !== hashNames([])) {
            return { block: { names: [], hash: hashNames([]) } };
        }
        return {};
    }
    if (!rawNames) {
        return { reason: `${skipped} skipped, but this test output does not name skipped tests` };
    }
    if (rawNames.length !== skipped) {
        return {
            reason: `${skipped} skipped, but ${rawNames.length} skipped name${rawNames.length === 1 ? '' : 's'} found in the output; names left off`,
        };
    }
    const all = sortNames(rawNames.map(normalizeName));
    const block = { names: all.slice(0, cap), hash: hashNames(all) };
    if (all.length > cap)
        block.truncated = true;
    if (before?.names) {
        const newly = difference(all, before.names);
        const gone = difference(before.names, all);
        if (newly.length > 0)
            block.newly_skipped = newly;
        if (gone.length > 0)
            block.no_longer_skipped = gone;
    }
    return { block };
}
//# sourceMappingURL=skipped-names.js.map