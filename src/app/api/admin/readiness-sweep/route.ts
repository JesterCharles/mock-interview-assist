import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isAuthenticatedSession } from '@/lib/auth-server';
import { runReadinessSweep } from '@/lib/readinessSweep';

/**
 * Admin: Readiness Recompute Sweep (Codex finding #5)
 *
 * POST /api/admin/readiness-sweep?batchSize=50
 *
 * Trainer-auth guarded endpoint that reprocesses Sessions whose
 * `readinessRecomputeStatus` is 'pending' or 'failed'. Groups sessions by
 * associateId and runs `runReadinessPipeline` once per associate.
 *
 * Idempotent — safe to re-run. Bounded by batchSize (default 50, max 200).
 *
 * Designed to be called by:
 *   - Manual trainer button (admin tooling)
 *   - External cron (GCE cron job, Cloud Scheduler, GitHub Actions schedule)
 *
 * Example cron invocation:
 *   curl -X POST https://example.com/api/admin/readiness-sweep?batchSize=50 \
 *     -H "Cookie: nlm_session=authenticated"
 *
 * Threat model: T-10-11 (EoP — trainer-auth), T-10-12 (DoS — batchSize cap),
 * T-10-13 (Repudiation — SweepResult.failureCount + [readiness-sweep] logs).
 */

const LOG_PREFIX = '[admin-readiness-sweep]';

const querySchema = z.object({
  batchSize: z.coerce.number().int().min(1).max(200).optional(),
});

export async function POST(request: Request) {
  const authed = await isAuthenticatedSession();
  if (!authed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const raw = Object.fromEntries(url.searchParams.entries());
  const parsed = querySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid batchSize — must be integer 1..200' },
      { status: 400 },
    );
  }

  const { batchSize } = parsed.data;

  try {
    const result = await runReadinessSweep(
      batchSize !== undefined ? { batchSize } : undefined,
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error(`${LOG_PREFIX} sweep failed:`, err);
    return NextResponse.json(
      { error: 'Readiness sweep failed' },
      { status: 500 },
    );
  }
}
