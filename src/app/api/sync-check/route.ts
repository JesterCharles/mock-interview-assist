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

    // Spot-check 5 most recent file sessions exist in DB
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
