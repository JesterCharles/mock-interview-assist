import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimitService';
import { persistSessionToDb } from '@/lib/sessionPersistence';
import { getAssociateSession } from '@/lib/auth-server';
import { runReadinessPipeline } from '@/lib/readinessPipeline';
import { InterviewSession } from '@/lib/types';

const LOG_PREFIX = '[associate-interview-complete]';

/**
 * Authenticated automated-interview completion endpoint.
 *
 * SECURITY (T-10-02):
 *   - Identity comes ONLY from the associate_session cookie (version-checked
 *     against Associate.pinGeneratedAt in Phase 9). No silent fallthrough to
 *     anonymous behavior — missing/stale cookie returns 401.
 *   - Any client-supplied associateSlug is OVERRIDDEN by the cookie-derived
 *     slug before persistence. Spoofing is impossible via this route.
 *   - On successful persist, fire-and-forget runReadinessPipeline fans out
 *     gap + readiness recompute with the Session.readinessRecomputeStatus
 *     marker so failures are repairable by the sweep (Plan 10-03).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fingerprint, session } = body as {
      fingerprint: string;
      session: InterviewSession;
    };

    if (!fingerprint || !session || !session.id) {
      return NextResponse.json(
        { error: 'Missing required fields: fingerprint and session with id' },
        { status: 400 }
      );
    }

    const payloadSize = JSON.stringify(session).length;
    if (payloadSize > 500_000) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }

    if (
      typeof session.id !== 'string' ||
      typeof session.status !== 'string' ||
      !Array.isArray(session.questions) ||
      typeof session.questionCount !== 'number'
    ) {
      return NextResponse.json({ error: 'Invalid session shape' }, { status: 400 });
    }

    const rateLimit = checkRateLimit(fingerprint);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', nextReset: rateLimit.nextReset.toISOString() },
        { status: 429 }
      );
    }

    const assocSession = await getAssociateSession();
    if (!assocSession) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Identity injected from cookie — any client-supplied associateSlug is ignored.
    const identified: InterviewSession & { mode?: string } = {
      ...session,
      associateSlug: assocSession.slug,
    };
    identified.mode = 'automated';

    const success = await persistSessionToDb(identified);
    if (!success) {
      console.error(`${LOG_PREFIX} persistSessionToDb returned false for session`, session.id);
      return NextResponse.json({ error: 'Failed to persist session' }, { status: 500 });
    }

    // Fire-and-forget: readiness fan-out owns its own error handling + DB marker.
    void runReadinessPipeline(assocSession.associateId, session.id);

    return NextResponse.json({ success: true, persisted: 'db' });
  } catch (error) {
    console.error(`${LOG_PREFIX} Error:`, error);
    return NextResponse.json(
      { error: 'Failed to save interview session' },
      { status: 500 }
    );
  }
}
