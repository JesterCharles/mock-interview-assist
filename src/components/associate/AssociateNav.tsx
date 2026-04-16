'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, User, Calendar } from 'lucide-react';

export interface AssociateNavTab {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number }>;
  isMailto?: boolean;
}

/**
 * Build the mailto href for the "Book a Mock" CTA.
 * Exported for unit testing.
 */
export function buildMailtoHref(associateName: string, trainerEmail?: string): string {
  const subject = encodeURIComponent(`Book a Mock Interview — ${associateName}`);
  const to = trainerEmail && trainerEmail.length > 0 ? trainerEmail : '';
  return `mailto:${to}?subject=${subject}`;
}

/**
 * Build the tabs array for AssociateNav.
 * Exported for unit testing.
 */
export function buildTabs(
  slug: string,
  associateName: string,
  trainerEmail?: string,
): AssociateNavTab[] {
  return [
    {
      label: 'Dashboard',
      href: `/associate/${slug}/dashboard`,
      icon: LayoutDashboard,
    },
    {
      label: 'Profile',
      href: `/associate/${slug}`,
      icon: User,
    },
    {
      label: 'Book a Mock',
      href: buildMailtoHref(associateName, trainerEmail),
      icon: Calendar,
      isMailto: true,
    },
  ];
}

interface AssociateNavProps {
  slug: string;
  associateName: string;
  trainerEmail?: string;
}

/**
 * AssociateNav — tabbed navigation for /associate/[slug]/* pages.
 *
 * Three tabs: Dashboard, Profile, Book a Mock (inline mailto CTA).
 * Active tab detected via usePathname() — aria-current="page" + accent underline.
 * Follows DESIGN.md: DM Sans 14px/500, border-bottom tab bar, var(--accent) active.
 */
export function AssociateNav({ slug, associateName, trainerEmail }: AssociateNavProps) {
  const pathname = usePathname();
  const tabs = buildTabs(slug, associateName, trainerEmail);

  return (
    <nav
      aria-label="Associate navigation"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '0 0',
        marginBottom: '32px',
      }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        // Active detection: exact match for profile (/associate/slug), prefix for others
        const isActive = tab.isMailto
          ? false
          : tab.href === `/associate/${slug}`
            ? pathname === tab.href
            : pathname.startsWith(tab.href);

        const commonStyles: React.CSSProperties = {
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '12px 16px',
          fontSize: '14px',
          fontWeight: 500,
          fontFamily: "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif",
          textDecoration: 'none',
          color: isActive ? 'var(--ink)' : 'var(--muted)',
          borderBottom: isActive
            ? '2px solid var(--accent)'
            : '2px solid transparent',
          marginBottom: '-1px',
          transition: 'color 100ms ease-out, border-color 100ms ease-out',
          cursor: 'pointer',
        };

        if (tab.isMailto) {
          return (
            <a
              key={tab.label}
              href={tab.href}
              style={commonStyles}
            >
              <Icon size={16} />
              {tab.label}
            </a>
          );
        }

        return (
          <Link
            key={tab.label}
            href={tab.href}
            aria-current={isActive ? 'page' : undefined}
            style={commonStyles}
          >
            <Icon size={16} />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default AssociateNav;
