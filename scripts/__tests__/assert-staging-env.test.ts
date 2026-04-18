/**
 * Phase 46 Plan 01 Task 1 — unit tests for shared env-guard helper.
 *
 * Covers the 8 behaviors locked in 46-01-PLAN.md Task 1 <behavior>:
 *   - assertStagingDatabase throws when DATABASE_URL undefined
 *   - assertStagingDatabase throws when DATABASE_URL lacks staging ref
 *   - assertStagingDatabase returns void when DATABASE_URL contains staging ref
 *   - assertProdDatabase throws when DATABASE_URL contains STAGING_REF
 *   - assertProdDatabase throws when DATABASE_URL lacks expectedProdRef
 *   - assertProdDatabase returns void when URL has prod ref + no staging ref
 *   - maskUrl replaces password with ***
 *   - thrown error messages never leak raw password
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  STAGING_REF,
  assertStagingDatabase,
  assertProdDatabase,
  maskUrl,
} from '../lib/assert-staging-env.js';

const STAGING_URL = `postgresql://postgres.${STAGING_REF}:secret-pw@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;
const PROD_REF = 'prod-ref-abcdef1234567890xy';
const PROD_URL = `postgresql://postgres.${PROD_REF}:super-secret@db.${PROD_REF}.supabase.co:5432/postgres`;

describe('assertStagingDatabase', () => {
  let savedDatabaseUrl: string | undefined;

  beforeEach(() => {
    savedDatabaseUrl = process.env.DATABASE_URL;
  });

  afterEach(() => {
    if (savedDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = savedDatabaseUrl;
    }
  });

  it('throws when DATABASE_URL is undefined', () => {
    delete process.env.DATABASE_URL;
    expect(() => assertStagingDatabase()).toThrow(/REFUSING to run/);
  });

  it('throws when DATABASE_URL does not contain staging ref', () => {
    process.env.DATABASE_URL = PROD_URL;
    expect(() => assertStagingDatabase()).toThrow(new RegExp(STAGING_REF));
  });

  it('returns void when DATABASE_URL contains staging ref', () => {
    process.env.DATABASE_URL = STAGING_URL;
    expect(() => assertStagingDatabase()).not.toThrow();
  });

  it('does not leak raw password in thrown message', () => {
    process.env.DATABASE_URL = PROD_URL;
    try {
      assertStagingDatabase();
      throw new Error('expected throw');
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).not.toContain('super-secret');
      expect(msg).toContain(':***@');
    }
  });
});

describe('assertProdDatabase', () => {
  let savedDatabaseUrl: string | undefined;

  beforeEach(() => {
    savedDatabaseUrl = process.env.DATABASE_URL;
  });

  afterEach(() => {
    if (savedDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = savedDatabaseUrl;
    }
  });

  it('throws when DATABASE_URL contains the staging ref (cross-env protection)', () => {
    process.env.DATABASE_URL = STAGING_URL;
    expect(() => assertProdDatabase(PROD_REF)).toThrow(
      /REFUSING to run against STAGING/,
    );
  });

  it('throws when DATABASE_URL lacks expectedProdRef', () => {
    // Neutral URL — no staging, no prod ref.
    process.env.DATABASE_URL =
      'postgresql://postgres:anything@db.other.supabase.co:5432/postgres';
    expect(() => assertProdDatabase(PROD_REF)).toThrow(
      new RegExp(PROD_REF),
    );
  });

  it('returns void when DATABASE_URL contains prod ref and NOT staging ref', () => {
    process.env.DATABASE_URL = PROD_URL;
    expect(() => assertProdDatabase(PROD_REF)).not.toThrow();
  });

  it('does not leak raw password in thrown message', () => {
    process.env.DATABASE_URL = STAGING_URL;
    try {
      assertProdDatabase(PROD_REF);
      throw new Error('expected throw');
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).not.toContain('secret-pw');
      expect(msg).toContain(':***@');
    }
  });
});

describe('maskUrl', () => {
  it('replaces the password segment with ***', () => {
    expect(maskUrl('postgresql://user:hunter2@host:5432/db')).toBe(
      'postgresql://user:***@host:5432/db',
    );
  });

  it('leaves URLs without a password untouched', () => {
    expect(maskUrl('postgresql://host:5432/db')).toBe(
      'postgresql://host:5432/db',
    );
  });

  it('handles URLs that embed port numbers in the host section', () => {
    const input = 'postgresql://postgres.ref:pw@aws-0-us-east-1.pooler.supabase.com:6543/postgres';
    expect(maskUrl(input)).toBe(
      'postgresql://postgres.ref:***@aws-0-us-east-1.pooler.supabase.com:6543/postgres',
    );
  });
});

describe('STAGING_REF constant', () => {
  it('is the canonical staging project ref', () => {
    expect(STAGING_REF).toBe('lzuqbpqmqlvzwebliptj');
  });
});
