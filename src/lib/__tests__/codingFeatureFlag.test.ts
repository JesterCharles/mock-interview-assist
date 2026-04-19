import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('codingFeatureFlag', () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns true when CODING_CHALLENGES_ENABLED === "true"', async () => {
    vi.stubEnv('CODING_CHALLENGES_ENABLED', 'true');
    const { isCodingEnabled } = await import('../codingFeatureFlag');
    expect(isCodingEnabled()).toBe(true);
  });

  it('returns false when CODING_CHALLENGES_ENABLED === "false"', async () => {
    vi.stubEnv('CODING_CHALLENGES_ENABLED', 'false');
    const { isCodingEnabled } = await import('../codingFeatureFlag');
    expect(isCodingEnabled()).toBe(false);
  });

  it('returns false when CODING_CHALLENGES_ENABLED is unset/empty', async () => {
    vi.stubEnv('CODING_CHALLENGES_ENABLED', '');
    const { isCodingEnabled } = await import('../codingFeatureFlag');
    expect(isCodingEnabled()).toBe(false);
  });

  it('returns false for uppercase "TRUE" (strict case-sensitive)', async () => {
    vi.stubEnv('CODING_CHALLENGES_ENABLED', 'TRUE');
    const { isCodingEnabled } = await import('../codingFeatureFlag');
    expect(isCodingEnabled()).toBe(false);
  });

  it('returns false for "1", "yes", "on", "enabled" (non-literal truthy)', async () => {
    for (const val of ['1', 'yes', 'on', 'enabled']) {
      vi.stubEnv('CODING_CHALLENGES_ENABLED', val);
      vi.resetModules();
      const { isCodingEnabled } = await import('../codingFeatureFlag');
      expect(isCodingEnabled()).toBe(false);
    }
  });

  it('CODING_COMING_SOON_MESSAGE matches the exact user-facing copy', async () => {
    const mod = await import('../codingFeatureFlag');
    expect(mod.CODING_COMING_SOON_MESSAGE).toBe(
      'Coding challenges coming soon. Check back later!',
    );
  });

  it('re-exports CodingFeatureDisabledError from judge0Errors', async () => {
    const mod = await import('../codingFeatureFlag');
    const err = new mod.CodingFeatureDisabledError();
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('CodingFeatureDisabledError');
    expect(err.message).toBe('Coding challenges are currently disabled');
  });
});
