import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthenticatedSession } from '@/lib/auth-server';
import { readHistory } from '@/lib/historyService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!(await isAuthenticatedSession())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const fileHistory = readHistory();
    const dbCount = await prisma.session.count();
    const fileCount = fileHistory.length;

    // INVARIANT (Phase 10 Plan 02): DB is a SUPERSET of file-history. Automated
    // sessions (mode='automated', from /api/public/interview/complete and
    // /api/associate/interview/complete) are DB-only by design — they are
    // intentionally never written to the file-history JSON. Therefore the only
    // divergence we flag is "file-history session missing from DB", which is a
    // real write failure. DB rows absent from file-history are expected and
    // MUST NOT be reported as divergence.
    //
    // Spot-check 5 most recent file sessions exist in DB.
    const recentIds = fileHistory.slice(0, 5).map(s => s.id);
    const dbMatches = await prisma.session.findMany({
      where: { id: { in: recentIds } },
      select: { id: true },
    });
    const matchedIds = new Set(dbMatches.map(s => s.id));
    const mismatches = recentIds.filter(id => !matchedIds.has(id));

    return NextResponse.json({
      fileCount,
      dbCount,
      matched: recentIds.length - mismatches.length,
      mismatches,
    });
  } catch (error) {
    console.error('[sync-check] Error:', error);
    return NextResponse.json(
      { error: 'Sync check failed' },
      { status: 500 }
    );
  }
}
