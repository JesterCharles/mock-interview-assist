/**
 * curriculumService.ts
 *
 * Pure DB access functions for curriculum weeks.
 * Wraps prisma.curriculumWeek with typed inputs and slug validation.
 *
 * IMPORTANT: Prisma P2002 (unique-constraint) errors are NOT caught here.
 * Route handlers translate P2002 → HTTP 409 (Codex finding #9, D-24).
 */

import { prisma } from '@/lib/prisma';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CurriculumWeek {
  id: number;
  cohortId: number;
  weekNumber: number;
  skillName: string;
  skillSlug: string;
  topicTags: string[];
  startDate: Date;
}

export interface CurriculumWeekInput {
  weekNumber: number;
  skillName: string;
  skillSlug: string;
  topicTags: string[];
  startDate: Date;
}

export type CurriculumWeekUpdateInput = Partial<CurriculumWeekInput>;

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/**
 * skillSlug: required, lowercase-kebab, 1..50 chars.
 * Matches GitHub folder names exactly (e.g. "react", "node-js", "postgresql").
 * Must start with a lowercase letter or digit.
 */
const SLUG_REGEX = /^[a-z0-9][a-z0-9-]*$/;

function validateInput(input: CurriculumWeekInput): void {
  if (!input.skillSlug || !SLUG_REGEX.test(input.skillSlug) || input.skillSlug.length > 50) {
    throw new Error(
      'skillSlug is required and must be lowercase-kebab (a-z, 0-9, hyphens), starting with a letter or digit, max 50 chars'
    );
  }
  if (!input.skillName || input.skillName.length === 0 || input.skillName.length > 80) {
    throw new Error('skillName is required and must be 1–80 characters');
  }
  if (!Number.isInteger(input.weekNumber) || input.weekNumber < 1) {
    throw new Error('weekNumber must be an integer >= 1');
  }
}

function validateUpdateInput(input: CurriculumWeekUpdateInput): void {
  if (input.skillSlug !== undefined) {
    if (!input.skillSlug || !SLUG_REGEX.test(input.skillSlug) || input.skillSlug.length > 50) {
      throw new Error(
        'skillSlug must be lowercase-kebab (a-z, 0-9, hyphens), starting with a letter or digit, max 50 chars'
      );
    }
  }
  if (input.skillName !== undefined) {
    if (!input.skillName || input.skillName.length === 0 || input.skillName.length > 80) {
      throw new Error('skillName must be 1–80 characters');
    }
  }
  if (input.weekNumber !== undefined) {
    if (!Number.isInteger(input.weekNumber) || input.weekNumber < 1) {
      throw new Error('weekNumber must be an integer >= 1');
    }
  }
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Returns all curriculum weeks for a cohort, ordered by weekNumber ascending.
 */
export async function listWeeks(cohortId: number): Promise<CurriculumWeek[]> {
  return prisma.curriculumWeek.findMany({
    where: { cohortId },
    orderBy: { weekNumber: 'asc' },
  });
}

/**
 * Returns only weeks where startDate <= now (the "taught" weeks).
 * Boundary: a week starting exactly at now is included (lte).
 *
 * @param cohortId - The cohort to filter by
 * @param now - Reference timestamp, defaults to current Date
 */
export async function getTaughtWeeks(
  cohortId: number,
  now: Date = new Date()
): Promise<CurriculumWeek[]> {
  return prisma.curriculumWeek.findMany({
    where: { cohortId, startDate: { lte: now } },
    orderBy: { weekNumber: 'asc' },
  });
}

/**
 * Creates a new curriculum week for a cohort.
 *
 * Validates skillSlug, skillName, weekNumber before writing.
 * Does NOT catch P2002 — route handler maps it to 409.
 */
export async function createWeek(
  cohortId: number,
  input: CurriculumWeekInput
): Promise<CurriculumWeek> {
  validateInput(input);

  return prisma.curriculumWeek.create({
    data: {
      cohortId,
      weekNumber: input.weekNumber,
      skillName: input.skillName,
      skillSlug: input.skillSlug,
      topicTags: input.topicTags ?? [],
      startDate: input.startDate,
    },
  });
}

/**
 * Partially updates a curriculum week.
 *
 * Validates slug/name/weekNumber only if they are present in the update.
 * Does NOT catch P2002 — route handler maps it to 409.
 */
export async function updateWeek(
  weekId: number,
  input: CurriculumWeekUpdateInput
): Promise<CurriculumWeek> {
  validateUpdateInput(input);

  return prisma.curriculumWeek.update({
    where: { id: weekId },
    data: input,
  });
}

/**
 * Deletes a curriculum week by ID.
 */
export async function deleteWeek(weekId: number): Promise<CurriculumWeek> {
  return prisma.curriculumWeek.delete({
    where: { id: weekId },
  });
}
