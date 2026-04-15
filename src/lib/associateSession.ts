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
 *
 * Edge-Runtime compatible: uses Web Crypto (`crypto.subtle`) exclusively — NO Node
 * `crypto` / `Buffer` imports. Safe to import from middleware.
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
  console.warn(
    '[associateSession] WARNING: ASSOCIATE_SESSION_SECRET unset — using insecure development fallback'
  );
  return 'dev-insecure-associate-session-secret-do-not-use-in-prod';
}

// --- base64url helpers (Edge-safe, no Buffer) ---

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(input: string): Uint8Array {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function stringToBase64Url(s: string): string {
  return bytesToBase64Url(new TextEncoder().encode(s));
}

function base64UrlToString(s: string): string {
  return new TextDecoder().decode(base64UrlToBytes(s));
}

// --- HMAC via Web Crypto ---

async function importHmacKey(
  secret: string,
  usages: KeyUsage[]
): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    usages
  );
}

async function signPayload(payloadB64: string, secret: string): Promise<string> {
  const key = await importHmacKey(secret, ['sign']);
  const sigBuf = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payloadB64)
  );
  return bytesToBase64Url(new Uint8Array(sigBuf));
}

export async function signAssociateToken(
  associateId: number,
  pinGeneratedAt: Date
): Promise<string> {
  const payload: TokenPayload = {
    aid: associateId,
    iat: Date.now(),
    ver: pinGeneratedAt.toISOString(),
  };
  const payloadB64 = stringToBase64Url(JSON.stringify(payload));
  const sig = await signPayload(payloadB64, getSecret());
  return `${payloadB64}.${sig}`;
}

export async function verifyAssociateToken(
  token: string | undefined | null
): Promise<{ associateId: number; ver: string } | null> {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  if (!payloadB64 || !sig) return null;

  // Constant-time verification via Web Crypto subtle.verify.
  let sigBytes: Uint8Array;
  try {
    sigBytes = base64UrlToBytes(sig);
  } catch {
    return null;
  }

  let verified = false;
  try {
    const key = await importHmacKey(getSecret(), ['verify']);
    // Copy into fresh ArrayBuffers so the `BufferSource` type widens cleanly
    // (Uint8Array<ArrayBufferLike> vs ArrayBuffer typing mismatch under TS strict).
    const sigBuf = new ArrayBuffer(sigBytes.byteLength);
    new Uint8Array(sigBuf).set(sigBytes);
    const msgBytes = new TextEncoder().encode(payloadB64);
    const msgBuf = new ArrayBuffer(msgBytes.byteLength);
    new Uint8Array(msgBuf).set(msgBytes);
    verified = await crypto.subtle.verify('HMAC', key, sigBuf, msgBuf);
  } catch {
    return null;
  }
  if (!verified) return null;

  // Signature OK — safe to parse payload.
  let payload: unknown;
  try {
    const json = base64UrlToString(payloadB64);
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
