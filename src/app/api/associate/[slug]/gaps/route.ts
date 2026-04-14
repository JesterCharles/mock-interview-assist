import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v4';
import { isAuthenticatedSession } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { getGapScores } from '@/lib/gapPersistence';

const slugSchema = z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Invalid slug format');

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    // T-04-05: Auth guard -- return 401 before 404 to prevent slug enumeration
    if (!(await isAuthenticatedSession())) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
    }

    // T-04-06: Validate slug with zod
    const { slug } = await params;
    const parseResult = slugSchema.safeParse(slug);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid slug format' }, { status: 400 });
    }

    // Look up associate by slug
    const associate = await prisma.associate.findUnique({
      where: { slug: parseResult.data },
      select: { id: true },
    });

    if (!associate) {
      return NextResponse.json({ error: 'Associate not found' }, { status: 404 });
    }

    // Get gap scores with 3-session gate
    const result = await getGapScores(associate.id);

    if (result.gated) {
      return NextResponse.json({
        gated: true,
        sessionCount: result.sessionCount,
        requiredSessions: result.requiredSessions,
        message: 'At least 3 completed sessions required for gap scores',
        scores: [],
      });
    }

    return NextResponse.json({
      gated: false,
      sessionCount: result.sessionCount,
      scores: result.scores,
    });
  } catch (error) {
    console.error('[gap-api] Error fetching gap scores:', error);
    return NextResponse.json({ error: 'Failed to fetch gap scores' }, { status: 500 });
  }
}
