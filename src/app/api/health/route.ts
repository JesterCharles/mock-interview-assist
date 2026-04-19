import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { systemInfo } from '@/lib/judge0Client';
import { isCodingEnabled } from '@/lib/codingFeatureFlag';
import { log } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type DbStatus = 'connected' | 'disconnected';
// 'disabled' (v1.5): Judge0 deferred to v1.6 — either the feature flag is
// dark or JUDGE0_URL is unset/empty. /api/health treats disabled as OK so
// uptime checks go green while the coding stack is still flag-dark.
type Judge0Status = 'ok' | 'unreachable' | 'degraded' | 'disabled';

async function checkDb(): Promise<DbStatus> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return 'connected';
  } catch {
    return 'disconnected';
  }
}

function judge0IsConfigured(): boolean {
  // 'disabled' fires when Judge0 is not wired for this environment.
  // - Feature flag dark (v1.5 prod) → disabled, skip network call
  // - JUDGE0_URL unset or empty string → disabled, skip network call
  // Either signal is sufficient; both are expected in v1.5 prod.
  if (!isCodingEnabled()) return false;
  const url = process.env.JUDGE0_URL;
  if (!url || url.trim() === '') return false;
  return true;
}

async function checkJudge0(): Promise<{ status: Judge0Status; version?: string }> {
  if (!judge0IsConfigured()) {
    return { status: 'disabled' };
  }
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
  // 'disabled' is treated as OK — Judge0 is flag-dark in v1.5 and uptime
  // checks must go green without it. Only 'unreachable' / 'degraded' fail.
  const judge0Ok = judge0.status === 'ok' || judge0.status === 'disabled';
  const allOk = db === 'connected' && judge0Ok;
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
