/**
 * Phase 46 Plan 01 Task 1 — unit tests for shared env-guard helper.
 *
 * Covers:
 *   - assertStagingDatabase throws when DATABASE_URL / DIRECT_URL undefined
 *   - assertStagingDatabase throws when either URL lacks staging ref
 *   - assertStagingDatabase returns void when both URLs contain staging ref
 *   - assertProdDatabase throws when either URL contains STAGING_REF
 *   - assertProdDatabase throws when either URL lacks expectedProdRef
 *   - assertProdDatabase returns void when both URLs have prod ref + no staging ref
 *   - F-01: cross-consistency — both URLs must reference the same project ref
 *   - maskUrl replaces password with ***
 *   - thrown error messages never leak raw password
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  STAGING_REF,
  assertStagingDatabase,
  assertProdDatabase,
  extractProjectRef,
  maskUrl,
} from '../lib/assert-staging-env.js';

const STAGING_URL = `postgresql://postgres.${STAGING_REF}:secret-pw@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;
const PROD_REF = 'prodrefabcdef1234567890xy';
const PROD_URL = `postgresql://postgres.${PROD_REF}:super-secret@db.${PROD_REF}.supabase.co:5432/postgres`;
const OTHER_PROD_REF = 'otherprod1234567890abcdef';
const OTHER_PROD_URL = `postgresql://postgres.${OTHER_PROD_REF}:pw@db.${OTHER_PROD_REF}.supabase.co:5432/postgres`;

function setEnv(db?: string, direct?: string) {
  if (db === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = db;
  if (direct === undefined) delete process.env.DIRECT_URL;
  else process.env.DIRECT_URL = direct;
}

describe('assertStagingDatabase', () => {
  let savedDatabaseUrl: string | undefined;
  let savedDirectUrl: string | undefined;

  beforeEach(() => {
    savedDatabaseUrl = process.env.DATABASE_URL;
    savedDirectUrl = process.env.DIRECT_URL;
  });

  afterEach(() => {
    if (savedDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = savedDatabaseUrl;
    if (savedDirectUrl === undefined) delete process.env.DIRECT_URL;
    else process.env.DIRECT_URL = savedDirectUrl;
  });

  it('throws when DATABASE_URL is undefined', () => {
    setEnv(undefined, STAGING_URL);
    expect(() => assertStagingDatabase()).toThrow(/DATABASE_URL env var is unset/);
  });

  it('throws when DIRECT_URL is undefined', () => {
    setEnv(STAGING_URL, undefined);
    expect(() => assertStagingDatabase()).toThrow(/DIRECT_URL env var is unset/);
  });

  it('throws when DATABASE_URL does not contain staging ref', () => {
    setEnv(PROD_URL, STAGING_URL);
    expect(() => assertStagingDatabase()).toThrow(
      /DATABASE_URL does not reference the expected project ref/,
    );
  });

  it('throws when DIRECT_URL does not contain staging ref', () => {
    setEnv(STAGING_URL, PROD_URL);
    expect(() => assertStagingDatabase()).toThrow(
      /DIRECT_URL does not reference the expected project ref/,
    );
  });

  it('returns void when both URLs contain staging ref', () => {
    setEnv(STAGING_URL, STAGING_URL);
    expect(() => assertStagingDatabase()).not.toThrow();
  });

  it('does not leak raw password in thrown message', () => {
    setEnv(PROD_URL, PROD_URL);
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
  let savedDirectUrl: string | undefined;

  beforeEach(() => {
    savedDatabaseUrl = process.env.DATABASE_URL;
    savedDirectUrl = process.env.DIRECT_URL;
  });

  afterEach(() => {
    if (savedDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = savedDatabaseUrl;
    if (savedDirectUrl === undefined) delete process.env.DIRECT_URL;
    else process.env.DIRECT_URL = savedDirectUrl;
  });

  it('throws when DATABASE_URL contains the staging ref (cross-env protection)', () => {
    setEnv(STAGING_URL, PROD_URL);
    expect(() => assertProdDatabase(PROD_REF)).toThrow(
      /REFUSING to run against STAGING.*DATABASE_URL/s,
    );
  });

  it('throws when DIRECT_URL contains the staging ref (F-01: wipes used DIRECT_URL)', () => {
    setEnv(PROD_URL, STAGING_URL);
    expect(() => assertProdDatabase(PROD_REF)).toThrow(
      /REFUSING to run against STAGING.*DIRECT_URL/s,
    );
  });

  it('throws when DATABASE_URL lacks expectedProdRef', () => {
    // Neutral URL — no staging, no prod ref.
    setEnv(
      'postgresql://postgres:anything@db.other.supabase.co:5432/postgres',
      PROD_URL,
    );
    expect(() => assertProdDatabase(PROD_REF)).toThrow(
      /DATABASE_URL does not reference the expected project ref/,
    );
  });

  it('throws when DIRECT_URL lacks expectedProdRef', () => {
    setEnv(
      PROD_URL,
      'postgresql://postgres:anything@db.other.supabase.co:5432/postgres',
    );
    expect(() => assertProdDatabase(PROD_REF)).toThrow(
      /DIRECT_URL does not reference the expected project ref/,
    );
  });

  it('throws when DATABASE_URL and DIRECT_URL reference DIFFERENT prod projects (F-01)', () => {
    // Both URLs pass per-URL checks (contain expectedProdRef via substring match)
    // but point at different Supabase projects — the exact bug F-01 fixes.
    const dbUrl = `postgresql://postgres.${PROD_REF}:pw@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;
    const directUrl = OTHER_PROD_URL; // different project ref entirely
    // For this test, expectedProdRef must be something each URL contains — we
    // deliberately pass a ref that appears in BOTH by coincidence. Here we use
    // a short common substring to simulate the "substring-only" bug class.
    // Simpler: pass the DATABASE_URL's ref; DIRECT_URL lacks it so we get the
    // "DIRECT_URL does not reference" error, which is the right failure mode.
    setEnv(dbUrl, directUrl);
    expect(() => assertProdDatabase(PROD_REF)).toThrow(
      /DIRECT_URL does not reference the expected project ref/,
    );
  });

  it('throws when DATABASE_URL and DIRECT_URL both contain expectedProdRef but parse to different project refs (F-01 cross-consistency)', () => {
    // Both strings contain expectedProdRef as a substring (via a crafted
    // password) but the parsed Supabase project refs differ. The cross-
    // consistency check catches this class of subtle mismatch.
    // DATABASE_URL: project ref = PROD_REF
    const dbUrl = `postgresql://postgres.${PROD_REF}:pw@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;
    // DIRECT_URL: project ref = OTHER_PROD_REF, but password contains PROD_REF
    // so substring-only check would pass.
    const directUrl = `postgresql://postgres.${OTHER_PROD_REF}:${PROD_REF}-pw@db.${OTHER_PROD_REF}.supabase.co:5432/postgres`;
    setEnv(dbUrl, directUrl);
    expect(() => assertProdDatabase(PROD_REF)).toThrow(
      /reference different Supabase projects/,
    );
  });

  it('returns void when both URLs contain prod ref and NOT staging ref', () => {
    setEnv(PROD_URL, PROD_URL);
    expect(() => assertProdDatabase(PROD_REF)).not.toThrow();
  });

  it('does not leak raw password in thrown message', () => {
    setEnv(STAGING_URL, STAGING_URL);
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

describe('extractProjectRef', () => {
  it('extracts ref from pooler URL', () => {
    expect(
      extractProjectRef(
        'postgresql://postgres.abcdef12345:pw@aws-0-us-east-1.pooler.supabase.com:6543/postgres',
      ),
    ).toBe('abcdef12345');
  });

  it('extracts ref from direct URL', () => {
    expect(
      extractProjectRef(
        'postgresql://postgres:pw@db.refxyz9876.supabase.co:5432/postgres',
      ),
    ).toBe('refxyz9876');
  });

  it('returns null when no ref matches', () => {
    expect(
      extractProjectRef('postgresql://postgres:pw@localhost:5432/postgres'),
    ).toBeNull();
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
