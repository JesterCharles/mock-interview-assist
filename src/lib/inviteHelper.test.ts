import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist the email send mock so it's accessible inside vi.mock factories
const { mockEmailSendFn } = vi.hoisted(() => ({ mockEmailSendFn: vi.fn() }));

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
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('resend', () => ({
  Resend: class MockResend {
    emails = { send: mockEmailSendFn };
    constructor(_key?: string) {}
  },
}));

vi.mock('@/lib/authRateLimit', () => ({
  recordAuthEvent: vi.fn(),
}));

vi.mock('@/lib/email/auth-templates', () => ({
  getMagicLinkEmailHtml: vi.fn().mockReturnValue('<html>magic link</html>'),
}));

import { inviteAssociate, generateSlug } from '@/lib/inviteHelper';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { prisma } from '@/lib/prisma';
import { recordAuthEvent } from '@/lib/authRateLimit';

const mockGenerateLink = supabaseAdmin.auth.admin.generateLink as ReturnType<typeof vi.fn>;
const mockFindUnique = prisma.associate.findUnique as ReturnType<typeof vi.fn>;
const mockCreate = prisma.associate.create as ReturnType<typeof vi.fn>;
const mockUpdate = prisma.associate.update as ReturnType<typeof vi.fn>;
const mockRecordAuthEvent = recordAuthEvent as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  // Default: successful generateLink
  mockGenerateLink.mockResolvedValue({
    data: { properties: { action_link: 'https://supabase.example.com/magic-link' } },
    error: null,
  });
  // Default: successful email send
  mockEmailSendFn.mockResolvedValue({ id: 'email-123' });
});

describe('generateSlug', () => {
  it('generates slug from email local part with 4-char suffix', () => {
    const slug = generateSlug('jsmith@example.com');
    expect(slug).toMatch(/^jsmith-[a-f0-9]{4}$/);
  });

  it('uses "user" as fallback when local part is empty after sanitization', () => {
    const slug = generateSlug('!@example.com');
    expect(slug).toMatch(/^user-[a-f0-9]{4}$/);
  });

  it('truncates long local parts to 20 chars', () => {
    const slug = generateSlug('averylongemailaddressthatexceeds@example.com');
    const [local] = slug.split('-');
    expect(local.length).toBeLessThanOrEqual(20);
  });
});

describe('inviteAssociate', () => {
  const email = 'test@example.com';
  const cohortId = 1;
  const trainerIdentifier = 'trainer@company.com';

  describe('new associate (not found)', () => {
    beforeEach(() => {
      mockFindUnique.mockResolvedValue(null);
      mockCreate.mockResolvedValue({ id: 1, slug: 'test-abc1', email, cohortId, lastInvitedAt: null });
      mockUpdate.mockResolvedValue({ id: 1 });
      mockRecordAuthEvent.mockResolvedValue(undefined);
    });

    it('returns { status: "invited" } after creating associate + sending email', async () => {
      const result = await inviteAssociate(email, cohortId, trainerIdentifier);
      expect(result.status).toBe('invited');
    });

    it('calls generateLink with the email', async () => {
      await inviteAssociate(email, cohortId, trainerIdentifier);
      expect(mockGenerateLink).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'magiclink', email })
      );
    });

    it('calls recordAuthEvent with trainer-invite type', async () => {
      await inviteAssociate(email, cohortId, trainerIdentifier);
      expect(mockRecordAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'trainer-invite', email })
      );
    });

    it('updates lastInvitedAt after sending email', async () => {
      await inviteAssociate(email, cohortId, trainerIdentifier);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ lastInvitedAt: expect.any(Date) }) })
      );
    });
  });

  describe('existing associate in same cohort', () => {
    beforeEach(() => {
      mockFindUnique.mockResolvedValue({
        id: 2, slug: 'existing-xyz1', email, cohortId, lastInvitedAt: null,
      });
    });

    it('returns { status: "skipped", error: "Already in target cohort" }', async () => {
      const result = await inviteAssociate(email, cohortId, trainerIdentifier);
      expect(result.status).toBe('skipped');
      expect(result.error).toBe('Already in target cohort');
    });

    it('does not call generateLink', async () => {
      await inviteAssociate(email, cohortId, trainerIdentifier);
      expect(mockGenerateLink).not.toHaveBeenCalled();
    });
  });

  describe('existing associate in different cohort (reassign)', () => {
    beforeEach(() => {
      mockFindUnique.mockResolvedValue({
        id: 3, slug: 'existing-abc2', email, cohortId: 99, lastInvitedAt: null,
      });
      mockUpdate.mockResolvedValue({ id: 3, slug: 'existing-abc2', email, cohortId, lastInvitedAt: null });
    });

    it('returns { status: "reassigned" }', async () => {
      const result = await inviteAssociate(email, cohortId, trainerIdentifier);
      expect(result.status).toBe('reassigned');
    });

    it('calls generateLink and sends email', async () => {
      await inviteAssociate(email, cohortId, trainerIdentifier);
      expect(mockGenerateLink).toHaveBeenCalled();
    });
  });

  describe('5-min throttle', () => {
    it('returns { status: "skipped", error: "Recently invited -- throttled" } when lastInvitedAt < 5 min ago', async () => {
      const recentTime = new Date(Date.now() - 2 * 60 * 1000); // 2 min ago
      mockFindUnique.mockResolvedValue({
        id: 4, slug: 'throttled-xx1', email, cohortId: 99, lastInvitedAt: recentTime,
      });
      const result = await inviteAssociate(email, cohortId, trainerIdentifier);
      expect(result.status).toBe('skipped');
      expect(result.error).toBe('Recently invited -- throttled');
    });

    it('proceeds when lastInvitedAt is older than 5 min', async () => {
      const oldTime = new Date(Date.now() - 10 * 60 * 1000); // 10 min ago
      mockFindUnique.mockResolvedValue({
        id: 5, slug: 'old-xx2', email, cohortId: 99, lastInvitedAt: oldTime,
      });
      mockUpdate.mockResolvedValue({ id: 5 });
      const result = await inviteAssociate(email, cohortId, trainerIdentifier);
      expect(result.status).toBe('reassigned');
    });
  });

  describe('generateLink failure', () => {
    beforeEach(() => {
      mockFindUnique.mockResolvedValue(null);
      mockCreate.mockResolvedValue({ id: 6, slug: 'fail-xx3', email, cohortId, lastInvitedAt: null });
      mockGenerateLink.mockResolvedValue({
        data: null,
        error: { message: 'Supabase error: quota exceeded' },
      });
    });

    it('returns { status: "failed", error: message }', async () => {
      const result = await inviteAssociate(email, cohortId, trainerIdentifier);
      expect(result.status).toBe('failed');
      expect(result.error).toContain('Supabase error');
    });
  });

  describe('Resend failure', () => {
    beforeEach(() => {
      mockFindUnique.mockResolvedValue(null);
      mockCreate.mockResolvedValue({ id: 7, slug: 'fail-xx4', email, cohortId, lastInvitedAt: null });
      // Override the shared send mock to throw
      mockEmailSendFn.mockRejectedValueOnce(new Error('Resend network error'));
    });

    it('returns { status: "failed", error: ... } when email send throws', async () => {
      const result = await inviteAssociate(email, cohortId, trainerIdentifier);
      expect(result.status).toBe('failed');
      expect(result.error).toContain('Resend network error');
    });
  });
});
