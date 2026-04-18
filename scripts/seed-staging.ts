/**
 * Phase 46 Plan 01 Task 3 — Staging Supabase seeder (D-07, D-08, D-09, D-10, D-11).
 *
 * Idempotent: every mutating op is either prisma.*.upsert keyed on @unique or
 * findFirst + update/create (Cohort, which has no @unique beyond id).
 * Deterministic: @faker-js/faker/locale/en with seed(1337) — re-runs produce
 * identical identities and scores.
 * Safe: assertStagingDatabase() is the FIRST statement of main(); the seeder
 * refuses to run unless DATABASE_URL references lzuqbpqmqlvzwebliptj.
 *
 * Usage:
 *   npm run seed-staging
 *   # or
 *   npx tsx scripts/seed-staging.ts
 *
 * Populates:
 *   3 Cohorts (alpha/beta/gamma 2026)
 *   30 Associates (10 per cohort, staging-prefixed slugs, @example.com)
 *   36 CurriculumWeeks (12 weeks × 3 cohorts, skill rotation)
 *   15 Sessions (every other associate gets 1 session, mixed modes)
 *   1 Settings singleton (readinessThreshold=75)
 *
 * CodingChallenges are TODO(46-03) — require bank-slug selection (Plan 03).
 */

import 'dotenv/config';
import { faker } from '@faker-js/faker/locale/en';
import { prisma } from '../src/lib/prisma.js';
import { assertStagingDatabase } from './lib/assert-staging-env.js';

// D-11 — mandatory staging guard.
// D-09 — deterministic seed BEFORE any faker.* call.
// When imported by tests these are no-ops (mocked) — safe in both contexts.
assertStagingDatabase();
faker.seed(1337);

const COHORT_SPECS = [
  { slug: 'alpha-2026', name: 'Alpha 2026', startDate: new Date('2026-01-15'), weeks: 12 },
  { slug: 'beta-2026', name: 'Beta 2026', startDate: new Date('2026-02-15'), weeks: 12 },
  { slug: 'gamma-2026', name: 'Gamma 2026', startDate: new Date('2026-03-15'), weeks: 12 },
] as const;

const SKILLS_12 = [
  { name: 'React', slug: 'react', topics: ['hooks', 'state', 'rendering'] },
  { name: 'TypeScript', slug: 'typescript', topics: ['generics', 'narrowing', 'utility-types'] },
  { name: 'Node', slug: 'node', topics: ['async', 'event-loop', 'streams'] },
  { name: 'Next.js', slug: 'nextjs', topics: ['routing', 'rsc', 'caching'] },
  { name: 'SQL', slug: 'sql', topics: ['joins', 'indexing', 'transactions'] },
  { name: 'Testing', slug: 'testing', topics: ['unit', 'integration', 'mocks'] },
  { name: 'Python', slug: 'python', topics: ['stdlib', 'typing', 'asyncio'] },
  { name: 'JavaScript', slug: 'javascript', topics: ['closures', 'promises', 'iterators'] },
  { name: 'Java', slug: 'java', topics: ['oop', 'streams', 'generics'] },
  { name: 'System Design', slug: 'system-design', topics: ['caching', 'sharding', 'queues'] },
  { name: 'API Testing', slug: 'api-testing', topics: ['rest', 'auth', 'contracts'] },
  { name: 'CSS', slug: 'css', topics: ['flex', 'grid', 'specificity'] },
] as const;

type CohortSpec = typeof COHORT_SPECS[number];

async function upsertCohort(spec: CohortSpec) {
  // Cohort has no @unique beyond id (RESEARCH Pitfall 7) — findFirst + update/create
  const existing = await prisma.cohort.findFirst({ where: { name: spec.name } });
  if (existing) {
    return prisma.cohort.update({
      where: { id: existing.id },
      data: {
        startDate: spec.startDate,
        description: `Staging seed: ${spec.slug}`,
      },
    });
  }
  return prisma.cohort.create({
    data: {
      name: spec.name,
      startDate: spec.startDate,
      description: `Staging seed: ${spec.slug}`,
    },
  });
}

