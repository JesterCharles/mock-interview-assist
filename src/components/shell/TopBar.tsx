'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AvatarMenu } from './AvatarMenu';
import { CohortSwitcher } from './CohortSwitcher';
import { MobileSidebar } from './MobileSidebar';
import type { SidebarGroup, SettingsAccordionGroup } from './types';

interface TopBarProps {
  sidebarGroups?: SidebarGroup[];
  settingsGroup?: SettingsAccordionGroup;
  role?: 'trainer' | 'associate';
  associateSlug?: string;
}

export function TopBar({
  sidebarGroups = [],
  settingsGroup,
  role = 'trainer',
  associateSlug,
}: TopBarProps) {
  const wordmarkHref =
    role === 'associate' && associateSlug
      ? `/associate/${associateSlug}/dashboard`
      : '/trainer';

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
      {/* Left zone: mobile hamburger + wordmark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {sidebarGroups.length > 0 && (
          <MobileSidebar groups={sidebarGroups} settingsGroup={settingsGroup} />
        )}
        <Link
          href={wordmarkHref}
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

      {/* Spacer — no center nav */}
      <div style={{ flex: 1 }} />

      {/* Right zone: CohortSwitcher (trainer only) + ThemeToggle + AvatarMenu */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {role === 'trainer' && (
          <Suspense fallback={null}>
            <CohortSwitcher />
          </Suspense>
        )}
        <ThemeToggle />
        <AvatarMenu />
      </div>
    </header>
  );
}
