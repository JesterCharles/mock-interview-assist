/**
 * Phase 46 Plan 02 Task 1 — safety-property tests for wipe-prod.ts.
 *
 * Cases (from 46-02-PLAN.md <behavior>):
 *   - Dry-run default: no TRUNCATE issued; only SELECT COUNT(*) calls appear
 *   - Missing PROD_SUPABASE_REF: throws before any DB connection
 *   - Wrong env (staging URL + live flag): assertProdDatabase throws
 *   - Happy-path live run: TRUNCATE queries appear in exact order; BEGIN/COMMIT
 *     bracket them; no _prisma_migrations; no auth.users in raw SQL
 *   - auth cleanup predicate: @example.com + test-* → deleteUser; else preserve
 *   - TRUNCATE error rolls back: error mid-wipe → ROLLBACK, no COMMIT
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { main, TRUNCATE_ORDER, TEST_EMAIL_PREDICATE } from '../wipe-prod.js';

function makePoolStub(options: {
  countRows?: number;
  truncateError?: Error | null;
} = {}) {
  const queries: string[] = [];
  const clientQueries: string[] = [];
  const end = vi.fn(async () => {});
  const release = vi.fn();

  const client = {
    query: vi.fn(async (sql: string) => {
      clientQueries.push(sql);
      if (
        options.truncateError &&
        sql.startsWith('TRUNCATE TABLE') &&
        clientQueries.filter((q) => q.startsWith('TRUNCATE')).length === 2
      ) {
        throw options.truncateError;
      }
      return {};
    }),
    release,
  };

  const pool = {
    connect: vi.fn(async () => client),
    query: vi.fn(async (sql: string) => {
      queries.push(sql);
      return { rows: [{ c: options.countRows ?? 3 }] };
    }),
    end,
  };

  return { pool, queries, clientQueries, client, end, release };
}

const STAGING_URL =
  'postgresql://postgres.lzuqbpqmqlvzwebliptj:pw@aws-0-us-east-1.pooler.supabase.com:6543/postgres';
const PROD_REF = 'prod-ref-zzz1234567890abcdef';
const PROD_URL = `postgresql://postgres.${PROD_REF}:secret@db.${PROD_REF}.supabase.co:5432/postgres`;

describe('wipe-prod.ts', () => {
  let savedEnv: Record<string, string | undefined>;

  beforeEach(() => {
    savedEnv = {
      DATABASE_URL: process.env.DATABASE_URL,
      DIRECT_URL: process.env.DIRECT_URL,
      PROD_SUPABASE_REF: process.env.PROD_SUPABASE_REF,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    };
  });

  afterEach(() => {
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    vi.clearAllMocks();
  });

  it('dry-run default: issues SELECT COUNT(*) per table, NO TRUNCATE', async () => {
    process.env.DATABASE_URL = PROD_URL;
    process.env.DIRECT_URL = PROD_URL;
    process.env.PROD_SUPABASE_REF = PROD_REF;
    const stub = makePoolStub({ countRows: 7 });

    await main({
      argv: ['node', 'wipe-prod.ts'], // no flag
      createPool: () => stub.pool,
      log: () => {},
      warn: () => {},
    });

    // Exactly one SELECT COUNT per table; zero TRUNCATE/BEGIN/COMMIT
    expect(stub.queries.filter((q) => q.startsWith('SELECT COUNT'))).toHaveLength(
      TRUNCATE_ORDER.length,
    );
    expect(stub.queries.filter((q) => q.startsWith('TRUNCATE'))).toHaveLength(0);
    expect(stub.clientQueries).toHaveLength(0);
    expect(stub.end).toHaveBeenCalled();
  });

  it('throws when PROD_SUPABASE_REF is unset (even with live flag)', async () => {
    process.env.DATABASE_URL = PROD_URL;
    process.env.DIRECT_URL = PROD_URL;
    delete process.env.PROD_SUPABASE_REF;
    const stub = makePoolStub();

    await expect(
      main({
        argv: ['node', 'wipe-prod.ts', '--i-understand-this-wipes-prod'],
        createPool: () => stub.pool,
      }),
    ).rejects.toThrow(/PROD_SUPABASE_REF/);

    // Pool must NOT have been created
    expect(stub.pool.connect).not.toHaveBeenCalled();
  });

  it('throws when DATABASE_URL points at STAGING (with live flag)', async () => {
    process.env.DATABASE_URL = STAGING_URL;
    process.env.DIRECT_URL = STAGING_URL;
    process.env.PROD_SUPABASE_REF = PROD_REF;
    const stub = makePoolStub();

    await expect(
      main({
        argv: ['node', 'wipe-prod.ts', '--i-understand-this-wipes-prod'],
        createPool: () => stub.pool,
      }),
    ).rejects.toThrow(/REFUSING to run against STAGING/);

    expect(stub.pool.connect).not.toHaveBeenCalled();
  });

  it('live run: emits TRUNCATE per table in exact order, bracketed by BEGIN/COMMIT', async () => {
    process.env.DATABASE_URL = PROD_URL;
    process.env.DIRECT_URL = PROD_URL;
    process.env.PROD_SUPABASE_REF = PROD_REF;
    process.env.NEXT_PUBLIC_SUPABASE_URL = `https://${PROD_REF}.supabase.co`;
    process.env.SUPABASE_SECRET_KEY = 'service-role-key';

    const stub = makePoolStub();
    const supabaseStub = {
      auth: {
        admin: {
          listUsers: vi.fn(async () => ({
            data: { users: [] },
            error: null,
          })),
          deleteUser: vi.fn(async () => ({ error: null })),
        },
      },
    };

    await main({
      argv: ['node', 'wipe-prod.ts', '--i-understand-this-wipes-prod'],
      createPool: () => stub.pool,
      createSupabase: () => supabaseStub,
      log: () => {},
      warn: () => {},
    });

    // BEGIN ... TRUNCATE x13 ... COMMIT
    expect(stub.clientQueries[0]).toBe('BEGIN');
    expect(stub.clientQueries[stub.clientQueries.length - 1]).toBe('COMMIT');

    const truncateQueries = stub.clientQueries.filter((q) => q.startsWith('TRUNCATE'));
    expect(truncateQueries.length).toBe(TRUNCATE_ORDER.length);

    // Exact order
    for (let i = 0; i < TRUNCATE_ORDER.length; i++) {
      expect(truncateQueries[i]).toBe(
        `TRUNCATE TABLE ${TRUNCATE_ORDER[i]} RESTART IDENTITY CASCADE`,
      );
    }

    // Negative assertions: _prisma_migrations + raw auth.users touch
    const joined = stub.clientQueries.concat(stub.queries).join('\n');
    expect(joined).not.toContain('_prisma_migrations');
    expect(joined.toLowerCase()).not.toMatch(/delete\s+from\s+auth/);
    expect(joined.toLowerCase()).not.toMatch(/truncate\s+.*auth\.users/);
  });

  it('auth cleanup predicate: deletes test users via admin API, preserves real users', async () => {
    process.env.DATABASE_URL = PROD_URL;
    process.env.DIRECT_URL = PROD_URL;
    process.env.PROD_SUPABASE_REF = PROD_REF;
    process.env.NEXT_PUBLIC_SUPABASE_URL = `https://${PROD_REF}.supabase.co`;
    process.env.SUPABASE_SECRET_KEY = 'service-role-key';

    const stub = makePoolStub();
    const supabaseStub = {
      auth: {
        admin: {
          listUsers: vi.fn(async () => ({
            data: {
              users: [
                { id: 'u1', email: 'alice@example.com' },
                { id: 'u2', email: 'bob@example.com' },
                { id: 'u3', email: 'test-user@gmail.com' },
                { id: 'u4', email: 'real@company.com' },
                { id: 'u5', email: 'founder@nextlevelmock.com' },
              ],
            },
            error: null,
          })),
          deleteUser: vi.fn(async () => ({ error: null })),
        },
      },
    };

    await main({
      argv: ['node', 'wipe-prod.ts', '--i-understand-this-wipes-prod'],
      createPool: () => stub.pool,
      createSupabase: () => supabaseStub,
      log: () => {},
      warn: () => {},
    });

    // 3 deletes (u1, u2, u3), 2 preserved (u4, u5)
    expect(supabaseStub.auth.admin.deleteUser).toHaveBeenCalledTimes(3);
    expect(supabaseStub.auth.admin.deleteUser).toHaveBeenCalledWith('u1');
    expect(supabaseStub.auth.admin.deleteUser).toHaveBeenCalledWith('u2');
    expect(supabaseStub.auth.admin.deleteUser).toHaveBeenCalledWith('u3');
    expect(supabaseStub.auth.admin.deleteUser).not.toHaveBeenCalledWith('u4');
    expect(supabaseStub.auth.admin.deleteUser).not.toHaveBeenCalledWith('u5');
  });

  it('TRUNCATE error rolls back: second-table error → ROLLBACK, no COMMIT', async () => {
    process.env.DATABASE_URL = PROD_URL;
    process.env.DIRECT_URL = PROD_URL;
    process.env.PROD_SUPABASE_REF = PROD_REF;
    process.env.NEXT_PUBLIC_SUPABASE_URL = `https://${PROD_REF}.supabase.co`;
    process.env.SUPABASE_SECRET_KEY = 'service-role-key';

    const stub = makePoolStub({ truncateError: new Error('FK violation') });

    await expect(
      main({
        argv: ['node', 'wipe-prod.ts', '--i-understand-this-wipes-prod'],
        createPool: () => stub.pool,
        createSupabase: () => ({
          auth: {
            admin: {
              listUsers: vi.fn(),
              deleteUser: vi.fn(),
            },
          },
        }),
        log: () => {},
        warn: () => {},
      }),
    ).rejects.toThrow(/FK violation/);

    expect(stub.clientQueries).toContain('ROLLBACK');
    expect(stub.clientQueries).not.toContain('COMMIT');
  });

  it('TEST_EMAIL_PREDICATE matches @example.com and test- prefix only', () => {
    expect(TEST_EMAIL_PREDICATE('a@example.com')).toBe(true);
    expect(TEST_EMAIL_PREDICATE('test-foo@gmail.com')).toBe(true);
    expect(TEST_EMAIL_PREDICATE('real@company.com')).toBe(false);
    expect(TEST_EMAIL_PREDICATE('test@gmail.com')).toBe(false); // no hyphen
  });

  it('TRUNCATE_ORDER is exactly 13 tables, children first, never includes _prisma_migrations', () => {
    expect(TRUNCATE_ORDER.length).toBe(13);
    expect(TRUNCATE_ORDER.join(',')).not.toContain('_prisma_migrations');
    expect(TRUNCATE_ORDER.join(',')).not.toContain('auth.users');
    // First 5 are children (CodingSkillSignal, CodingAttempt, CodingTestCase,
    // GapScore, Session) — each has FKs into later tables.
    expect(TRUNCATE_ORDER[0]).toBe('"CodingSkillSignal"');
    expect(TRUNCATE_ORDER[TRUNCATE_ORDER.length - 2]).toBe('"HealthCheck"');
    expect(TRUNCATE_ORDER[TRUNCATE_ORDER.length - 1]).toBe('"Settings"');
  });
});
