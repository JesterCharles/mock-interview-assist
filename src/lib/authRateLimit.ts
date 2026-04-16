import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

export type AuthEventType = 'magic-link' | 'magic-link-no-associate' | 'reset' | 'reset-abuse-flag' | 'login-failure' | 'trainer-invite';

interface WindowEntry {
  timestamps: number[]; // epoch ms of each request in the sliding window
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

// In-memory sliding window map — matches rateLimitService.ts pattern
// Key format: auth:{type}:email:{sha256(email)} or auth:{type}:ip:{ip}
const windowMap = new Map<string, WindowEntry>();

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const EMAIL_LIMIT = 3; // per email per window
const IP_LIMIT = 10; // per IP per window

function hashEmail(email: string): string {
  return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
}

function getWindow(key: string): WindowEntry {
  if (!windowMap.has(key)) {
    windowMap.set(key, { timestamps: [] });
  }
  return windowMap.get(key)!;
}

function cleanWindow(entry: WindowEntry, now: number): void {
  const cutoff = now - WINDOW_MS;
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
}

function checkWindow(key: string, limit: number, now: number): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const entry = getWindow(key);
  cleanWindow(entry, now);

  const count = entry.timestamps.length;
  const allowed = count < limit;
  const remaining = Math.max(0, limit - count - (allowed ? 0 : 0));

  let retryAfterMs = 0;
  if (!allowed && entry.timestamps.length > 0) {
    const oldest = entry.timestamps[0];
    retryAfterMs = Math.max(0, oldest + WINDOW_MS - now);
  }

  if (allowed) {
    entry.timestamps.push(now);
  }

  return { allowed, remaining: Math.max(0, limit - entry.timestamps.length), retryAfterMs };
}

/**
 * Check rate limit for a magic-link or password-reset request.
 * Enforces 3/hr per email and 10/hr per IP, with separate namespaces per type.
 */
export function checkAuthRateLimit(params: {
  email: string;
  ip: string;
  type: 'magic-link' | 'reset';
}): RateLimitResult {
  const { email, ip, type } = params;
  const now = Date.now();

  const emailKey = `auth:${type}:email:${hashEmail(email)}`;
  const ipKey = `auth:${type}:ip:${ip}`;

  const emailResult = checkWindow(emailKey, EMAIL_LIMIT, now);
  if (!emailResult.allowed) {
    // Undo the IP window check — don't record IP hit if email blocked
    return { allowed: false, remaining: 0, retryAfterMs: emailResult.retryAfterMs };
  }

  const ipResult = checkWindow(ipKey, IP_LIMIT, now);
  if (!ipResult.allowed) {
    // Email was recorded — undo it to keep counts consistent
    const emailEntry = getWindow(emailKey);
    emailEntry.timestamps.pop();
    return { allowed: false, remaining: 0, retryAfterMs: ipResult.retryAfterMs };
  }

  return {
    allowed: true,
    remaining: Math.min(emailResult.remaining, ipResult.remaining),
    retryAfterMs: 0,
  };
}

/**
 * Persist an auth event to the AuthEvent table for admin visibility.
 * Fire-and-forget — errors are caught and logged but do not throw.
 */
export async function recordAuthEvent(data: {
  type: AuthEventType;
  email: string;
  ip: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.authEvent.create({
      data: {
        type: data.type,
        email: data.email,
        ip: data.ip,
        metadata: (data.metadata ?? undefined) as object | undefined,
      },
    });
  } catch (err) {
    console.error('[authRateLimit] Failed to record auth event:', err);
  }
}

/**
 * Reset in-memory state for testing only.
 * @internal
 */
export function _resetForTest(): void {
  windowMap.clear();
}
