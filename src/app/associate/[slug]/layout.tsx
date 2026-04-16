import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { PublicShell } from '@/components/layout/PublicShell';
import { AssociateNav } from '@/components/associate/AssociateNav';

/**
 * Associate scoped layout — wraps all /associate/[slug]/* child pages
 * with AssociateNav tabs (Dashboard / Profile / Book a Mock).
 *
 * No identity guard here — each child page handles its own auth logic.
 * Layout is purely chrome: resolve display name for the nav, render shell.
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
    select: { displayName: true, slug: true },
  });

  if (!associate) {
    notFound();
  }

  const displayName = associate.displayName ?? associate.slug;
  const trainerEmail = process.env.TRAINER_EMAIL ?? '';

  return (
    <PublicShell>
      <AssociateNav
        slug={slug}
        associateName={displayName}
        trainerEmail={trainerEmail}
      />
      {children}
    </PublicShell>
  );
}
