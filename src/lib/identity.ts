import { createSupabaseServerClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

/**
 * Caller identity — sourced from Supabase session only.
 *
 * Role is stored in auth.users.user_metadata.role:
 *   'admin'   — full access, can promote users
 *   'trainer' — trainer dashboard access
 *   (absent)  — treated as associate; FK lookup required
 *
 * Associate linkage uses Associate.authUserId FK (populated in Phase 17 schema).
 * If no matching Associate row is found, returns anonymous.
 *
 * No PIN cookie read. No ENABLE_ASSOCIATE_AUTH check.
 */
export type CallerIdentity =
  | { kind: 'admin'; userId: string; email: string }
  | { kind: 'trainer'; userId: string; email: string }
  | { kind: 'associate'; userId: string; email: string; associateId: number; associateSlug: string }
  | { kind: 'anonymous' };

export async function getCallerIdentity(): Promise<CallerIdentity> {
  const supabase = await createSupabaseServerClient();

  // Use getUser() (server-validated) not getSession() — see Research Pitfall 2.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { kind: 'anonymous' };
  }

  const role: string = user.user_metadata?.role ?? 'associate';
  const userId = user.id;
  const email = user.email ?? '';

  if (role === 'admin') {
    return { kind: 'admin', userId, email };
  }

  if (role === 'trainer') {
    return { kind: 'trainer', userId, email };
  }

  // Associate role: look up by authUserId FK.
  const associate = await prisma.associate.findUnique({
    where: { authUserId: userId },
    select: { id: true, slug: true },
  });

  if (!associate) {
    // Authenticated but no matching Associate row — treat as anonymous.
    return { kind: 'anonymous' };
  }

  return {
    kind: 'associate',
    userId,
    email,
    associateId: associate.id,
    associateSlug: associate.slug,
  };
}
