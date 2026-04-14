import crypto from 'crypto';

/**
 * Associate session token — HMAC-SHA256 signed opaque token embedding
 * { aid, iat, ver } where ver = pinGeneratedAt.toISOString().
 *
 * Signed with ASSOCIATE_SESSION_SECRET — intentionally decoupled from APP_PASSWORD
 * so trainer-password rotation does NOT invalidate associate sessions, and compromise
 * of one secret does not compromise the other (D-09b, Codex finding #4).
 *
 * Format: `${base64url(payloadJson)}.${base64url(hmacSig)}`.
 *
 * Version check (ver vs current Associate.pinGeneratedAt) happens in the consumer
 * auth helpers (Plan 09-02) — not here. This module has no DB dependency.
 */

interface TokenPayload {
  aid: number;
  iat: number; // epoch ms at sign time
  ver: string; // pinGeneratedAt.toISOString()
}

function getSecret(): string {
  const secret = process.env.ASSOCIATE_SESSION_SECRET;
  if (secret && secret.length > 0) return secret;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'ASSOCIATE_SESSION_SECRET is required in production. Generate with: openssl rand -hex 32'
    );
  }

  // Non-prod dev fallback — deterministic so tests still work.
  // eslint-disable-next-line no-console
  console.warn(
    '[associateSession] WARNING: ASSOCIATE_SESSION_SECRET unset — using insecure development fallback'
  );
  return 'dev-insecure-associate-session-secret-do-not-use-in-prod';
}

function sign(payloadB64: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
}

export function signAssociateToken(associateId: number, pinGeneratedAt: Date): string {
  const payload: TokenPayload = {
    aid: associateId,
    iat: Date.now(),
    ver: pinGeneratedAt.toISOString(),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = sign(payloadB64, getSecret());
  return `${payloadB64}.${sig}`;
}

export function verifyAssociateToken(
  token: string | undefined | null
): { associateId: number; ver: string } | null {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  if (!payloadB64 || !sig) return null;

  let expectedSig: string;
  try {
    expectedSig = sign(payloadB64, getSecret());
  } catch {
    return null;
  }

  // Constant-time signature comparison.
  let sigBuf: Buffer;
  let expectedBuf: Buffer;
  try {
    sigBuf = Buffer.from(sig, 'base64url');
    expectedBuf = Buffer.from(expectedSig, 'base64url');
  } catch {
    return null;
  }
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  // Signature OK — safe to parse payload.
  let payload: unknown;
  try {
    const json = Buffer.from(payloadB64, 'base64url').toString('utf8');
    payload = JSON.parse(json);
  } catch {
    return null;
  }

  if (
    !payload ||
    typeof payload !== 'object' ||
    typeof (payload as TokenPayload).aid !== 'number' ||
    typeof (payload as TokenPayload).ver !== 'string'
  ) {
    return null;
  }

  const p = payload as TokenPayload;
  return { associateId: p.aid, ver: p.ver };
}
