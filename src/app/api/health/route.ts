import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { systemInfo } from '@/lib/judge0Client';
import { log } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type DbStatus = 'connected' | 'disconnected';
type Judge0Status = 'ok' | 'unreachable' | 'degraded';

async function checkDb(): Promise<DbStatus> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return 'connected';
  } catch {
    return 'disconnected';
  }
}

async function checkJudge0(): Promise<{ status: Judge0Status; version?: string }> {
  try {
    const info = await systemInfo(2000);
    return {
      status: 'ok',
      version: typeof info.version === 'string' ? info.version : undefined,
    };
  } catch {
    return { status: 'unreachable' };
  }
}

export async function GET() {
  const startedAt = Date.now();
  const [db, judge0] = await Promise.all([checkDb(), checkJudge0()]);
  const allOk = db === 'connected' && judge0.status === 'ok';
  const body = {
    status: allOk ? ('ok' as const) : ('error' as const),
    checks: { db, judge0: judge0.status },
    ...(judge0.version ? { judge0Version: judge0.version } : {}),
  };
  const status = allOk ? 200 : 503;
  log[allOk ? 'info' : 'warn']('health check', {
    route: '/api/health',
    status,
    db,
    judge0: judge0.status,
    latency_ms: Date.now() - startedAt,
  });
  return NextResponse.json(body, { status });
}
