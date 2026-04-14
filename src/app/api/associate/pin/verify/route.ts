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
  slug: z.string().min(1).max(200),
  pin: z.string().regex(/^\d{6}$/),
  fingerprint: z.string().min(1).max(200),
});

const COOKIE_MAX_AGE = 60 * 60 * 24; // 24h

// Identical 401 for wrong-pin, unknown-slug, null-pinHash — no existence oracle.
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
  const { slug, pin, fingerprint } = parsed.data;

  if (isRateLimited(fingerprint)) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429 }
    );
  }

  const associate = await prisma.associate.findUnique({
    where: { slug },
    select: { id: true, slug: true, pinHash: true, pinGeneratedAt: true },
  });

  if (!associate || !associate.pinHash || !associate.pinGeneratedAt) {
    recordFailure(fingerprint);
    return unauthorized();
  }

  const ok = await verifyPin(pin, associate.pinHash);
  if (!ok) {
    recordFailure(fingerprint);
    return unauthorized();
  }

  // Success — reset counter, mint token.
  resetAttempts(fingerprint);
  const token = signAssociateToken(associate.id, associate.pinGeneratedAt);

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
