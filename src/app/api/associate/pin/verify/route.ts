import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyPin } from '@/lib/pinService';
import { signAssociateToken } from '@/lib/associateSession';
import {
  isRateLimited,
  recordFailure,
  resetAttempts,
} from '@/lib/pinAttemptLimiter';

const BodySchema = z.object({
  pin: z.string().regex(/^\d{6}$/),
  fingerprint: z.string().min(1).max(200),
});

const COOKIE_MAX_AGE = 60 * 60 * 24; // 24h

// Identical 401 for wrong-pin / no-match / collision — no existence oracle.
function unauthorized(): NextResponse {
  return NextResponse.json({ ok: false }, { status: 401 });
}

export async function POST(request: Request): Promise<NextResponse> {
  let parsed;
  try {
    const body = await request.json();
    parsed = BodySchema.safeParse(body);
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }
  const { pin, fingerprint } = parsed.data;

  if (isRateLimited(fingerprint)) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429 }
    );
  }

  // PIN-only login (15-02 UX fix). Look up across all associates with an
  // active PIN. At trainer-managed scale (low hundreds) iterating bcrypt
  // compares is acceptable; rate limiter bounds brute force per fingerprint.
  // Collision handling: if two associates somehow share the same PIN, both
  // matches are rejected (return 401) — trainer must regenerate one.
  const candidates = await prisma.associate.findMany({
    where: { pinHash: { not: null }, pinGeneratedAt: { not: null } },
    select: { id: true, slug: true, pinHash: true, pinGeneratedAt: true },
  });

  const matches: Array<typeof candidates[number]> = [];
  for (const c of candidates) {
    if (!c.pinHash || !c.pinGeneratedAt) continue;
    // eslint-disable-next-line no-await-in-loop -- sequential compare is fine at this scale
    const ok = await verifyPin(pin, c.pinHash);
    if (ok) matches.push(c);
  }

  if (matches.length !== 1) {
    recordFailure(fingerprint);
    return unauthorized();
  }
  const associate = matches[0];
  if (!associate.pinGeneratedAt) {
    recordFailure(fingerprint);
    return unauthorized();
  }

  // Success — reset counter, mint token.
  resetAttempts(fingerprint);
  const token = await signAssociateToken(associate.id, associate.pinGeneratedAt);

  const response = NextResponse.json({ ok: true, slug: associate.slug }, { status: 200 });
  response.cookies.set('associate_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
  return response;
}
