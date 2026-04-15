'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, PlayCircle, User } from 'lucide-react';

/**
 * Lightweight nav surfaced inside PublicShell when an associate cookie is
 * present. Three actions: profile, start interview, sign out. Self-fetches
 * identity from /api/associate/me so PublicShell can stay sync (and safely
 * importable from client component pages).
 */
export function AssociateNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/associate/me', { cache: 'no-store' });
        if (!res.ok) return; // anonymous — render nothing
        const data = (await res.json()) as { slug?: string };
        if (!cancelled && data.slug) setSlug(data.slug);
      } catch {
        // ignore — render nothing
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (!slug) return null;

  const profileHref = `/associate/${slug}`;
  const interviewHref = `/associate/${slug}/interview`;

  async function handleLogout() {
    try {
      await fetch('/api/associate/logout', { method: 'POST' });
    } catch {
      // ignore — still navigate away
    }
    setSlug(null);
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
