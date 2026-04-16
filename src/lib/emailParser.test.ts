import { describe, it, expect } from 'vitest';
import {
  parseEmails,
  getChipSummary,
  isOverCap,
  removeChip,
  type ParsedEmail,
} from './emailParser';

describe('parseEmails', () => {
  it('splits on commas and returns valid chips', () => {
    const result = parseEmails('alice@x.com, bob@y.com');
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ value: 'alice@x.com', state: 'valid' });
    expect(result[1]).toMatchObject({ value: 'bob@y.com', state: 'valid' });
  });

  it('splits on newlines and returns valid chips', () => {
    const result = parseEmails('alice@x.com\nbob@y.com');
    expect(result).toHaveLength(2);
    expect(result[0].state).toBe('valid');
    expect(result[1].state).toBe('valid');
  });

  it('flags duplicate emails within the batch', () => {
    const result = parseEmails('alice@x.com, alice@x.com');
    expect(result).toHaveLength(2);
    expect(result[0].state).toBe('valid');
    expect(result[1].state).toBe('duplicate');
  });

  it('flags malformed emails as invalid', () => {
    const result = parseEmails('notanemail, bob@y.com');
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ value: 'notanemail', state: 'invalid' });
    expect(result[1]).toMatchObject({ value: 'bob@y.com', state: 'valid' });
  });

  it('trims whitespace and skips empty tokens', () => {
    const result = parseEmails('  alice@x.com , , bob@y.com  ');
    expect(result).toHaveLength(2);
    expect(result[0].value).toBe('alice@x.com');
    expect(result[1].value).toBe('bob@y.com');
  });

  it('normalizes to lowercase for deduplication', () => {
    const result = parseEmails('Alice@X.com, alice@x.com');
    expect(result[0].state).toBe('valid');
    expect(result[1].state).toBe('duplicate');
  });

  it('stores the normalized (lowercased) value on each chip', () => {
    const result = parseEmails('Alice@X.com');
    expect(result[0].normalized).toBe('alice@x.com');
  });

  it('handles mixed comma and newline separators', () => {
    const result = parseEmails('a@a.com,\nb@b.com\nc@c.com');
    expect(result).toHaveLength(3);
    result.forEach(c => expect(c.state).toBe('valid'));
  });

  it('returns empty array for empty string', () => {
    expect(parseEmails('')).toHaveLength(0);
  });

  it('invalid emails are not added to the dedup seen set', () => {
    // second 'notanemail' should still be invalid, not duplicate
    const result = parseEmails('notanemail, notanemail');
    expect(result[0].state).toBe('invalid');
    expect(result[1].state).toBe('invalid');
  });
});

describe('getChipSummary', () => {
  it('counts valid, invalid, and duplicate chips', () => {
    const chips: ParsedEmail[] = [
      { value: 'a@a.com', normalized: 'a@a.com', state: 'valid' },
      { value: 'bad', normalized: 'bad', state: 'invalid' },
      { value: 'a@a.com', normalized: 'a@a.com', state: 'duplicate' },
    ];
    expect(getChipSummary(chips)).toEqual({ valid: 1, invalid: 1, duplicate: 1 });
  });

  it('returns zeros for empty chips array', () => {
    expect(getChipSummary([])).toEqual({ valid: 0, invalid: 0, duplicate: 0 });
  });
});

describe('isOverCap', () => {
  it('returns false when valid count <= cap', () => {
    const chips = parseEmails(
      Array.from({ length: 50 }, (_, i) => `user${i}@x.com`).join(', ')
    );
    expect(isOverCap(chips, 50)).toBe(false);
  });

  it('returns true when valid count > cap', () => {
    const chips = parseEmails(
      Array.from({ length: 51 }, (_, i) => `user${i}@x.com`).join(', ')
    );
    expect(isOverCap(chips, 50)).toBe(true);
  });

  it('invalid chips do not count toward the cap', () => {
    // 50 valid + 10 invalid = still not over cap
    const validEmails = Array.from({ length: 50 }, (_, i) => `user${i}@x.com`).join(', ');
    const invalidEmails = Array.from({ length: 10 }, (_, i) => `bad${i}`).join(', ');
    const chips = parseEmails(`${validEmails}, ${invalidEmails}`);
    expect(isOverCap(chips, 50)).toBe(false);
  });
});

describe('removeChip', () => {
  it('removes the chip at the given index', () => {
    const chips = parseEmails('a@a.com, b@b.com, c@c.com');
    const result = removeChip(chips, 1);
    expect(result).toHaveLength(2);
    expect(result[0].value).toBe('a@a.com');
    expect(result[1].value).toBe('c@c.com');
  });

  it('reclassifies former duplicates to valid after removing original', () => {
    const chips = parseEmails('a@a.com, a@a.com');
    expect(chips[0].state).toBe('valid');
    expect(chips[1].state).toBe('duplicate');

    // Remove the first (original valid); the second should become valid
    const result = removeChip(chips, 0);
    expect(result).toHaveLength(1);
    expect(result[0].state).toBe('valid');
  });

  it('preserves invalid state during reclassification', () => {
    const chips = parseEmails('bad, a@a.com, a@a.com');
    // chips: [invalid, valid, duplicate]
    const result = removeChip(chips, 1); // remove valid 'a@a.com'
    // remaining: [invalid, duplicate→valid]
    expect(result[0].state).toBe('invalid');
    expect(result[1].state).toBe('valid');
  });
});