async function upsertCurriculumWeek(cohortId: number, weekNumber: number, spec: CohortSpec) {
  const skill = SKILLS_12[(weekNumber - 1) % SKILLS_12.length];
  return prisma.curriculumWeek.upsert({
    where: { cohortId_weekNumber: { cohortId, weekNumber } },
    update: {
      skillName: skill.name,
      skillSlug: skill.slug,
      topicTags: [...skill.topics],
    },
    create: {
      cohortId,
      weekNumber,
      skillName: skill.name,
      skillSlug: skill.slug,
      topicTags: [...skill.topics],
      startDate: new Date(spec.startDate.getTime() + (weekNumber - 1) * 7 * 86_400_000),
    },
  });
}

async function upsertAssociate(cohortId: number, cohortSlug: string, i: number) {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const slug = `staging-${cohortSlug}-assoc-${i.toString().padStart(2, '0')}`;
  const email = `${slug}@example.com`; // D-06 test-heuristic compliant
  return prisma.associate.upsert({
    where: { slug },
    update: { displayName: `${firstName} ${lastName}`, email, cohortId },
    create: { slug, displayName: `${firstName} ${lastName}`, email, cohortId },
  });
}

async function upsertSession(associateId: number, cohortId: number, ix: number) {
  const id = `staging-sess-${associateId}-${ix}`;
  const tech = faker.number.float({ min: 50, max: 95, fractionDigits: 1 });
  const soft = faker.number.float({ min: 55, max: 90, fractionDigits: 1 });
  const techMap: Record<number, string> = {
    1: 'React',
    2: 'TypeScript',
    3: 'Node',
    4: 'SQL',
    5: 'Testing',
    6: 'Next.js',
  };
  return prisma.session.upsert({
    where: { id },
    update: { overallTechnicalScore: tech, overallSoftSkillScore: soft },
    create: {
      id,
      candidateName: null,
      interviewerName: 'Staging Seed',
      date: new Date().toISOString().split('T')[0],
      status: 'completed',
      questionCount: 6,
      selectedWeeks: [1, 2, 3, 4, 5, 6],
      overallTechnicalScore: tech,
      overallSoftSkillScore: soft,
      questions: [],
      starterQuestions: [],
      assessments: {},
      techMap,
      associateId,
      cohortId,
      mode: ix % 2 === 0 ? 'trainer-led' : 'automated',
      readinessRecomputeStatus: 'done',
    },
  });
}

async function upsertSettings() {
  return prisma.settings.upsert({
    where: { id: 1 },
    update: { readinessThreshold: 75 },
    create: { id: 1, readinessThreshold: 75 },
  });
}

/**
 * Exported for tests — they mock the prisma + guard modules and invoke main()
 * directly to assert idempotency across two runs.
 */
export async function main(): Promise<{
  cohorts: number;
  associates: number;
  weeks: number;
  sessions: number;
  settings: number;
}> {
  const counts = { cohorts: 0, associates: 0, weeks: 0, sessions: 0, settings: 0 };

  for (const spec of COHORT_SPECS) {
    const cohort = await upsertCohort(spec);
    counts.cohorts += 1;

    for (let w = 1; w <= spec.weeks; w++) {
      await upsertCurriculumWeek(cohort.id, w, spec);
      counts.weeks += 1;
    }

    for (let i = 0; i < 10; i++) {
      const assoc = await upsertAssociate(cohort.id, spec.slug, i);
      counts.associates += 1;

      // 5 sessions per cohort × 3 cohorts = 15 total
      if (i % 2 === 0) {
        await upsertSession(assoc.id, cohort.id, Math.floor(i / 2));
        counts.sessions += 1;
      }
    }
  }

  await upsertSettings();
  counts.settings += 1;

  // TODO(46-03): import 10 stable challenge slugs from coding bank manifest
  //              + seed 2-3 CodingAttempts each. D-08 ten challenges deferred
  //              until the bank-slug selection lands.

  console.log('[seed-staging] Done:', counts);
  return counts;
}

// Only auto-invoke when run as a script (not when imported by tests).
// When imported under vitest, `import.meta.url` includes the test harness
// path; we gate on a direct `tsx scripts/seed-staging.ts` invocation.
const invokedDirectly =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1] !== undefined &&
  /scripts[\\/]seed-staging\.(ts|js|mjs)$/.test(process.argv[1]);

if (invokedDirectly) {
  main()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (err) => {
      console.error('[seed-staging] FATAL:', err);
      await prisma.$disconnect();
      process.exit(1);
    });
}
