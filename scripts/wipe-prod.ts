/**
 * Phase 46 Plan 02 Task 1 — One-time prod wipe (D-04, D-05, D-06).
 *
 * Dry-run default. Requires `--i-understand-this-wipes-prod` flag to execute
 * the live wipe. Requires `PROD_SUPABASE_REF` env var to be set and
 * DATABASE_URL to reference it (not staging).
 *
 * TRUNCATE order derived from the FK graph in prisma/schema.prisma — children
 * first, CASCADE as a belt-and-suspenders for any schema change we missed.
 * The Prisma migration history table is NEVER truncated (schema history must
 * persist across wipes).
 * `auth.users` is NEVER touched via raw SQL — test-email heuristic is applied
 * through `supabase.auth.admin.deleteUser(id)` (RESEARCH Pitfall 3).
 *
 * Usage (from runbook Phases C/D):
 *   # Dry run (default)
 *   DATABASE_URL="$PROD_DIRECT_URL" PROD_SUPABASE_REF="<prod-ref>" \
 *     npx tsx scripts/wipe-prod.ts
 *
 *   # Live run (one-time)
 *   DATABASE_URL="$PROD_DIRECT_URL" PROD_SUPABASE_REF="<prod-ref>" \
 *     NEXT_PUBLIC_SUPABASE_URL="https://<prod-ref>.supabase.co" \
 *     SUPABASE_SECRET_KEY="<service-role>" \
 *     DIRECT_URL="$PROD_DIRECT_URL" \
 *     npx tsx scripts/wipe-prod.ts --i-understand-this-wipes-prod
 */

import 'dotenv/config';
import { Pool } from 'pg';
import { createClient } from '@supabase/supabase-js';
import { assertProdDatabase } from './lib/assert-staging-env.js';

const ARG_LIVE = '--i-understand-this-wipes-prod';

/**
 * Table TRUNCATE order derived from prisma/schema.prisma FK graph.
 * Children → parents. The Prisma internal migration-history table is
 * DELIBERATELY EXCLUDED so migration history survives the wipe. `auth.users`
 * is managed via the Supabase admin API (see authCleanup()).
 */
export const TRUNCATE_ORDER: readonly string[] = [
  '"CodingSkillSignal"',
  '"CodingAttempt"',
  '"CodingTestCase"',
  '"GapScore"',
  '"Session"',
  '"AuthEvent"',
  '"Profile"',
  '"CodingChallenge"',
  '"CurriculumWeek"',
  '"Associate"',
  '"Cohort"',
  '"HealthCheck"',
  '"Settings"',
] as const;

/**
 * Email heuristic that marks a row as test-only and eligible for auth.users
 * cleanup. Matches D-06 policy.
 */
export const TEST_EMAIL_PREDICATE = (email: string): boolean =>
  email.endsWith('@example.com') || email.startsWith('test-');

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`[wipe-prod] Required env var ${name} is not set`);
  }
  return v;
}

/**
 * Dependency-injectable entry point. The real script wires default pg Pool +
 * @supabase/supabase-js createClient; tests pass stubs.
 */
export interface WipeDeps {
  createPool?: (connectionString: string) => {
    connect: () => Promise<{
      query: (sql: string) => Promise<unknown>;
      release: () => void;
    }>;
    query: (sql: string) => Promise<{ rows: Array<{ c: number }> }>;
    end: () => Promise<void>;
  };
  createSupabase?: (
    url: string,
    key: string,
  ) => {
    auth: {
      admin: {
        listUsers: (args: {
          page: number;
          perPage: number;
        }) => Promise<{
          data: { users: Array<{ id: string; email: string | null }> };
          error: null | Error;
        }>;
        deleteUser: (id: string) => Promise<{ error: null | Error }>;
      };
    };
  };
  argv?: string[];
  log?: (msg: string) => void;
  warn?: (msg: string) => void;
}

export async function main(deps: WipeDeps = {}): Promise<void> {
  const argv = deps.argv ?? process.argv;
  const log = deps.log ?? ((m: string) => console.log(m));
  const warn = deps.warn ?? ((m: string) => console.warn(m));

  const prodRef = requireEnv('PROD_SUPABASE_REF');
  assertProdDatabase(prodRef);

  const live = argv.includes(ARG_LIVE);

  const directUrl = requireEnv('DIRECT_URL');
  const poolFactory =
    deps.createPool ??
    ((cs: string) => {
      const p = new Pool({ connectionString: cs, max: 2 });
      return {
        connect: async () => {
          const c = await p.connect();
          return {
            query: (sql: string) => c.query(sql) as unknown as Promise<unknown>,
            release: () => c.release(),
          };
        },
        query: async (sql: string) => {
          const r = await p.query(sql);
          return { rows: r.rows as Array<{ c: number }> };
        },
        end: () => p.end(),
      };
    });
  const pool = poolFactory(directUrl);

  if (!live) {
    log('[wipe-prod] DRY RUN — no changes will be made.');
    log(`[wipe-prod] Would TRUNCATE (order): ${TRUNCATE_ORDER.join(' -> ')}`);
    for (const table of TRUNCATE_ORDER) {
      const r = await pool.query(`SELECT COUNT(*)::int AS c FROM ${table}`);
      log(`  ${table.padEnd(22)} rows=${r.rows[0]?.c ?? 0}`);
    }
    log(`[wipe-prod] To execute, re-run with ${ARG_LIVE}`);
    await pool.end();
    return;
  }

  log('[wipe-prod] LIVE RUN — this wipes prod.');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const table of TRUNCATE_ORDER) {
      await client.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
      log(`  wiped ${table}`);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  // auth.users cleanup — admin API only (RESEARCH Pitfall 3).
  const supabaseFactory =
    deps.createSupabase ??
    ((url: string, key: string) =>
      createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
      }) as unknown as NonNullable<WipeDeps['createSupabase']> extends (
        ...args: infer _A
      ) => infer R
        ? R
        : never);

  const supabase = supabaseFactory(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SECRET_KEY'),
  );
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  for (const u of data.users) {
    if (!u.email) continue;
    if (TEST_EMAIL_PREDICATE(u.email)) {
      await supabase.auth.admin.deleteUser(u.id);
      log(`  deleted auth user ${u.email}`);
    } else {
      warn(`  PRESERVED auth user ${u.email} (does not match test heuristic)`);
    }
  }
  await pool.end();
  log('[wipe-prod] Done.');
}

// Only auto-invoke when run as a script (not under tests).
const invokedDirectly =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1] !== undefined &&
  /scripts[\\/]wipe-prod\.(ts|js|mjs)$/.test(process.argv[1]);

if (invokedDirectly) {
  main().catch((err) => {
    console.error('[wipe-prod] FATAL:', err);
    process.exit(1);
  });
}
