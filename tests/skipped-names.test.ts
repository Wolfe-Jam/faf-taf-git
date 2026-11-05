/**
 * Skipped test names on the receipt (2.5.0, RECEIPT-FORMAT.md v1.1).
 *
 * The case it exists for: the skipped count stays at 3 while the tests behind
 * it change. The receipt carries the names (capped), a hash of the full set,
 * and newly_skipped / no_longer_skipped against the previous receipt.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as yaml from 'yaml';
import { parseBunOutput } from '../src/parsers/bun';
import { parseJunitOutput } from '../src/parsers/junit';
import {
  buildSkippedTests,
  decodeXmlEntities,
  hashNames,
  normalizeName,
  parseSkippedNamesCap,
  sortNames,
} from '../src/skipped-names';
import { lastUpdate, updateTafFile } from '../src/taf-core';
import { TestResults } from '../src/parsers/jest';

const fixture = (...p: string[]) => fs.readFileSync(path.join(__dirname, 'fixtures', ...p), 'utf8');

describe('normalizeName', () => {
  it.each([
    ['outer > passes [0.38ms]', 'outer > passes'],
    ['x (12 ms)', 'x'],
    ['  two   spaces\t here ', 'two spaces here'],
    ['/home/runner/work/r/r/tests/a.test.ts > x', 'a.test.ts > x'],
    ['C:\\Users\\me\\proj\\a.test.ts > y', 'a.test.ts > y'],
    ['sub/a.test.ts > keeps relative paths', 'sub/a.test.ts > keeps relative paths'],
    ['example.com/sample > TestSkip', 'example.com/sample > TestSkip'],
    ['\u001b[33mcoloured\u001b[0m', 'coloured'],
  ])('%j → %j', (raw, clean) => {
    expect(normalizeName(raw)).toBe(clean);
  });

  it('cuts a name at 200 characters', () => {
    expect(normalizeName('x'.repeat(300))).toHaveLength(200);
  });

  it('decodes XML entities', () => {
    expect(decodeXmlEntities('a &gt; b &amp; &#62; &#x3e; &quot;q&quot;')).toBe('a > b & > > "q"');
  });
});

describe('sortNames and hashNames', () => {
  it('sorts by code unit and keeps duplicates', () => {
    expect(sortNames(['b', 'B', 'a', 'a'])).toEqual(['B', 'a', 'a', 'b']);
  });

  it('hashes the sorted set, so order in the output does not matter', () => {
    expect(hashNames(sortNames(['b', 'a']))).toBe(hashNames(sortNames(['a', 'b'])));
    expect(hashNames(['a', 'b'])).toMatch(/^sha256:[0-9a-f]{64}$/);
  });
});

describe('buildSkippedTests', () => {
  const prev = (names: string[], extra: object = {}) => ({
    tests: { skipped: names.length },
    skipped_tests: { names, hash: hashNames(sortNames(names)), ...extra },
  });

  it('same count, different tests: names the new one and the one that stopped', () => {
    const { block } = buildSkippedTests(['a', 'b', 'd'], 3, prev(['a', 'b', 'c']));
    expect(block?.names).toEqual(['a', 'b', 'd']);
    expect(block?.newly_skipped).toEqual(['d']);
    expect(block?.no_longer_skipped).toEqual(['c']);
  });

  it('same set: no diff fields, same hash', () => {
    const { block } = buildSkippedTests(['b', 'a'], 2, prev(['a', 'b']));
    expect(block).toEqual({ names: ['a', 'b'], hash: hashNames(['a', 'b']) });
  });

  it('caps the list at 25 and keeps the hash of the full set', () => {
    const names = Array.from({ length: 30 }, (_, i) => `t${String(i).padStart(2, '0')}`);
    const { block } = buildSkippedTests(names, 30, undefined);
    expect(block?.names).toHaveLength(25);
    expect(block?.truncated).toBe(true);
    expect(block?.hash).toBe(hashNames(sortNames(names)));
  });

  it('a receipt from before 2.5.0 with no skips counts as an empty set', () => {
    const { block } = buildSkippedTests(['a'], 1, { tests: {} });
    expect(block?.newly_skipped).toEqual(['a']);
  });

  it('a receipt from before 2.5.0 with skips is unknown: no diff fields', () => {
    const { block } = buildSkippedTests(['a'], 1, { tests: { skipped: 1 } });
    expect(block).toEqual({ names: ['a'], hash: hashNames(['a']) });
  });

  it('a truncated previous block gives a hash only: no diff fields', () => {
    const { block } = buildSkippedTests(['a'], 1, prev(['x', 'y'], { truncated: true }));
    expect(block?.newly_skipped).toBeUndefined();
    expect(block?.no_longer_skipped).toBeUndefined();
  });

  it('back to zero: an empty list and the ones that stopped being skipped', () => {
    const { block } = buildSkippedTests([], 0, prev(['a', 'b']));
    expect(block).toEqual({ names: [], hash: hashNames([]), no_longer_skipped: ['a', 'b'] });
  });

  it('no skips before or now: no block', () => {
    expect(buildSkippedTests(undefined, 0, { tests: { skipped: 0 } })).toEqual({});
  });

  it('names that do not match the count are left off, with a reason', () => {
    const outcome = buildSkippedTests(['a'], 2, undefined);
    expect(outcome.block).toBeUndefined();
    expect(outcome.reason).toMatch(/2 skipped, but 1 skipped name found/);
  });

  it('an output that names no tests gives a reason, not a block', () => {
    expect(buildSkippedTests(undefined, 3, undefined).reason).toMatch(/does not name skipped tests/);
  });

  it('skipped-names 0 turns it off', () => {
    expect(buildSkippedTests(['a'], 1, prev([]), 0)).toEqual({});
  });
});

describe('parseSkippedNamesCap', () => {
  it('defaults to 25, accepts whole numbers and 0', () => {
    expect(parseSkippedNamesCap('')).toBe(25);
    expect(parseSkippedNamesCap(undefined)).toBe(25);
    expect(parseSkippedNamesCap('0')).toBe(0);
    expect(parseSkippedNamesCap(' 10 ')).toBe(10);
  });

  it('rejects anything else, so a typo cannot switch it off unnoticed', () => {
    expect(() => parseSkippedNamesCap('off')).toThrow(/whole number/);
    expect(() => parseSkippedNamesCap('-1')).toThrow(/whole number/);
  });
});

describe('parsers name the skipped tests', () => {
  it.each([
    ['dotnet.xml', ['UnknownNamespace.UnknownType > SampleTests.Skipped']],
    ['gotestsum.xml', ['example.com/sample > TestSkip']],
    ['jest-junit.xml', ['outer inner skipped']],
    ['maven-surefire-SecondTest.xml', ['sample.SecondTest > skipped']],
    ['mocha.xml', ['outer inner > skipped']],
    ['node-test.xml', ['test > nested skip', 'test > nested todo']],
    ['phpunit.xml', ['SampleTest > testSkipped']],
    ['pytest.xml', ['test_sample > test_skip']],
    ['vitest.xml', ['sample.test.mjs > outer > inner > skipped']],
  ])('JUnit %s', (file, names) => {
    const r = parseJunitOutput(fixture('junit', file));
    expect(r?.skippedNames).toEqual(names);
    expect(r?.skipped).toBe(names.length);
  });

  it('JUnit with no skips gives no names', () => {
    expect(parseJunitOutput(fixture('junit', 'cargo-nextest.xml'))?.skippedNames).toBeUndefined();
  });

  it.each(['skips-actions.txt', 'skips-terminal.txt'])('Bun %s (skip and todo, with the file)', (file) => {
    const r = parseBunOutput(fixture('bun', file));
    expect(r?.skipped).toBe(4);
    expect(r?.skippedNames).toEqual([
      'a.test.ts > outer > skipped one',
      'a.test.ts > outer > inner > later',
      'a.test.ts > top skip',
      'sub/b.test.ts > b skip',
    ]);
  });

  it('Bun without per-test lines (an AI agent ran it) names nothing', () => {
    const r = parseBunOutput(' 2 pass\n 3 skip\n 0 fail\nRan 5 tests across 1 file. [1.00ms]\n');
    expect(r?.skipped).toBe(3);
    expect(r?.skippedNames).toBeUndefined();
  });
});

describe('updateTafFile writes skipped_tests against the previous receipt', () => {
  const results = (names: string[]): TestResults => ({
    total: 10,
    passed: 10 - names.length,
    failed: 0,
    skipped: names.length || undefined,
    skippedNames: names.length ? names : undefined,
    result: 'PASSED',
  });

  it('two runs with three skips each: the second names what changed', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'taf-skipped-'));
    const taf = path.join(dir, '.taf');
    fs.writeFileSync(taf, 'test_history: []\n');

    expect(updateTafFile(taf, results(['a', 'b', 'c']))).toBe(true);
    expect(updateTafFile(taf, results(['a', 'b', 'd']))).toBe(true);
    expect(lastUpdate.skippedTests?.newly_skipped).toEqual(['d']);

    const history = yaml.parse(fs.readFileSync(taf, 'utf8')).test_history;
    expect(history[1].tests.skipped).toBe(3);
    expect(history[1].skipped_tests).toEqual({
      names: ['a', 'b', 'd'],
      hash: hashNames(['a', 'b', 'd']),
      newly_skipped: ['d'],
      no_longer_skipped: ['c'],
    });
  });

  it('skippedNamesCap 0 writes no block', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'taf-skipped-'));
    const taf = path.join(dir, '.taf');
    fs.writeFileSync(taf, 'test_history: []\n');
    updateTafFile(taf, results(['a']), { skippedNamesCap: 0 });
    expect(yaml.parse(fs.readFileSync(taf, 'utf8')).test_history[0].skipped_tests).toBeUndefined();
  });
});
