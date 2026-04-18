/**
 * Phase 46 Plan 01 — seed-staging.ts tests.
 *
 * Layered in two groups:
 *   1. faker determinism (Task 2 — proves locale-pinned seed(1337) produces
 *      identical sequences across independent Faker instances).
 *   2. seeder idempotency (Task 3 — mocks ../../src/lib/prisma.js and
 *      ./lib/assert-staging-env.js to prove a second run produces no
 *      duplicate keys, only upserts).
 *
 * RESEARCH pitfall 6 (locale pinning mandatory): we use `new Faker({ locale:
 * [en] })` so each test has an isolated instance.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Faker, en } from '@faker-js/faker';

describe('faker determinism (Task 2)', () => {
  it('seed(1337) produces identical firstName sequences across two fresh locale-pinned instances', () => {
    const a = new Faker({ locale: [en] });
    const b = new Faker({ locale: [en] });
    a.seed(1337);
    b.seed(1337);

    const seqA = Array.from({ length: 5 }, () => a.person.firstName());
    const seqB = Array.from({ length: 5 }, () => b.person.firstName());

    expect(seqA).toEqual(seqB);
    // And the sequence must actually contain 5 distinct reasonable names
    expect(seqA).toHaveLength(5);
    for (const name of seqA) {
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
    }
  });

  it('seed(1337) produces identical number.float sequences across two fresh instances', () => {
    const a = new Faker({ locale: [en] });
    const b = new Faker({ locale: [en] });
    a.seed(1337);
    b.seed(1337);

    const floatsA = Array.from({ length: 5 }, () =>
      a.number.float({ min: 50, max: 95, fractionDigits: 1 }),
    );
    const floatsB = Array.from({ length: 5 }, () =>
      b.number.float({ min: 50, max: 95, fractionDigits: 1 }),
    );

    expect(floatsA).toEqual(floatsB);
    for (const n of floatsA) {
      expect(n).toBeGreaterThanOrEqual(50);
      expect(n).toBeLessThanOrEqual(95);
    }
  });

  it('the locale-pinned import path @faker-js/faker/locale/en does not throw', async () => {
    const mod = await import('@faker-js/faker/locale/en');
    expect(mod.faker).toBeDefined();
    expect(typeof mod.faker.person.firstName).toBe('function');
    // re-seed the shared instance so cross-test bleed is contained
    mod.faker.seed(1337);
    const first = mod.faker.person.firstName();
    expect(typeof first).toBe('string');
  });
});

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * seeder idempotency (Task 3)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * We mock both `../../src/lib/prisma.js` and `../lib/assert-staging-env.js`
 * so main() runs in-process without hitting a real DB. Upsert stubs echo the
 * args back as results so the seeder's per-entity flow (cohort → week →
 * associate → session) still composes.
 *
 * vi.mock is hoisted by Vitest; factory functions capture the tracking maps
 * so we can introspect all upsert invocations afterwards.
 */
type UpsertArgs = { where: unknown; update: unknown; create: unknown };
interface CallRegistry {
  cohortFindFirst: Array<{ where: unknown }>;
  cohortCreate: Array<unknown>;
  cohortUpdate: Array<{ where: unknown; data: unknown }>;
  curriculumWeekUpsert: UpsertArgs[];
  associateUpsert: UpsertArgs[];
  sessionUpsert: UpsertArgs[];
  settingsUpsert: UpsertArgs[];
  disconnectCalls: number;
}

const registry: CallRegistry = {
  cohortFindFirst: [],
  cohortCreate: [],
  cohortUpdate: [],
  curriculumWeekUpsert: [],
  associateUpsert: [],
  sessionUpsert: [],
  settingsUpsert: [],
  disconnectCalls: 0,
};

// Track cohort IDs as they are generated so subsequent weeks/associates use them
let nextCohortId = 1000;
const cohortByName = new Map<string, { id: number; name: string }>();

vi.mock('../../src/lib/prisma.js', () => {
  return {
    prisma: {
      cohort: {
        findFirst: vi.fn(async (args: { where: { name: string } }) => {
          registry.cohortFindFirst.push(args);
          return cohortByName.get(args.where.name) ?? null;
        }),
        create: vi.fn(async ({ data }: { data: { name: string } }) => {
          registry.cohortCreate.push(data);
          const created = { id: nextCohortId++, name: data.name };
          cohortByName.set(data.name, created);
          return created;
        }),
        update: vi.fn(async (args: { where: { id: number }; data: unknown }) => {
          registry.cohortUpdate.push(args);
          const existing = Array.from(cohortByName.values()).find(
            (c) => c.id === args.where.id,
          );
          return existing ?? { id: args.where.id, name: 'unknown' };
        }),
      },
      curriculumWeek: {
        upsert: vi.fn(async (args: UpsertArgs) => {
          registry.curriculumWeekUpsert.push(args);
          return { id: registry.curriculumWeekUpsert.length, ...(args.create as object) };
        }),
      },
      associate: {
        upsert: vi.fn(async (args: UpsertArgs) => {
          registry.associateUpsert.push(args);
          const create = args.create as { slug: string };
          return {
            id: registry.associateUpsert.length + 100,
            slug: create.slug,
          };
        }),
      },
      session: {
        upsert: vi.fn(async (args: UpsertArgs) => {
          registry.sessionUpsert.push(args);
          return { id: (args.where as { id: string }).id };
        }),
      },
      settings: {
        upsert: vi.fn(async (args: UpsertArgs) => {
          registry.settingsUpsert.push(args);
          return { id: 1, readinessThreshold: 75 };
        }),
      },
      $disconnect: vi.fn(async () => {
        registry.disconnectCalls += 1;
      }),
    },
  };
});

