/**
 * Readiness Sweep (Codex finding #5 repair path)
 *
 * Finds Sessions whose readinessRecomputeStatus is 'pending' or 'failed',
 * groups them by associateId, and re-runs the readiness pipeline ONCE per
 * associate. Extra sessions for the same associate are closed out via
 * updateMany after a successful recompute (one pipeline run covers all of
 * that associate's outstanding markers).
 *
 * Bounded by batchSize (default 50) to keep the request time predictable.
 * Per-associate try/catch ensures one bad actor does not abort the batch.
 *
 * Idempotent — running twice with no new failures yields zero examined on
 * the second run.
 */

import { prisma } from '@/lib/prisma';
import { runReadinessPipeline } from '@/lib/readinessPipeline';

const DEFAULT_BATCH_SIZE = 50;
const LOG_PREFIX = '[readiness-sweep]';

export interface SweepResult {
  associatesProcessed: number;
  sessionsExaminedCount: number;
  successCount: number;
  failureCount: number;
}

export async function runReadinessSweep(
  opts?: { batchSize?: number },
): Promise<SweepResult> {
  const batchSize = opts?.batchSize ?? DEFAULT_BATCH_SIZE;

  const rows = await prisma.session.findMany({
    where: {
      readinessRecomputeStatus: { in: ['pending', 'failed'] },
      associateId: { not: null },
    },
    select: { id: true, associateId: true },
    orderBy: { createdAt: 'asc' },
  });

  if (rows.length === 0) {
    return {
      associatesProcessed: 0,
      sessionsExaminedCount: 0,
      successCount: 0,
      failureCount: 0,
    };
  }

  // Group session ids by associateId, preserving asc-by-createdAt order.
  const byAssociate = new Map<number, string[]>();
  for (const row of rows) {
    if (row.associateId == null) continue;
    const arr = byAssociate.get(row.associateId) ?? [];
    arr.push(row.id);
    byAssociate.set(row.associateId, arr);
  }

  // Take at most `batchSize` distinct associates. Map preserves insertion order.
  const batch: Array<[number, string[]]> = [];
  for (const entry of byAssociate) {
    if (batch.length >= batchSize) break;
    batch.push(entry);
  }

  const sessionsExaminedCount = batch.reduce((sum, [, ids]) => sum + ids.length, 0);

  let successCount = 0;
  let failureCount = 0;

  for (const [associateId, sessionIds] of batch) {
    // Most recent session = last in asc list = marker passed to pipeline.
    const markerId = sessionIds[sessionIds.length - 1];
    try {
      // runReadinessPipeline swallows its own errors and returns false; an
      // unexpected throw falls through to the catch block below. Only close
      // out sibling markers when the pipeline actually succeeded (Codex P2).
      const ok = await runReadinessPipeline(associateId, markerId);
      if (!ok) {
        console.error(
          `${LOG_PREFIX} associate ${associateId} pipeline returned false — leaving sibling markers for retry`,
        );
        failureCount += 1;
        continue;
      }
      if (sessionIds.length > 1) {
        await prisma.session.updateMany({
          where: {
            associateId,
            readinessRecomputeStatus: { in: ['pending', 'failed'] },
            id: { not: markerId },
          },
          data: { readinessRecomputeStatus: 'done' },
        });
      }
      successCount += 1;
    } catch (err) {
      console.error(
        `${LOG_PREFIX} associate ${associateId} threw (marker session ${markerId}):`,
        err,
      );
      failureCount += 1;
    }
  }

  return {
    associatesProcessed: batch.length,
    sessionsExaminedCount,
    successCount,
    failureCount,
  };
}
