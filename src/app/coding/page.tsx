/**
 * /coding — Phase 40 Plan 02 Task 3
 *
 * Server component: identity gate, server-fetches the first page of
 * /api/coding/challenges with filters from searchParams, hydrates the
 * <ChallengeList> client component with initial data.
 *
 * Role-aware shell: trainer/admin → AppShell, associate → AssociateShell.
 */

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getCallerIdentity } from '@/lib/identity';
import { AppShell } from '@/components/shell/AppShell';
import { AssociateShell } from '@/components/shell/AssociateShell';
import { ChallengeList } from '@/components/coding/ChallengeList';
import type { ChallengeListItem } from '@/hooks/useChallengeList';

interface CodingListPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const FILTER_KEYS = ['language', 'difficulty', 'status', 'week'] as const;

export default async function CodingListPage({ searchParams }: CodingListPageProps) {
  const caller = await getCallerIdentity();
  if (caller.kind === 'anonymous') {
    redirect('/signin');
  }

  const sp = (await searchParams) ?? {};
  const qs = new URLSearchParams();
  for (const k of FILTER_KEYS) {
    const v = sp[k];
    const s = Array.isArray(v) ? v[0] : v;
    if (s) qs.set(k, s);
  }
  qs.set('limit', '20');

  // Resolve base URL for server-side fetch.
  const hdrs = await headers();
  const host = hdrs.get('host') ?? 'localhost:3000';
  const proto = hdrs.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  const cookie = hdrs.get('cookie') ?? '';

  let initialItems: ChallengeListItem[] = [];
  let initialCursor: string | null = null;
  let listFetchError: { code: string; message: string } | null = null;

  try {
    const res = await fetch(`${proto}://${host}/api/coding/challenges?${qs.toString()}`, {
      headers: { cookie },
      cache: 'no-store',
    });
    if (res.ok) {
      const body = (await res.json()) as {
        items: ChallengeListItem[];
        nextCursor: string | null;
      };
      initialItems = body.items ?? [];
      initialCursor = body.nextCursor ?? null;
    } else {
      try {
        const body = await res.json();
        listFetchError = {
          code: body?.error?.code ?? 'UNKNOWN',
          message: body?.error?.message ?? `HTTP ${res.status}`,
        };
      } catch {
        listFetchError = { code: 'UNKNOWN', message: `HTTP ${res.status}` };
      }
    }
  } catch (err) {
    listFetchError = {
      code: 'NETWORK_ERROR',
      message: err instanceof Error ? err.message : 'Fetch failed',
    };
  }

  // Determine caller-has-cohort up-front for the empty-state branch.
  let callerHasCohort = caller.kind !== 'associate';
  if (caller.kind === 'associate') {
    const assoc = await prisma.associate.findUnique({
      where: { id: caller.associateId },
      select: { cohortId: true },
    });
    callerHasCohort = !!assoc?.cohortId;
  }

  // Available weeks: derive from the cohort's curriculum weeks if associate is in a cohort.
  let availableWeeks: number[] | undefined;
  if (caller.kind === 'associate') {
    const assoc = await prisma.associate.findUnique({
      where: { id: caller.associateId },
      select: { cohortId: true },
    });
    if (assoc?.cohortId) {
      const weeks = await prisma.curriculumWeek.findMany({
        where: { cohortId: assoc.cohortId },
        select: { weekNumber: true },
        orderBy: { weekNumber: 'asc' },
      });
      if (weeks.length) {
        availableWeeks = Array.from(new Set(weeks.map((w) => w.weekNumber)));
      }
    }
  }

  const content = (
    <main
      style={{
        maxWidth: '1120px',
        margin: '0 auto',
        padding: '32px 0 64px',
      }}
    >
      <header style={{ padding: '0 24px 16px' }}>
        <h1
          style={{
            fontFamily: "var(--font-display), 'Clash Display', sans-serif",
            fontWeight: 600,
            fontSize: '48px',
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            color: 'var(--ink)',
            margin: 0,
          }}
        >
          Coding Challenges
        </h1>
        <p
          style={{
            fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
            fontSize: '16px',
            color: 'var(--muted)',
            marginTop: '8px',
          }}
        >
          Practice reps for your curriculum.
        </p>
      </header>

      {listFetchError ? (
        <div
          role="alert"
          style={{
            margin: '0 24px',
            background: 'var(--danger-bg)',
            color: 'var(--danger)',
            border: '1px solid var(--danger)',
            borderRadius: '8px',
            padding: '16px',
            fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
            fontSize: '14px',
          }}
        >
          {listFetchError.message}
        </div>
      ) : (
        <ChallengeList
          initialItems={initialItems}
          initialCursor={initialCursor}
          callerHasCohort={callerHasCohort}
          availableWeeks={availableWeeks}
        />
      )}
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
