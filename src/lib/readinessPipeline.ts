/**
 * Readiness Pipeline
 *
 * Shared helper that runs the gap-score + readiness recompute fan-out after
 * a session has been persisted. Tracks progress via the DB-backed
 * `Session.readinessRecomputeStatus` marker so the sweep endpoint (Plan 10-03)
 * can repair any session whose pipeline failed.
 *
 * Contract:
 *   - If `sessionId` provided: transitions readinessRecomputeStatus
 *       pending → done (success) | failed (error caught)
 *   - If `sessionId` omitted: legacy trainer-led path, does NOT touch marker
 *   - Never re-throws — fire-and-forget from API routes
 */

import { prisma } from '@/lib/prisma';
import { saveGapScores } from '@/lib/gapPersistence';
import { updateAssociateReadiness } from '@/lib/readinessService';
import { getSettings } from '@/lib/settingsService';

const DEFAULT_THRESHOLD = 75;
const LOG_PREFIX = '[readiness-pipeline]';

async function markStatus(
  sessionId: string | undefined,
  status: 'pending' | 'done' | 'failed',
): Promise<void> {
  if (sessionId === undefined) return;
  try {
    await prisma.session.update({
      where: { id: sessionId },
      data: { readinessRecomputeStatus: status },
    });
  } catch (err) {
    // Marker update failures must not crash the helper — the sweep endpoint
    // will still find and repair stuck sessions via the status column.
    console.error(`${LOG_PREFIX} failed to mark session ${sessionId} as ${status}:`, err);
  }
}

export async function runReadinessPipeline(
  associateId: number,
  sessionId?: string,
): Promise<void> {
  await markStatus(sessionId, 'pending');

  let threshold = DEFAULT_THRESHOLD;
  try {
    const settings = await getSettings();
    if (typeof settings?.readinessThreshold === 'number') {
      threshold = settings.readinessThreshold;
    }
  } catch (err) {
    console.error(`${LOG_PREFIX} getSettings failed, falling back to ${DEFAULT_THRESHOLD}:`, err);
  }

  try {
    await saveGapScores(associateId);
    await updateAssociateReadiness(associateId, threshold);
    await markStatus(sessionId, 'done');
  } catch (err) {
    console.error(`${LOG_PREFIX} failed for associate ${associateId} session ${sessionId}:`, err);
    await markStatus(sessionId, 'failed');
    // Do NOT re-throw — caller is fire-and-forget.
  }
}
