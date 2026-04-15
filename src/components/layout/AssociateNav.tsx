'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, PlayCircle, User } from 'lucide-react';

interface AssociateNavProps {
  slug: string;
}

/**
 * Lightweight nav surfaced inside PublicShell when an associate cookie is
 * present. Three actions: profile, start interview, sign out.
 */
export function AssociateNav({ slug }: AssociateNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const profileHref = `/associate/${slug}`;
  const interviewHref = `/associate/${slug}/interview`;

  async function handleLogout() {
    try {
      await fetch('/api/associate/logout', { method: 'POST' });
    } catch {
      // ignore — still navigate away
    }
    router.replace('/');
    router.refresh();
  }

  const linkBase =
    'inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors';
  const linkActive = 'text-[var(--accent)] bg-[var(--highlight)]';
  const linkIdle = 'text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--highlight)]';

  return (
    <nav className="flex items-center gap-1" aria-label="Associate menu">
      <Link
        href={profileHref}
        className={`${linkBase} ${pathname === profileHref ? linkActive : linkIdle}`}
      >
        <User className="w-4 h-4" aria-hidden="true" />
        Profile
      </Link>
      <Link
        href={interviewHref}
        className={`${linkBase} ${pathname === interviewHref ? linkActive : linkIdle}`}
      >
        <PlayCircle className="w-4 h-4" aria-hidden="true" />
        New Interview
      </Link>
      <button
        type="button"
        onClick={handleLogout}
        className={`${linkBase} ${linkIdle}`}
        aria-label="Sign out"
      >
        <LogOut className="w-4 h-4" aria-hidden="true" />
        Sign out
      </button>
    </nav>
  );
}

export default AssociateNav;