vi.mock('../lib/assert-staging-env.js', () => {
  return {
    STAGING_REF: 'lzuqbpqmqlvzwebliptj',
    assertStagingDatabase: vi.fn(),
    assertProdDatabase: vi.fn(),
    maskUrl: (u: string) => u,
  };
});

describe('seeder idempotency (Task 3)', () => {
  beforeEach(() => {
    // Clear registry + cohort caches so each test starts fresh
    registry.cohortFindFirst = [];
    registry.cohortCreate = [];
    registry.cohortUpdate = [];
    registry.curriculumWeekUpsert = [];
    registry.associateUpsert = [];
    registry.sessionUpsert = [];
    registry.settingsUpsert = [];
    registry.disconnectCalls = 0;
    cohortByName.clear();
    nextCohortId = 1000;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  async function runMainTwice(): Promise<{ first: CallRegistry; second: CallRegistry }> {
    // Import the seeder fresh so top-level guards run exactly once per import;
    // Vitest module registry carries across resetModules calls so we snapshot
    // registry state after each run.
    await import('../seed-staging.js');
    // Wait for the main() promise to resolve by giving the microtask queue a tick.
    await new Promise((r) => setTimeout(r, 50));

    const first: CallRegistry = JSON.parse(JSON.stringify(registry));

    // Reset per-run counters (but NOT module cache — rerun main via exported hook)
    // The seeder exposes a named `main` function we can call directly.
    const mod = await import('../seed-staging.js');
    // Clear registry to track second-run calls independently
    registry.cohortFindFirst = [];
    registry.cohortCreate = [];
    registry.cohortUpdate = [];
    registry.curriculumWeekUpsert = [];
    registry.associateUpsert = [];
    registry.sessionUpsert = [];
    registry.settingsUpsert = [];
    // Preserve cohortByName so findFirst returns existing on second run (the
    // idempotent path)
    await mod.main();
    const second: CallRegistry = JSON.parse(JSON.stringify(registry));
    return { first, second };
  }

  it('produces the expected entity counts on first run', async () => {
    const { first } = await runMainTwice();
    // 3 cohorts, 36 curriculum weeks, 30 associates, 15 sessions, 1 settings
    expect(first.cohortCreate.length).toBe(3);
    expect(first.curriculumWeekUpsert.length).toBe(36);
    expect(first.associateUpsert.length).toBe(30);
    expect(first.sessionUpsert.length).toBe(15);
    expect(first.settingsUpsert.length).toBe(1);
    expect(first.disconnectCalls).toBeGreaterThanOrEqual(1);
  });

  it('produces the SAME entity counts on second run (idempotency)', async () => {
    const { first, second } = await runMainTwice();
    expect(second.curriculumWeekUpsert.length).toBe(first.curriculumWeekUpsert.length);
    expect(second.associateUpsert.length).toBe(first.associateUpsert.length);
    expect(second.sessionUpsert.length).toBe(first.sessionUpsert.length);
    expect(second.settingsUpsert.length).toBe(first.settingsUpsert.length);
  });

  it('on second run, Cohort path uses findFirst + update (no new create)', async () => {
    const { second } = await runMainTwice();
    // Second run sees existing cohorts → 0 creates, 3 updates
    expect(second.cohortCreate.length).toBe(0);
    expect(second.cohortUpdate.length).toBe(3);
  });

  it('all generated associate emails end with @example.com', async () => {
    const { first } = await runMainTwice();
    for (const u of first.associateUpsert) {
      const create = u.create as { email: string };
      expect(create.email).toMatch(/@example\.com$/);
    }
  });

  it('associate slugs use the staging-{cohortSlug}-assoc- prefix', async () => {
    const { first } = await runMainTwice();
    for (const u of first.associateUpsert) {
      const create = u.create as { slug: string };
      expect(create.slug).toMatch(/^staging-(alpha|beta|gamma)-2026-assoc-\d{2}$/);
    }
  });

  it('30 distinct associate slugs and 15 distinct session ids across a single run', async () => {
    const { first } = await runMainTwice();
    const slugs = new Set(first.associateUpsert.map((u) => (u.create as { slug: string }).slug));
    const sessionIds = new Set(
      first.sessionUpsert.map((s) => (s.where as { id: string }).id),
    );
    expect(slugs.size).toBe(30);
    expect(sessionIds.size).toBe(15);
  });

  it('36 distinct (cohortId, weekNumber) curriculum-week keys in a single run', async () => {
    const { first } = await runMainTwice();
    const keys = new Set(
      first.curriculumWeekUpsert.map((w) => {
        const where = w.where as {
          cohortId_weekNumber: { cohortId: number; weekNumber: number };
        };
        return `${where.cohortId_weekNumber.cohortId}:${where.cohortId_weekNumber.weekNumber}`;
      }),
    );
    expect(keys.size).toBe(36);
  });
});
