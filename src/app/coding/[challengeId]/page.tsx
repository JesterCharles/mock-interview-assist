/**
 * /coding/[challengeId] — Phase 40 Plan 03 Task 3
 *
 * Server component: fetches challenge detail from /api/coding/challenges/[id],
 * renders SolveWorkspace (prompt + editor + submit) inside role-aware shell.
 */

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getCallerIdentity } from '@/lib/identity';
import { AppShell } from '@/components/shell/AppShell';
import { AssociateShell } from '@/components/shell/AssociateShell';
import {
  SolveWorkspace,
  type ChallengeDetail,
} from '@/components/coding/SolveWorkspace';

interface CodingSolvePageProps {
  params: Promise<{ challengeId: string }>;
}

export default async function CodingSolvePage({ params }: CodingSolvePageProps) {
  const { challengeId } = await params;

  const caller = await getCallerIdentity();
  if (caller.kind === 'anonymous') {
    redirect('/signin');
  }

  const hdrs = await headers();
  const host = hdrs.get('host') ?? 'localhost:3000';
  const proto = hdrs.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  const cookie = hdrs.get('cookie') ?? '';

  let challenge: ChallengeDetail | null = null;
  let errorCode: 'NOT_FOUND' | 'FORBIDDEN' | 'INTERNAL' | null = null;
  let errorMessage = '';

  try {
    const res = await fetch(
      `${proto}://${host}/api/coding/challenges/${encodeURIComponent(challengeId)}`,
      { headers: { cookie }, cache: 'no-store' },
    );
    if (res.ok) {
      challenge = (await res.json()) as ChallengeDetail;
    } else if (res.status === 404) {
      errorCode = 'NOT_FOUND';
      errorMessage = 'Challenge not found.';
    } else if (res.status === 403) {
      errorCode = 'FORBIDDEN';
      errorMessage = 'Challenge is not available for your cohort.';
    } else {
      errorCode = 'INTERNAL';
      try {
        const body = await res.json();
        errorMessage = body?.error?.message ?? `HTTP ${res.status}`;
      } catch {
        errorMessage = `HTTP ${res.status}`;
      }
    }
  } catch (err) {
    errorCode = 'INTERNAL';
    errorMessage = err instanceof Error ? err.message : 'Fetch failed';
  }

  const content = challenge ? (
    <main
      style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '32px 24px 64px',
      }}
    >
      <SolveWorkspace challenge={challenge} />
    </main>
  ) : (
    <main
      style={{
        maxWidth: '720px',
        margin: '0 auto',
        padding: '64px 24px',
        textAlign: 'center',
      }}
    >
      <h1
        style={{
          fontFamily: "var(--font-display), 'Clash Display', sans-serif",
          fontWeight: 600,
          fontSize: '32px',
          color: 'var(--ink)',
          margin: 0,
        }}
      >
        {errorCode === 'NOT_FOUND' ? 'Challenge not found' : 'Unable to load challenge'}
      </h1>
      <p
        style={{
          fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
          fontSize: '16px',
          color: 'var(--muted)',
          marginTop: '12px',
        }}
      >
        {errorMessage}
      </p>
    </main>
  );

  if (caller.kind === 'associate') {
    let cohortName: string | null = null;
    const assoc = await prisma.associate.findUnique({
      where: { id: caller.associateId },
      select: { cohortId: true },
    });
    if (assoc?.cohortId) {
      const cohort = await prisma.cohort.findUnique({
        where: { id: assoc.cohortId },
        select: { name: true },
      });
      cohortName = cohort?.name ?? null;
    }
    return (
      <AssociateShell slug={caller.associateSlug} cohortName={cohortName}>
        {content}
      </AssociateShell>
    );
  }

  return <AppShell>{content}</AppShell>;
}
