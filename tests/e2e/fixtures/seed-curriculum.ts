/**
 * seed-curriculum.ts
 *
 * Test fixture helpers for seeding and tearing down curriculum data in Prisma.
 * Used by setup-wizard-curriculum.spec.ts.
 *
 * Each test that uses these helpers should call cleanup() in afterEach/afterAll.
 */

import { PrismaClient } from '../../../src/generated/prisma';

const prisma = new PrismaClient();

export interface SeededCohort {
  cohortId: number;
  associateId: number;
  associateSlug: string;
}

/**
 * Seeds a cohort with the given curriculum weeks and an associate linked to it.
 * Returns IDs for cleanup and assertion.
 *
 * @param associateSlug - Unique slug for the test associate (must not already exist)
 * @param weeks         - Curriculum weeks to create (skillSlug, skillName, weekNumber, startDate)
 */
export async function seedCohortWithCurriculum(
  associateSlug: string,
  weeks: Array<{
    weekNumber: number;
    skillName: string;
    skillSlug: string;
    startDate: Date;
  }>
): Promise<SeededCohort> {
  const cohort = await prisma.cohort.create({
    data: {
      name: `Test Cohort (${associateSlug})`,
      startDate: new Date('2026-01-01'),
      curriculumWeeks: {
        create: weeks.map(w => ({
          weekNumber: w.weekNumber,
          skillName: w.skillName,
          skillSlug: w.skillSlug,
          topicTags: [],
          startDate: w.startDate,
        })),
      },
    },
  });

  const associate = await prisma.associate.create({
    data: {
      slug: associateSlug,
      displayName: `Test Associate ${associateSlug}`,
      cohortId: cohort.id,
    },
  });

  return { cohortId: cohort.id, associateId: associate.id, associateSlug };
}

/**
 * Removes seeded cohort and associate by cohortId/associateId.
 * Order: delete associate first (FK to cohort), then cohort (cascades curriculumWeeks).
 */
export async function cleanupSeedCohort(seeded: SeededCohort): Promise<void> {
  try {
    await prisma.associate.deleteMany({ where: { id: seeded.associateId } });
    await prisma.cohort.deleteMany({ where: { id: seeded.cohortId } });
  } catch {
    // Best-effort cleanup — don't fail tests on cleanup errors
    console.warn('[seed-curriculum] cleanup partial failure, manual cleanup may be needed');
  } finally {
    await prisma.$disconnect();
  }
}
