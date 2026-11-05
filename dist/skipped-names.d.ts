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
/** Default number of names written on a receipt. 0 turns the block off. */
export declare const DEFAULT_SKIPPED_NAMES_CAP = 25;
/**
 * The `skipped-names` setting: a whole number of names to write, 0 for off.
 * Empty means the default. Anything else is an error, so a typo can't turn
 * the feature off unnoticed.
 */
export declare function parseSkippedNamesCap(raw: string | undefined): number;
export interface SkippedTestsBlock {
    names: string[];
    truncated?: true;
    hash: string;
    newly_skipped?: string[];
    no_longer_skipped?: string[];
}
/** What a previous receipt entry needs to look like for the comparison. */
export interface PreviousEntry {
    tests?: {
        skipped?: number;
    };
    skipped_tests?: Partial<SkippedTestsBlock>;
}
/** The block to write (or none), and a one-line reason when there is none. */
export interface SkippedTestsOutcome {
    block?: SkippedTestsBlock;
    reason?: string;
}
/** Turn &gt; &#62; &#x3e; back into characters. */
export declare function decodeXmlEntities(text: string): string;
/**
 * One name, made stable across runs and machines: no colour codes, NFC,
 * single spaces, no timing suffix, no absolute path prefix, at most 200
 * characters.
 */
export declare function normalizeName(raw: string): string;
/** Sorted by code unit (no locale), duplicates kept: the same set always sorts the same. */
export declare function sortNames(names: readonly string[]): string[];
/** sha256 of the sorted names joined with "\n", UTF-8. */
export declare function hashNames(sorted: readonly string[]): string;
/**
 * Build the `skipped_tests` block for a new receipt.
 *
 * @param rawNames names the parser read, or undefined when the format names none
 * @param skipped  this run's skipped count
 * @param prev     the last receipt in test_history (undefined on the first)
 * @param cap      names to write; 0 turns the block off
 */
export declare function buildSkippedTests(rawNames: readonly string[] | undefined, skipped: number, prev: PreviousEntry | undefined, cap?: number): SkippedTestsOutcome;
