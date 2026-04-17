import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { AssociateShell } from '@/components/shell/AssociateShell';

/**
 * Associate scoped layout — wraps all /associate/[slug]/* child pages
 * with the unified TopBar + SectionSidebar shell (matching trainer layout).
 *
 * Server component: fetches associate + cohort name, passes to AssociateShell client component.
 *
 * Next.js 16: params is a Promise — must await before use.
 */

interface AssociateLayoutProps {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function AssociateLayout({ children, params }: AssociateLayoutProps) {
  const { slug } = await params;

  const associate = await prisma.associate.findUnique({
    where: { slug },
    select: { displayName: true, slug: true, cohortId: true },
  });

  if (!associate) {
    notFound();
  }

  let cohortName: string | null = null;
  if (associate.cohortId) {
    const cohort = await prisma.cohort.findUnique({
      where: { id: associate.cohortId },
      select: { name: true },
    });
    cohortName = cohort?.name ?? null;
  }

  return (
    <AssociateShell slug={slug} cohortName={cohortName}>
      {children}
    </AssociateShell>
  );
}
