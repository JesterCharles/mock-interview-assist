/**
 * Seed demo data: cohorts, curricula, associates, sessions, gap scores.
 *
 * Safe to re-run — all demo records are prefixed with `demo-` for slugs,
 * email `demo+<slug>@nlm.local`, and session IDs `demo-<slug>-sess-<n>`.
 * Wipe with: npx tsx scripts/wipe-demo-data.ts
 *
 * Usage:
 *   npx tsx scripts/seed-demo-data.ts
 */

import 'dotenv/config';
import { prisma } from '../src/lib/prisma.js';

type Readiness = 'ready' | 'improving' | 'not_ready' | 'pending';

const SKILLS: Array<{ name: string; slug: string; topics: string[] }> = [
  { name: 'React', slug: 'react', topics: ['hooks', 'state-management', 'rendering'] },
  { name: 'TypeScript', slug: 'typescript', topics: ['generics', 'utility-types', 'narrowing'] },
  { name: 'Node', slug: 'node', topics: ['async', 'streams', 'event-loop'] },
  { name: 'SQL', slug: 'sql', topics: ['joins', 'indexing', 'transactions'] },
  { name: 'Testing', slug: 'testing', topics: ['unit', 'integration', 'mocks'] },
  { name: 'System Design', slug: 'system-design', topics: ['caching', 'sharding', 'queues'] },
  { name: 'CSS', slug: 'css', topics: ['flexbox', 'grid', 'specificity'] },
  { name: 'API Testing', slug: 'api-testing', topics: ['rest', 'contracts', 'auth'] },
];

const FIRSTS = ['Ava', 'Noah', 'Mia', 'Liam', 'Zoe', 'Ethan', 'Leo', 'Ruby', 'Kai', 'Nina', 'Theo', 'Iris', 'Milo', 'Jade', 'Luca'];
const LASTS = ['Patel', 'Nguyen', 'Garcia', 'Kim', 'Silva', 'Ali', 'Brown', 'Cohen', 'Diaz', 'Ford', 'Hart', 'Ito', 'Jung', 'Khan', 'Leon'];

// Cohort names are `demo-*` prefixed so seed/wipe can never collide with real
// cohorts if this script runs against a prod-shaped DB.
const COHORTS: Array<{ name: string; startDaysAgo: number; endDaysFromNow?: number; weeks: number }> = [
  { name: 'demo-spring-26', startDaysAgo: 70, endDaysFromNow: 20, weeks: 8 },
  { name: 'demo-summer-26', startDaysAgo: 30, endDaysFromNow: 60, weeks: 8 },
  { name: 'demo-fall-26', startDaysAgo: 5, endDaysFromNow: 85, weeks: 8 },
];

function seededRng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function clamp01(n: number) {
  return Math.max(0.05, Math.min(0.98, n));
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86_400_000);
}

async function upsertCohort(
  name: string,
  startDaysAgo: number,
  endDaysFromNow: number | undefined,
  weekCount: number,
) {
  const existing = await prisma.cohort.findFirst({ where: { name } });
  const cohort = existing
    ? await prisma.cohort.update({
        where: { id: existing.id },
        data: {
          startDate: daysAgo(startDaysAgo),
          endDate: endDaysFromNow ? daysAgo(-endDaysFromNow) : null,
          description: `Demo cohort: ${name}`,
        },
      })
    : await prisma.cohort.create({
        data: {
          name,
          startDate: daysAgo(startDaysAgo),
          endDate: endDaysFromNow ? daysAgo(-endDaysFromNow) : null,
          description: `Demo cohort: ${name}`,
        },
      });

  await prisma.curriculumWeek.deleteMany({ where: { cohortId: cohort.id } });
  const taught = SKILLS.slice(0, weekCount);
  await prisma.curriculumWeek.createMany({
    data: taught.map((s, i) => ({
      cohortId: cohort.id,
      weekNumber: i + 1,
      skillName: s.name,
      skillSlug: s.slug,
      topicTags: s.topics,
      startDate: daysAgo(startDaysAgo - i * 7),
    })),
  });
  return cohort;
}

function pickReadiness(idx: number, total: number): Readiness {
  const r = idx / total;
  if (r < 0.2) return 'ready';
  if (r < 0.5) return 'improving';
  if (r < 0.8) return 'not_ready';
  return 'pending';
}

function sessionCountFor(status: Readiness, rng: () => number) {
  if (status === 'pending') return Math.floor(rng() * 2);
  if (status === 'ready') return 5 + Math.floor(rng() * 15);
  if (status === 'improving') return 4 + Math.floor(rng() * 10);
  return 3 + Math.floor(rng() * 7);
}

function baseScoreFor(status: Readiness) {
  if (status === 'ready') return 0.82;
  if (status === 'improving') return 0.62;
  if (status === 'not_ready') return 0.48;
  return 0.5;
}

function slopeFor(status: Readiness) {
  if (status === 'ready') return 0.01;
  if (status === 'improving') return 0.03;
  if (status === 'not_ready') return -0.01;
  return 0;
}

