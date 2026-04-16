import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests for RecommendedAreaCard pure helpers.
 *
 * We run in node environment (no jsdom/React testing library).
 * Tests cover the getDismissRecord and isDismissedForArea exported helpers.
 * The dismiss logic is the core business rule — component render is verified
 * at integration level.
 */

// Mock localStorage in node env
const localStorageStore: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageStore[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageStore[key];
  }),
  clear: vi.fn(() => {
    Object.keys(localStorageStore).forEach((k) => delete localStorageStore[k]);
  }),
};

vi.stubGlobal('localStorage', localStorageMock);

import { getDismissRecord, isDismissedForArea } from './RecommendedAreaCard';

const SLUG = 'alice';
const AREA = 'JavaScript';
const KEY = `nlm_dismiss_recommended_${SLUG}`;

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
});

describe('getDismissRecord', () => {
  it('returns null when no stored value', () => {
    expect(getDismissRecord(SLUG)).toBeNull();
  });

  it('returns parsed record when stored', () => {
    const record = { dismissedAt: new Date().toISOString(), recommendedArea: AREA };
    localStorageStore[KEY] = JSON.stringify(record);
    expect(getDismissRecord(SLUG)).toEqual(record);
  });

  it('returns null on malformed JSON', () => {
    localStorageStore[KEY] = 'not-json{{';
    expect(getDismissRecord(SLUG)).toBeNull();
  });
});

describe('isDismissedForArea', () => {
  it('returns false when no stored value (Test 1 — card shows when not dismissed)', () => {
    expect(isDismissedForArea(SLUG, AREA)).toBe(false);
  });

  it('returns false when recommendedArea is null/absent', () => {
    // No record = not dismissed
    expect(isDismissedForArea(SLUG, 'Python')).toBe(false);
  });

  it('returns true when dismissed for same area within 7 days (Test 4)', () => {
    const record = {
      dismissedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
      recommendedArea: AREA,
    };
    localStorageStore[KEY] = JSON.stringify(record);
    expect(isDismissedForArea(SLUG, AREA)).toBe(true);
  });

  it('returns false when dismissed > 7 days ago', () => {
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
    const record = {
      dismissedAt: new Date(eightDaysAgo).toISOString(),
      recommendedArea: AREA,
    };
    localStorageStore[KEY] = JSON.stringify(record);
    expect(isDismissedForArea(SLUG, AREA)).toBe(false);
  });

  it('returns false when stored area differs from current recommendedArea (Test 5 — card reappears)', () => {
    const record = {
      dismissedAt: new Date(Date.now() - 1000 * 60).toISOString(), // 1 min ago
      recommendedArea: 'Python', // different area
    };
    localStorageStore[KEY] = JSON.stringify(record);
    // Current area is JavaScript — should NOT be suppressed
    expect(isDismissedForArea(SLUG, AREA)).toBe(false);
  });
});
