/**
 * POST /api/coding/bank/refresh
 *
 * Trainer-only on-demand challenge bank refresh. Triggers immediate sync of
 * one or more slugs (or the whole manifest) from the two-repo challenge bank.
 *
 * Body:
 *   {}                          — full manifest sync
 *   { slugs: [] }               — full manifest sync
 *   { slugs: ['a', 'b'] }       — targeted sync
 *
 * Response (200):
 *   { synced: number, skipped: number, errors: Array<{slug, reason}> }
 *
 * Per-slug ChallengeValidationError does NOT abort the batch — it is captured
 * in `errors[]` with a sanitized reason (no stack traces). Unexpected errors
 * during the full-manifest walk (e.g., GitHub 503) return 502.
 *
 * Auth matrix (D-13):
 *   anonymous → 401
 *   associate → 403
 *   trainer / admin → 200
 */

import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCallerIdentity } from '@/lib/identity';
import {
  listChallenges,
  syncChallengeToDb,
  invalidateCache,
} from '@/lib/coding-challenge-service';
import { ChallengeValidationError } from '@/lib/coding-bank-schemas';

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]*$/;

const BodySchema = z
  .object({
    slugs: z.array(z.string().regex(SLUG_REGEX).max(50)).optional(),
  })
  .strict();

type ErrorEntry = { slug: string; reason: string };

function sanitizeReason(err: unknown): string {
  if (err instanceof ChallengeValidationError) {
    return `${err.path}: ${err.reason}`;
  }
  if (err instanceof Error) {
    return err.message.split('\n')[0].slice(0, 500);
  }
  return 'Unknown error';
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Auth gate — trainer or admin only.
  const identity = await getCallerIdentity();
  if (identity.kind === 'anonymous') {
    return NextResponse.json(
      { error: 'unauthorized', message: 'Sign-in required' },
      { status: 401 },
    );
  }
  if (identity.kind !== 'trainer' && identity.kind !== 'admin') {
    return NextResponse.json(
      { error: 'forbidden', message: 'Trainer role required' },
      { status: 403 },
    );
  }

  // 2. Parse body (optional — empty body or empty array ⇒ full sync).
  let parsed: z.infer<typeof BodySchema> = {};
  const contentLength = req.headers.get('content-length');
  if (contentLength && contentLength !== '0') {
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'invalid_body', message: 'Body must be valid JSON' },
        { status: 400 },
      );
    }
    const result = BodySchema.safeParse(raw);
    if (!result.success) {
      return NextResponse.json(
        {
          error: 'invalid_body',
          message: result.error.issues[0]?.message ?? 'Invalid body',
        },
        { status: 400 },
      );
    }
    parsed = result.data;
  }

  const targetSlugs =
    parsed.slugs && parsed.slugs.length > 0 ? parsed.slugs : null;
  const errors: ErrorEntry[] = [];
  let synced = 0;
  const skipped = 0;

  if (targetSlugs === null) {
    // Full-manifest path — flush cache first so the walk sees fresh GitHub state.
    invalidateCache();
    let manifest: Awaited<ReturnType<typeof listChallenges>>;
    try {
      manifest = await listChallenges();
    } catch (err) {
      if (err instanceof ChallengeValidationError) {
        return NextResponse.json({
          synced: 0,
          skipped: 0,
          errors: [
            { slug: err.slug ?? 'manifest', reason: sanitizeReason(err) },
          ],
        });
      }
      return NextResponse.json(
        { error: 'upstream_unavailable', message: sanitizeReason(err) },
        { status: 502 },
      );
    }

    for (const entry of manifest) {
      try {
        await syncChallengeToDb(entry.slug);
        synced++;
      } catch (err) {
        errors.push({ slug: entry.slug, reason: sanitizeReason(err) });
      }
    }
  } else {
    // Targeted path — per-slug cache flush preserves input ordering.
    for (const slug of targetSlugs) {
      invalidateCache(`public:${slug}:*`);
      invalidateCache(`private:${slug}:*`);
      try {
        await syncChallengeToDb(slug);
        synced++;
      } catch (err) {
        errors.push({ slug, reason: sanitizeReason(err) });
      }
    }
  }

  return NextResponse.json({ synced, skipped, errors });
}