async function seedAssociate(opts: {
  index: number;
  totalInCohort: number;
  cohortId: number;
  cohortName: string;
  taughtSkills: typeof SKILLS;
}) {
  const { index, totalInCohort, cohortId, cohortName, taughtSkills } = opts;
  const first = FIRSTS[index % FIRSTS.length];
  const last = LASTS[(index * 3) % LASTS.length];
  const slug = `demo-${cohortName.toLowerCase()}-${first.toLowerCase()}-${last.toLowerCase()}-${index}`;
  const displayName = `${first} ${last}`;
  const email = `demo+${slug}@nlm.local`;
  const rng = seededRng(slug.split('').reduce((a, c) => a + c.charCodeAt(0), 0));
  const status = pickReadiness(index, totalInCohort);
  const sessionCount = sessionCountFor(status, rng);

  const associate = await prisma.associate.upsert({
    where: { slug },
    create: { slug, displayName, email, cohortId },
    update: { displayName, email, cohortId },
  });

  await prisma.session.deleteMany({ where: { associateId: associate.id, id: { startsWith: 'demo-' } } });
  await prisma.gapScore.deleteMany({ where: { associateId: associate.id } });

  const baseScore = baseScoreFor(status);
  const slope = slopeFor(status);

  // Generate sessions spread over ~60 days, most recent first in series
  const sessions: Array<{ id: string; score: number; softScore: number; when: Date; mode: string }> = [];
  for (let i = 0; i < sessionCount; i++) {
    const daysBack = Math.floor((60 / Math.max(sessionCount, 1)) * (sessionCount - i - 1)) + Math.floor(rng() * 3);
    const progress = sessionCount > 1 ? i / (sessionCount - 1) : 1;
    const score = clamp01(baseScore + slope * (i - sessionCount / 2) + (rng() - 0.5) * 0.08) * 100;
    const softScore = clamp01(baseScore + 0.1 + (rng() - 0.5) * 0.06) * 100;
    sessions.push({
      id: `demo-${slug}-sess-${i}`,
      score,
      softScore,
      when: daysAgo(daysBack),
      mode: rng() > 0.5 ? 'trainer-led' : 'automated',
    });
  }

  // Sort chronologically (oldest first) so createdAt reflects true order
  sessions.sort((a, b) => a.when.getTime() - b.when.getTime());

  const techMap: Record<number, string> = {};
  taughtSkills.forEach((s, i) => {
    techMap[i + 1] = s.name;
  });

  for (const s of sessions) {
    await prisma.session.create({
      data: {
        id: s.id,
        candidateName: displayName,
        interviewerName: 'Demo Trainer',
        date: s.when.toISOString().split('T')[0],
        status: 'completed',
        questionCount: 6,
        selectedWeeks: taughtSkills.slice(0, 6).map((_, i) => i + 1),
        overallTechnicalScore: s.score,
        overallSoftSkillScore: s.softScore,
        questions: [],
        starterQuestions: [],
        assessments: {},
        techMap,
        associateId: associate.id,
        cohortId,
        mode: s.mode,
        readinessRecomputeStatus: 'done',
        createdAt: s.when,
      },
    });
  }

  // Gap scores per taught skill — topic-level rows first, then derive
  // skill-level (topic="") as the mean of its topics so the UI is coherent.
  if (sessionCount > 0) {
    const gapRows: Array<{
      associateId: number;
      skill: string;
      topic: string;
      weightedScore: number;
      sessionCount: number;
    }> = [];
    taughtSkills.forEach((skill, idx) => {
      const skillBias = (idx - taughtSkills.length / 2) * 0.03;
      const skillCenter = clamp01(baseScore + skillBias + (rng() - 0.5) * 0.12);
      const topicScores: number[] = [];
      for (const topic of skill.topics) {
        const t = clamp01(skillCenter + (rng() - 0.5) * 0.14);
        topicScores.push(t);
        gapRows.push({
          associateId: associate.id,
          skill: skill.name,
          topic,
          weightedScore: t,
          sessionCount: Math.max(1, Math.floor(sessionCount / 2)),
        });
      }
      const skillAvg = topicScores.reduce((a, b) => a + b, 0) / topicScores.length;
      gapRows.push({
        associateId: associate.id,
        skill: skill.name,
        topic: '',
        weightedScore: skillAvg,
        sessionCount,
      });
    });
    await prisma.gapScore.createMany({ data: gapRows });
  }

  // Pre-populate readiness fields so UI shows state immediately
  const skillLevelAvg = sessionCount > 0 ? baseScore : 0;
  const recommendedArea =
    sessionCount > 0
      ? taughtSkills.reduce((worst, s, i) => {
          const bias = (i - taughtSkills.length / 2) * 0.03;
          return bias < worst.bias ? { name: s.name, bias } : worst;
        }, { name: taughtSkills[0]?.name ?? 'React', bias: Infinity }).name
      : null;

  await prisma.associate.update({
    where: { id: associate.id },
    data: {
      readinessStatus: status === 'pending' ? null : status,
      recommendedArea,
      lastComputedAt: new Date(),
    },
  });

  return { slug, status, sessionCount, avg: skillLevelAvg };
}

async function main() {
  console.log('Seeding demo data…');

  const results: Array<{ cohort: string; slug: string; status: Readiness; sessionCount: number }> = [];
  for (const c of COHORTS) {
    const cohort = await upsertCohort(c.name, c.startDaysAgo, c.endDaysFromNow, c.weeks);
    const taught = SKILLS.slice(0, c.weeks);
    const total = 15;
    console.log(`\nCohort ${cohort.name} (id=${cohort.id}) — seeding ${total} associates`);
    for (let i = 0; i < total; i++) {
      const r = await seedAssociate({
        index: i,
        totalInCohort: total,
        cohortId: cohort.id,
        cohortName: cohort.name,
        taughtSkills: taught,
      });
      results.push({ cohort: cohort.name, slug: r.slug, status: r.status, sessionCount: r.sessionCount });
    }
  }

  const byStatus = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});
  const totalSessions = results.reduce((a, r) => a + r.sessionCount, 0);

  console.log('\nDone.');
  console.log(`Cohorts: ${COHORTS.length}`);
  console.log(`Associates: ${results.length}`);
  console.log(`Sessions: ${totalSessions}`);
  console.log('Readiness distribution:', byStatus);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
