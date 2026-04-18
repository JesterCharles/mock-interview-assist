'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AvatarMenu } from './AvatarMenu';
import { CohortSwitcher } from './CohortSwitcher';
import { MobileSidebar } from './MobileSidebar';
import type { SidebarGroup, SettingsAccordionGroup } from './types';

type ProfileTab = 'profile' | 'security' | 'learning';

interface TopBarProps {
  sidebarGroups?: SidebarGroup[];
  settingsGroup?: SettingsAccordionGroup;
  role?: 'trainer' | 'associate';
  associateSlug?: string;
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
  /**
   * Forwarded to AvatarMenu so the enclosing shell can own a single
   * ProfileModal instance (P2 fix: prevents double-mount in AssociateShell).
   */
  onOpenProfile?: (initialTab?: ProfileTab) => void;
}

export function TopBar({
  sidebarGroups = [],
  settingsGroup,
  role = 'trainer',
  associateSlug,
  onToggleSidebar,
  sidebarCollapsed = false,
  onOpenProfile,
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
      {/* Desktop: sidebar collapse toggle */}
      {onToggleSidebar && (
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden md:inline-flex hover:bg-[var(--highlight)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            width: 34,
            height: 34,
            borderRadius: 6,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            cursor: 'pointer',
            color: 'var(--ink)',
            flexShrink: 0,
          }}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen style={{ width: 18, height: 18 }} aria-hidden="true" />
          ) : (
            <PanelLeftClose style={{ width: 18, height: 18 }} aria-hidden="true" />
          )}
        </button>
      )}

      {/* Mobile hamburger — narrow viewports only */}
      {sidebarGroups.length > 0 && (
        <div style={{ alignItems: 'center', flexShrink: 0 }} className="md:hidden flex">
          <MobileSidebar groups={sidebarGroups} settingsGroup={settingsGroup} />
        </div>
      )}

      {/* Wordmark — hidden on desktop only when a sidebar owns it (onToggleSidebar
          indicates AppShell/AssociateShell provides the sidebar wordmark).
          Bare-TopBar layouts (/history, /question-banks) keep the wordmark visible. */}
      <Link
        href={wordmarkHref}
        className={onToggleSidebar ? 'md:hidden' : ''}
        style={{
          fontFamily: 'var(--font-display), "Clash Display", sans-serif',
          fontWeight: 500,
          fontSize: 16,
          color: 'var(--ink)',
          textDecoration: 'none',
          letterSpacing: '-0.01em',
          flexShrink: 0,
        }}
      >
        NLM
      </Link>

      {/* Spacer — pushes right zone to the edge */}
      <div style={{ flex: 1 }} />

      {/* Right zone: CohortSwitcher (trainer only) + ThemeToggle + AvatarMenu */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {role === 'trainer' && (
          <Suspense fallback={null}>
            <CohortSwitcher />
          </Suspense>
        )}
        <ThemeToggle />
        <AvatarMenu onOpenProfile={onOpenProfile} />
      </div>
    </header>
  );
}
