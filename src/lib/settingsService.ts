/**
 * Settings Service
 *
 * Provides read/write access to the singleton Settings row (id=1).
 * Used by /api/settings route to let trainers configure the readiness threshold
 * at runtime without code changes.
 *
 * After threshold update, triggers bulk recompute of all associate readiness
 * badges via recomputeAllReadiness().
 */

import { prisma } from '@/lib/prisma';
import { recomputeAllReadiness } from '@/lib/readinessService';

export interface AppSettings {
  readinessThreshold: number;
}

/**
 * Returns the current app settings.
 * Falls back to { readinessThreshold: 75 } when no Settings row exists yet.
 */
export async function getSettings(): Promise<AppSettings> {
  const settings = await prisma.settings.findFirst({ where: { id: 1 } });
  return {
    readinessThreshold: settings?.readinessThreshold ?? 75,
  };
}

/**
 * Upserts the Settings row with the new threshold, then triggers a full
 * recompute of all associate readiness badges.
 *
 * Synchronous batch recompute is safe for MVP (<200 associates).
 * If scale grows, move to a background task (e.g., BullMQ, Supabase Edge Function).
 *
 * @param newThreshold - New readiness threshold (0-100), validated by caller
 */
export async function updateThreshold(newThreshold: number): Promise<void> {
  await prisma.settings.upsert({
    where: { id: 1 },
    create: { id: 1, readinessThreshold: newThreshold },
    update: { readinessThreshold: newThreshold },
  });
  // Bulk recompute all associates with new threshold
  await recomputeAllReadiness(newThreshold);
}
