/**
 * /coding — Phase 40 Plan 01 Task 3 (server component shell)
 *
 * Plan 40-02 fleshes this out with real list rendering, filters, pagination.
 * This scaffold establishes:
 *   - identity gate (anonymous → /signin)
 *   - role-aware shell (trainer → AppShell, associate → AssociateShell)
 *   - placeholder content using DESIGN tokens only
 */

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCallerIdentity } from '@/lib/identity';
import { AppShell } from '@/components/shell/AppShell';
import { AssociateShell } from '@/components/shell/AssociateShell';

export default async function CodingListPage() {
  const caller = await getCallerIdentity();
  if (caller.kind === 'anonymous') {
    redirect('/signin');
  }

  const content = (
    <main
      style={{
        maxWidth: '1120px',
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
        List rendering wired in 40-02.
      </p>
    </main>
  );

  if (caller.kind === 'associate') {
    // Look up cohort name for AssociateShell header.
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

  // trainer / admin
  return <AppShell>{content}</AppShell>;
}
