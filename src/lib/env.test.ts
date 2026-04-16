import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { assertProductionEnv } from './env';

describe('assertProductionEnv', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore env after each test
    Object.keys(process.env).forEach((key) => {
      if (!(key in originalEnv)) delete process.env[key];
    });
    Object.assign(process.env, originalEnv);
  });

  it('does nothing in non-production environment', () => {
    (process.env as Record<string, string>).NODE_ENV = 'development';
    process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';
    expect(() => assertProductionEnv()).not.toThrow();
  });

  it('does nothing in test environment', () => {
    (process.env as Record<string, string>).NODE_ENV = 'test';
    process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';
    expect(() => assertProductionEnv()).not.toThrow();
  });

  describe('in production environment', () => {
    beforeEach(() => {
      (process.env as Record<string, string>).NODE_ENV = 'production';
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://abc.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'anon-key';
      process.env.SUPABASE_SECRET_KEY = 'service-role-key';
      process.env.NEXT_PUBLIC_SITE_URL = 'https://nlm.example.com';
    });

    it('passes for valid production config', () => {
      expect(() => assertProductionEnv()).not.toThrow();
    });

    it('throws for localhost in NEXT_PUBLIC_SITE_URL', () => {
      process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';
      expect(() => assertProductionEnv()).toThrow('[FATAL]');
    });

    it('throws for 127.0.0.1 in NEXT_PUBLIC_SITE_URL', () => {
      process.env.NEXT_PUBLIC_SITE_URL = 'http://127.0.0.1:3000';
      expect(() => assertProductionEnv()).toThrow('[FATAL]');
    });

    it('throws for 0.0.0.0 in NEXT_PUBLIC_SITE_URL', () => {
      process.env.NEXT_PUBLIC_SITE_URL = 'http://0.0.0.0:3000';
      expect(() => assertProductionEnv()).toThrow('[FATAL]');
    });

    it('throws for ::1 in NEXT_PUBLIC_SITE_URL', () => {
      process.env.NEXT_PUBLIC_SITE_URL = 'http://[::1]:3000';
      expect(() => assertProductionEnv()).toThrow('[FATAL]');
    });

    it('throws when NEXT_PUBLIC_SUPABASE_URL is missing', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      expect(() => assertProductionEnv()).toThrow('[FATAL]');
    });

    it('throws when NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      expect(() => assertProductionEnv()).toThrow('[FATAL]');
    });

    it('throws when SUPABASE_SECRET_KEY is missing', () => {
      delete process.env.SUPABASE_SECRET_KEY;
      expect(() => assertProductionEnv()).toThrow('[FATAL]');
    });

    it('throws when NEXT_PUBLIC_SITE_URL is missing', () => {
      delete process.env.NEXT_PUBLIC_SITE_URL;
      expect(() => assertProductionEnv()).toThrow('[FATAL]');
    });
  });
});
