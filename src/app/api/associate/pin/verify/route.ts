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
import { isAssociateAuthEnabled } from '@/lib/featureFlags';

const BodySchema = z.object({
  pin: z.string().regex(/^\d{6}$/),
  fingerprint: z.string().min(1).max(200),
});

const COOKIE_MAX_AGE = 60 * 60 * 24; // 24h

// Identical 401 for wrong-pin / no-match / collision — no existence oracle.
function unauthorized(): NextResponse {
  return NextResponse.json({ ok: false }, { status: 401 });
}

// Server-derived caller key. Trusts x-forwarded-for only when the request
// arrived through the platform's edge (set NLM_TRUSTED_PROXY=true behind GCE
// load balancer). Otherwise falls back to a static "direct" bucket so an
// attacker can't spoof IP via header injection on a non-proxied deployment.
function callerIp(request: Request): string {
  if (process.env.NLM_TRUSTED_PROXY === 'true') {
    const xff = request.headers.get('x-forwarded-for') ?? '';
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return 'direct';
}

export async function POST(request: Request): Promise<NextResponse> {
  // PIN auth is gated until v1.2 — return 404 in production until full auth lands.
  if (!isAssociateAuthEnabled()) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

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

  // Composite limiter key: server-derived IP + client-supplied fingerprint.
  // Fingerprint alone is client-controlled — an attacker rotating it would
  // bypass per-fingerprint buckets. Pairing with IP keeps brute force bounded
  // at the per-IP layer too. We also check an IP-only bucket so a single IP
  // rotating fingerprints still trips MAX_FAILURES across rotations.
  const ip = callerIp(request);
  const compositeKey = `${ip}::${fingerprint}`;
  const ipKey = `ip::${ip}`;

  if (isRateLimited(compositeKey) || isRateLimited(ipKey)) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429 }
    );
  }

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
    recordFailure(compositeKey);
    recordFailure(ipKey);
    return unauthorized();
  }
  const associate = matches[0];
  if (!associate.pinGeneratedAt) {
    recordFailure(compositeKey);
    recordFailure(ipKey);
    return unauthorized();
  }

  // Success — reset both counters, mint token.
  resetAttempts(compositeKey);
  resetAttempts(ipKey);
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
