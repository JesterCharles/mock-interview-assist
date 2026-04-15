import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';
import { generatePin, hashPin, verifyPin } from './pinService';
import {
  signAssociateToken,
  verifyAssociateToken,
} from './associateSession';

describe('pinService', () => {
  describe('generatePin', () => {
    it('produces a 6-digit numeric string', () => {
      for (let i = 0; i < 50; i++) {
        const pin = generatePin();
        expect(pin).toMatch(/^\d{6}$/);
      }
    });

    it('preserves leading zeros in the full 6-digit range', () => {
      // Distribution sanity — across many draws, at least some should start with 0 in theory.
      // We don't assert distribution; we assert format never loses leading zeros (i.e. typeof + length).
      const pin = generatePin();
      expect(typeof pin).toBe('string');
      expect(pin).toHaveLength(6);
    });
  });

  describe('hashPin / verifyPin', () => {
    it('roundtrips a correct pin', async () => {
      const pin = '123456';
      const hash = await hashPin(pin);
      expect(hash).not.toBe(pin);
      expect(hash.startsWith('$2')).toBe(true); // bcrypt prefix
      expect(await verifyPin(pin, hash)).toBe(true);
    });

    it('rejects a wrong pin', async () => {
      const hash = await hashPin('123456');
      expect(await verifyPin('654321', hash)).toBe(false);
    });

    it('rejects empty pin against a valid hash', async () => {
      const hash = await hashPin('123456');
      expect(await verifyPin('', hash)).toBe(false);
    });
  });
});

describe('associateSession', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.ASSOCIATE_SESSION_SECRET = 'test-associate-secret-please-do-not-reuse';
    process.env.APP_PASSWORD = 'totally-different-trainer-password';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('signs and verifies a token, roundtripping associateId + ver', async () => {
    const now = new Date('2026-04-14T12:00:00.000Z');
    const token = await signAssociateToken(42, now);
    const decoded = await verifyAssociateToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded!.associateId).toBe(42);
    expect(decoded!.ver).toBe(now.toISOString());
  });

  it('returns null for tampered payload', async () => {
    const token = await signAssociateToken(42, new Date('2026-04-14T12:00:00.000Z'));
    const [payload, sig] = token.split('.');
    // flip one character in payload
    const tamperedPayload = payload.slice(0, -1) + (payload.slice(-1) === 'A' ? 'B' : 'A');
    const tampered = `${tamperedPayload}.${sig}`;
    expect(await verifyAssociateToken(tampered)).toBeNull();
  });

  it('returns null for empty or garbage input', async () => {
    expect(await verifyAssociateToken('')).toBeNull();
    expect(await verifyAssociateToken('not-a-token')).toBeNull();
    expect(await verifyAssociateToken('a.b.c')).toBeNull();
    expect(await verifyAssociateToken('garbage.garbage')).toBeNull();
  });

  it('does NOT verify a token signed with APP_PASSWORD (secrets are distinct)', async () => {
    // Forge a token using APP_PASSWORD as the secret — must fail.
    const payload = { aid: 42, iat: Date.now(), ver: new Date().toISOString() };
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = crypto
      .createHmac('sha256', process.env.APP_PASSWORD!)
      .update(payloadB64)
      .digest('base64url');
    const forged = `${payloadB64}.${sig}`;
    expect(await verifyAssociateToken(forged)).toBeNull();
  });

  it('rejects token when a different ASSOCIATE_SESSION_SECRET was used at sign time', async () => {
    const token = await signAssociateToken(1, new Date());
    process.env.ASSOCIATE_SESSION_SECRET = 'a-completely-different-secret-value';
    expect(await verifyAssociateToken(token)).toBeNull();
  });
});
