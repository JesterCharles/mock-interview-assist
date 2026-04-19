import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimitService';
import { persistSessionToDb } from '@/lib/sessionPersistence';
import { InterviewSession } from '@/lib/types';
import { log } from '@/lib/logger';

/**
 * Anonymous automated-interview completion endpoint.
 *
 * SECURITY (Codex finding #3): This route is anonymous-only. The client-supplied
 * `associateSlug` is ALWAYS stripped before persistence. Authenticated associates
 * must use /api/associate/interview/complete instead; cookies are intentionally
 * ignored here.
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

    // Cap payload size — reject oversized sessions
    const payloadSize = JSON.stringify(session).length;
    if (payloadSize > 500_000) {
      return NextResponse.json(
        { error: 'Payload too large' },
        { status: 413 }
      );
    }

    // Basic shape validation — must have expected fields, not arbitrary data
    if (typeof session.id !== 'string' || typeof session.status !== 'string' ||
        !Array.isArray(session.questions) || typeof session.questionCount !== 'number') {
      return NextResponse.json(
        { error: 'Invalid session shape' },
        { status: 400 }
      );
    }

    // Fingerprint-based auth — same gate as /api/public/interview/start
    const rateLimit = checkRateLimit(fingerprint);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', nextReset: rateLimit.nextReset.toISOString() },
        { status: 429 }
      );
    }

    // Per Codex finding #3 (T-10-01): NEVER trust client-supplied identity on the
    // anonymous endpoint. Unconditionally null out associateSlug before persist so
    // no caller can forge linkage to a real associate via this route.
    const sanitized: InterviewSession = {
      ...session,
      associateSlug: undefined,
    };
    // Cast-through for strict null assignment — Prisma path treats falsy slug as no linkage
    (sanitized as unknown as { associateSlug: null }).associateSlug = null;

    const success = await persistSessionToDb(sanitized, { mode: 'automated' });

    if (!success) {
      log.error('public.interview.complete.error', {
        route: '/api/public/interview/complete',
        sessionId: session.id,
        err: 'persistSessionToDb returned false',
      });
      return NextResponse.json(
        { error: 'Failed to persist session' },
        { status: 500 }
      );
    }

    log.info('public.interview.complete', {
      route: '/api/public/interview/complete',
      sessionId: session.id,
      mode: 'automated',
    });
    return NextResponse.json({
      success: true,
      persisted: 'db',
    });
  } catch (error) {
    log.error('public.interview.complete.error', {
      route: '/api/public/interview/complete',
      err: String(error),
    });
    return NextResponse.json(
      { error: 'Failed to save interview session' },
      { status: 500 }
    );
  }
}
