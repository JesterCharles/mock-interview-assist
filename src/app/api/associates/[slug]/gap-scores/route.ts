import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCallerIdentity } from '@/lib/identity';
import { prisma } from '@/lib/prisma';
import type { GapScoreResponse } from '@/lib/adaptiveSetup';

// Validate slug format per Phase 3 D-05: lowercase alphanumeric with hyphens only
const slugSchema = z.string().regex(/^[a-z0-9-]+$/);

/**
 * GET /api/associates/[slug]/gap-scores
 *
 * Returns gap scores for an associate by slug.
 * Always returns 200 with consistent shape — unknown slug returns found:false
 * to prevent slug enumeration (T-07-03).
 *
 * Auth: trainer session cookie required (T-07-02).
 * Validation: slug validated against ^[a-z0-9-]+$ (T-07-01).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  // Auth guard — trainer session required
  const caller = await getCallerIdentity() // [AUDIT-VERIFIED: P20]
  if (caller.kind !== 'trainer' && caller.kind !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { slug } = await params;

  // Validate slug format before any DB query (T-07-01)
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid slug format' }, { status: 400 });
  }

  try {
    // Query associate with skill-level gap scores.
    // Per Phase 4 schema: topic is a non-nullable String with @default("").
    // Skill-level GapScore rows use topic = "" (empty string); topic-level rows have a non-empty value.
    const associate = await prisma.associate.findUnique({
      where: { slug: parsed.data },
      include: {
        gapScores: {
          where: { topic: '' }, // skill-level scores only (empty string = no topic)
        },
      },
    });

    // Unknown slug → return found:false (same shape as new associate)
    // Anti-enumeration: never distinguish "not found" from "new associate" (T-07-03, D-04)
    if (!associate) {
      const response: GapScoreResponse = { found: false, sessionCount: 0, scores: [], cohortId: null };
      return NextResponse.json(response);
    }

    // Count completed sessions for this associate
    const sessionCount = await prisma.session.count({
      where: { associateId: associate.id, status: 'completed' },
    });

    const response: GapScoreResponse = {
      found: true,
      sessionCount,
      scores: associate.gapScores.map((g) => ({
        skill: g.skill,
        weightedScore: g.weightedScore,
      })),
      cohortId: associate.cohortId ?? null,
    };

    return NextResponse.json(response);
  } catch {
    // Return same shape as "not found" to preserve anti-enumeration (T-07-03)
    const response: GapScoreResponse = { found: false, sessionCount: 0, scores: [], cohortId: null };
    return NextResponse.json(response);
  }
}
