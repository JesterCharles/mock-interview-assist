/**
 * /coding/[challengeId] — Phase 40 Plan 01 Task 3 (server component shell)
 *
 * Plan 40-03 replaces the placeholder with real prompt + Monaco editor + submit.
 * This scaffold establishes:
 *   - async params extraction (Next 16)
 *   - identity gate (anonymous → /signin)
 *   - role-aware shell branch
 *   - placeholder content using DESIGN tokens only
 */

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCallerIdentity } from '@/lib/identity';
import { AppShell } from '@/components/shell/AppShell';
import { AssociateShell } from '@/components/shell/AssociateShell';

interface CodingSolvePageProps {
  params: Promise<{ challengeId: string }>;
}

export default async function CodingSolvePage({ params }: CodingSolvePageProps) {
  const { challengeId } = await params;

  const caller = await getCallerIdentity();
  if (caller.kind === 'anonymous') {
    redirect('/signin');
  }

  const content = (
    <main
      style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '32px 24px 64px',
      }}
    >
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
        Challenge
      </h1>
      <p
        style={{
          fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
          fontSize: '16px',
          color: 'var(--muted)',
          marginTop: '8px',
        }}
      >
        Solve view wired in 40-03.
      </p>
      <p
        style={{
          fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
          fontSize: '12px',
          color: 'var(--muted)',
          marginTop: '16px',
        }}
      >
        challengeId: {challengeId}
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
