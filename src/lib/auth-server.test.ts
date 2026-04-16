import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock next/headers cookies()
const cookieStoreMock = {
  _cookies: new Map<string, string>(),
  get(name: string) {
    const v = this._cookies.get(name);
    return v === undefined ? undefined : { name, value: v };
  },
};

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => cookieStoreMock),
}));

import { isAuthenticatedSession } from '@/lib/auth-server';

function setCookies(map: Record<string, string>) {
  cookieStoreMock._cookies.clear();
  for (const [k, v] of Object.entries(map)) cookieStoreMock._cookies.set(k, v);
}

describe('isAuthenticatedSession (trainer-only)', () => {
  beforeEach(() => {
    setCookies({});
  });

  it('returns true when nlm_session=authenticated', async () => {
    setCookies({ nlm_session: 'authenticated' });
    expect(await isAuthenticatedSession()).toBe(true);
  });

  it('returns false when no cookies', async () => {
    expect(await isAuthenticatedSession()).toBe(false);
  });

  it('returns false when nlm_session has unexpected value', async () => {
    setCookies({ nlm_session: 'invalid' });
    expect(await isAuthenticatedSession()).toBe(false);
  });
});
