import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isAuthenticatedSession } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { generatePin, hashPin } from '@/lib/pinService';

const BodySchema = z.object({
  associateId: z.number().int().positive(),
});

export async function POST(request: Request): Promise<NextResponse> {
  // Trainer-auth guard (D-14)
  const authed = await isAuthenticatedSession();
  if (!authed) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let parsed;
  try {
    const body = await request.json();
    parsed = BodySchema.safeParse(body);
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const { associateId } = parsed.data;

  // Confirm associate exists (cleaner error than Prisma's own).
  const exists = await prisma.associate.findUnique({
    where: { id: associateId },
    select: { id: true },
  });
  if (!exists) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const pin = generatePin();
  const pinHash = await hashPin(pin);

  // pinGeneratedAt update is load-bearing: advances token version, implicitly revoking
  // all previously issued associate_session cookies (D-09a, Codex #4).
  await prisma.associate.update({
    where: { id: associateId },
    data: { pinHash, pinGeneratedAt: new Date() },
  });

  // Return plaintext PIN exactly once (D-04). Never log the PIN (D-25).
  return NextResponse.json({ pin }, { status: 200 });
}
