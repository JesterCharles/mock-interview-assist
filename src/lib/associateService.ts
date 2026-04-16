import 'server-only';
import { prisma } from './prisma';

/**
 * Server-only associate lookups.
 */

export async function getAssociateIdBySlug(slug: string): Promise<number | null> {
  if (!slug) return null;
  const row = await prisma.associate.findUnique({
    where: { slug },
    select: { id: true },
  });
  return row?.id ?? null;
}

export async function getAssociateById(
  id: number
): Promise<{ id: number; slug: string } | null> {
  if (!Number.isFinite(id)) return null;
  const row = await prisma.associate.findUnique({
    where: { id },
    select: { id: true, slug: true },
  });
  return row ?? null;
}
