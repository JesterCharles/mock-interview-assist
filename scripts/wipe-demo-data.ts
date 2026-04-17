/**
 * Wipe all demo data seeded by scripts/seed-demo-data.ts.
 *
 * Matches (all keyed on the `demo-` prefix so this is impossible to run
 * against real data):
 *   - Associate.slug LIKE 'demo-%'
 *   - Session.id LIKE 'demo-%'
 *   - Cohort.name LIKE 'demo-%'
 *
 * Usage:
 *   npx tsx scripts/wipe-demo-data.ts
 */

import 'dotenv/config';
import { prisma } from '../src/lib/prisma.js';

async function main() {
  console.log('Wiping demo data…');

  const demoAssociates = await prisma.associate.findMany({
    where: { slug: { startsWith: 'demo-' } },
    select: { id: true },
  });
  const ids = demoAssociates.map((a) => a.id);
  console.log(`Demo associates: ${ids.length}`);

  const { count: sessionsDeleted } = await prisma.session.deleteMany({
    where: { OR: [{ id: { startsWith: 'demo-' } }, { associateId: { in: ids } }] },
  });
  console.log(`Sessions deleted: ${sessionsDeleted}`);

  const { count: gapsDeleted } = await prisma.gapScore.deleteMany({
    where: { associateId: { in: ids } },
  });
  console.log(`Gap scores deleted: ${gapsDeleted}`);

  const { count: assocDeleted } = await prisma.associate.deleteMany({
    where: { slug: { startsWith: 'demo-' } },
  });
  console.log(`Associates deleted: ${assocDeleted}`);

  const demoCohorts = await prisma.cohort.findMany({
    where: { name: { startsWith: 'demo-' } },
    select: { id: true },
  });
  const cohortIds = demoCohorts.map((c) => c.id);
  const { count: weeksDeleted } = await prisma.curriculumWeek.deleteMany({
    where: { cohortId: { in: cohortIds } },
  });
  const { count: cohortsDeleted } = await prisma.cohort.deleteMany({
    where: { name: { startsWith: 'demo-' } },
  });
  console.log(`Curriculum weeks deleted: ${weeksDeleted}`);
  console.log(`Cohorts deleted: ${cohortsDeleted}`);

  await prisma.$disconnect();
  console.log('Done.');
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
