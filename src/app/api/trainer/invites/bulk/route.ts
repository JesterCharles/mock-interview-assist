import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCallerIdentity } from '@/lib/identity';
import { prisma } from '@/lib/prisma';
import { inviteAssociate } from '@/lib/inviteHelper';

const DAILY_INVITE_LIMIT = 20;

const BulkInviteSchema = z.object({
  emails: z.array(z.string().email()).min(1).max(50),
  cohortId: z.number().int().positive(),
});

/**
 * POST /api/trainer/invites/bulk
 *
 * Bulk invite up to 50 associates to a cohort via magic-link email.
 * - Trainer/admin only (401 for others)
 * - Zod validates body shape (400 on invalid)
 * - Verifies cohort exists (404 if not)
 * - Pre-flight daily limit: 20 invites/day per trainer (429 if exceeded)
 * - Sequential processing with partial-failure isolation
 * - Response: { results: [{ email, status, error? }] }
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Auth gate
  const caller = await getCallerIdentity(); // [AUDIT-VERIFIED: P20]
  if (caller.kind !== 'trainer' && caller.kind !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Validate request body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = BulkInviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { emails, cohortId } = parsed.data;

  // 3. Verify cohort exists
  const cohort = await prisma.cohort.findUnique({ where: { id: cohortId } });
  if (!cohort) {
    return NextResponse.json({ error: 'Cohort not found' }, { status: 404 });
  }

  // 4. Pre-flight daily limit
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const trainerKey = caller.email ?? 'trainer';
  const todayCount = await prisma.authEvent.count({
    where: {
      type: 'trainer-invite',
      ip: trainerKey,
      createdAt: { gte: since },
    },
  });
  const remaining = DAILY_INVITE_LIMIT - todayCount;
  if (remaining < emails.length) {
    return NextResponse.json(
      { error: `Would exceed daily limit (${remaining} remaining of ${DAILY_INVITE_LIMIT})` },
      { status: 429 }
    );
  }

  // 5. Sequential processing with partial-failure isolation
  const results: { email: string; status: string; error?: string }[] = [];
  for (const email of emails) {
    try {
      const result = await inviteAssociate(email, cohortId, trainerKey);
      const entry: { email: string; status: string; error?: string } = { email, status: result.status };
      if (result.error !== undefined) entry.error = result.error;
      results.push(entry);
    } catch (err) {
      results.push({ email, status: 'failed', error: String(err) });
    }
  }

  // 6. Return results
  return NextResponse.json({ results });
}
