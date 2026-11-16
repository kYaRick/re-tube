import { describe, expect, it } from 'vitest';
import { escapeRe, parseCount, parseList, stableStringify } from '../../src/core/util';

describe('parseCount', () => {
  it.each([
    ['', 0],
    ['42', 42],
    ['1 234', 1234],
    ['1 234', 1234],
    ['1,234', 1234],
    ['1.2K', 1200],
    ['1,2 тис.', 1200],
    ['3 млн', 3_000_000],
    ['2.5M', 2_500_000],
  ])('%j -> %d', (raw, expected) => {
    expect(parseCount(raw)).toBe(expected);
  });
});

describe('parseList', () => {
  it('splits on commas and new lines', () => {
    expect(parseList(' Foo, bar\n\nBAZ ')).toEqual(['foo', 'bar', 'baz']);
  });
});

describe('escapeRe', () => {
  it('escapes RegExp syntax', () => {
    expect(new RegExp(escapeRe('a.b(c)')).test('a.b(c)')).toBe(true);
    expect(new RegExp(escapeRe('a.b')).test('axb')).toBe(false);
  });
});

describe('stableStringify', () => {
  it('ignores key order', () => {
    expect(stableStringify({ b: 1, a: { d: 2, c: 3 } })).toBe(stableStringify({ a: { c: 3, d: 2 }, b: 1 }));
  });
});
