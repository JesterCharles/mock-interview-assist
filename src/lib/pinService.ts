import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const BCRYPT_COST = 10;

/**
 * Generate a cryptographically uniform 6-digit PIN (leading zeros preserved).
 * Uses crypto.randomInt (rejection-sampled, no modulo bias) — never Math.random.
 */
export function generatePin(): string {
  const n = crypto.randomInt(0, 1_000_000);
  return n.toString().padStart(6, '0');
}

/**
 * Hash a PIN with bcrypt (cost 10). Never store plaintext.
 */
export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, BCRYPT_COST);
}

/**
 * Verify a PIN against a bcrypt hash using constant-time comparison via bcrypt.compare.
 * Never string-equals the plaintext.
 */
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  if (!pin || !hash) return false;
  try {
    return await bcrypt.compare(pin, hash);
  } catch {
    return false;
  }
}
