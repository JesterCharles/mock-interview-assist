import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// vi.hoisted runs before vi.mock factories — safe to reference in class body
const { mockSend } = vi.hoisted(() => ({
  mockSend: vi.fn().mockResolvedValue({ data: { id: 'email-id' }, error: null }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    auth: {
      admin: {
        generateLink: vi.fn(),
      },
    },
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    associate: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('@/lib/authRateLimit', () => ({
  checkAuthRateLimit: vi.fn(),
  recordAuthEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/email/auth-templates', () => ({
  getMagicLinkEmailHtml: vi.fn().mockReturnValue('<html>magic link</html>'),
}));

vi.mock('resend', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Resend: vi.fn().mockImplementation(function (this: any) {
    this.emails = { send: mockSend };
  }),
}));

import { POST } from './route';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { prisma } from '@/lib/prisma';
import { checkAuthRateLimit, recordAuthEvent } from '@/lib/authRateLimit';
import { getMagicLinkEmailHtml } from '@/lib/email/auth-templates';

const mockGenerateLink = supabaseAdmin.auth.admin.generateLink as ReturnType<typeof vi.fn>;
const mockCheckRateLimit = checkAuthRateLimit as ReturnType<typeof vi.fn>;
const mockRecordAuthEvent = recordAuthEvent as ReturnType<typeof vi.fn>;
const mockGetMagicLinkEmailHtml = getMagicLinkEmailHtml as ReturnType<typeof vi.fn>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFindFirst = (prisma.associate as any).findFirst as ReturnType<typeof vi.fn>;

function makeRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost:3000/api/auth/magic-link', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/magic-link', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSend.mockResolvedValue({ data: { id: 'email-id' }, error: null });
    mockCheckRateLimit.mockReturnValue({ allowed: true, remaining: 2, retryAfterMs: 0 });
    mockFindFirst.mockResolvedValue({ id: 1 });
    mockGenerateLink.mockResolvedValue({
      data: { properties: { action_link: 'https://supabase.io/magic?token=abc' } },
      error: null,
    });
    mockGetMagicLinkEmailHtml.mockReturnValue('<html>magic link</html>');
  });

  it('returns 400 for invalid email', async () => {
    const req = makeRequest({ email: 'not-an-email' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing email', async () => {
    const req = makeRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 200 without generating link for non-associate email', async () => {
    mockFindFirst.mockResolvedValue(null);
    const req = makeRequest({ email: 'stranger@example.com' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
    expect(mockGenerateLink).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
    expect(mockRecordAuthEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'magic-link-no-associate' })
    );
  });

  it('returns 429 when rate limited', async () => {
    mockCheckRateLimit.mockReturnValue({ allowed: false, remaining: 0, retryAfterMs: 3600000 });
    const req = makeRequest({ email: 'associate@example.com' });
    const res = await POST(req);
    expect(res.status).toBe(429);
  });

  it('returns 200 and calls getMagicLinkEmailHtml for valid request', async () => {
    const req = makeRequest({ email: 'associate@example.com' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
    expect(mockGenerateLink).toHaveBeenCalledWith({
      type: 'magiclink',
      email: 'associate@example.com',
      options: expect.objectContaining({ redirectTo: expect.stringContaining('/auth/callback') }),
    });
    expect(mockGetMagicLinkEmailHtml).toHaveBeenCalledWith('https://supabase.io/magic?token=abc');
  });

  it('returns 200 even when generateLink errors (no user leak)', async () => {
    mockGenerateLink.mockResolvedValue({
      data: null,
      error: { message: 'User not found' },
    });
    const req = makeRequest({ email: 'nonexistent@example.com' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
  });

  it('records AuthEvent on success', async () => {
    const req = makeRequest({ email: 'associate@example.com' });
    await POST(req);
    expect(mockRecordAuthEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'magic-link',
        email: 'associate@example.com',
      })
    );
  });

  it('uses x-forwarded-for when NLM_TRUSTED_PROXY is true', async () => {
    process.env.NLM_TRUSTED_PROXY = 'true';
    const req = makeRequest({ email: 'associate@example.com' }, { 'x-forwarded-for': '1.2.3.4' });
    await POST(req);
    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({ ip: '1.2.3.4' })
    );
    delete process.env.NLM_TRUSTED_PROXY;
  });
});
