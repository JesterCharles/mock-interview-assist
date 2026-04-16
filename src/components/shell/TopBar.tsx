'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AvatarMenu } from './AvatarMenu';
import { CohortSwitcher } from './CohortSwitcher';
import { MobileSidebar } from './MobileSidebar';
import { dashboardSidebarGroups, settingsSidebarGroups } from './sidebar-configs';
import type { SidebarGroup } from './types';

function resolveGroups(pathname: string): SidebarGroup[] {
  if (pathname.startsWith('/trainer/settings')) return settingsSidebarGroups;
  if (pathname.startsWith('/trainer')) return dashboardSidebarGroups;
  return [];
}

interface NavItem {
  label: string;
  prefix: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', prefix: '/trainer', href: '/trainer' },
  { label: 'Interviews', prefix: '/interview', href: '/interview/new' },
  { label: 'Question Banks', prefix: '/question-banks', href: '/question-banks' },
  { label: 'Settings', prefix: '/trainer/settings', href: '/trainer/settings' },
];

function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.prefix === '/trainer/settings') {
    return pathname.startsWith('/trainer/settings');
  }
  if (item.prefix === '/trainer') {
    // Active for exact /trainer OR /trainer/* but NOT /trainer/settings
    return (
      pathname === '/trainer' ||
      (pathname.startsWith('/trainer/') && !pathname.startsWith('/trainer/settings'))
    );
  }
  return pathname === item.href || pathname.startsWith(`${item.prefix}/`);
}

interface TopBarProps {
  sidebarGroups?: SidebarGroup[];
}

export function TopBar({ sidebarGroups: propGroups }: TopBarProps) {
  const pathname = usePathname();
  const sidebarGroups = propGroups ?? resolveGroups(pathname);

  return (
    <header
      style={{
        height: 56,
        position: 'sticky',
        top: 0,
        zIndex: 30,
        background: 'var(--surface-muted)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 16,
        paddingRight: 16,
        gap: 16,
      }}
    >
      {/* Left zone: wordmark + mobile hamburger */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {sidebarGroups && sidebarGroups.length > 0 && (
          <MobileSidebar groups={sidebarGroups} />
        )}
        <Link
          href="/trainer"
          style={{
            fontFamily: 'var(--font-display), "Clash Display", sans-serif',
            fontWeight: 500,
            fontSize: 16,
            color: 'var(--ink)',
            textDecoration: 'none',
            letterSpacing: '-0.01em',
          }}
        >
          NLM
        </Link>
      </div>

      {/* Center zone: section nav links (desktop only) */}
      <nav
        className="hidden md:flex"
        style={{ flex: 1, alignItems: 'center', gap: 4 }}
        aria-label="Main navigation"
      >
        {NAV_ITEMS.map((item) => {
          const active = isNavItemActive(item, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 13,
                fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
                fontWeight: 500,
                color: active ? 'var(--accent)' : 'var(--ink)',
                textDecoration: 'none',
                borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                transition: 'background 120ms ease-out, color 120ms ease-out',
              }}
              className="hover:bg-[var(--highlight)]"
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Right zone: CohortSwitcher + ThemeToggle + AvatarMenu */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 'auto' }}>
        <Suspense fallback={null}>
          <CohortSwitcher />
        </Suspense>
        <ThemeToggle />
        <AvatarMenu />
      </div>
    </header>
  );
}
