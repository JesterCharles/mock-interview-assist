import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimitService';
import { persistSessionToDb } from '@/lib/sessionPersistence';
import { InterviewSession } from '@/lib/types';

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

    // Fingerprint-based auth — same gate as /api/public/interview/start
    const rateLimit = checkRateLimit(fingerprint);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', nextReset: rateLimit.nextReset.toISOString() },
        { status: 429 }
      );
    }

    // DB-only write — public sessions do NOT write to the JSON file
    // (file history is trainer-facing; public sessions are ephemeral from trainer's POV)
    const success = await persistSessionToDb(session);

    return NextResponse.json({
      success,
      persisted: success ? 'db' : 'none',
    });
  } catch (error) {
    console.error('[public-interview-complete] Error:', error);
    return NextResponse.json(
      { error: 'Failed to save interview session' },
      { status: 500 }
    );
  }
}
