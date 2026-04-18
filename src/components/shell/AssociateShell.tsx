'use client';

import { useEffect, useState } from 'react';
import { TopBar } from './TopBar';
import { SectionSidebar } from './SectionSidebar';
import { ProfileModal } from './ProfileModal';
import { associateSettingsAccordion, associateSidebarGroups } from './sidebar-configs';
import type { ReactNode } from 'react';

type ProfileTab = 'profile' | 'security' | 'learning';

interface AssociateShellProps {
  slug: string;
  cohortName: string | null;
  children: ReactNode;
}

export function AssociateShell({ slug, cohortName, children }: AssociateShellProps) {
  const groups = associateSidebarGroups(slug);

  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileInitialTab, setProfileInitialTab] = useState<ProfileTab>('profile');

  useEffect(() => {
    const stored = window.localStorage.getItem('nlm_sidebar_collapsed');
    if (stored === 'true') setCollapsed(true);
    else if (stored === 'false') setCollapsed(false);
    setMounted(true);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      window.localStorage.setItem('nlm_sidebar_collapsed', String(next));
      return next;
    });
  };

  const expandSidebar = () => {
    setCollapsed(false);
    window.localStorage.setItem('nlm_sidebar_collapsed', 'false');
  };

  const openProfileTab = (tab: ProfileTab = 'profile') => {
    setProfileInitialTab(tab);
    setProfileOpen(true);
  };

  const homeHref = `/associate/${slug}/dashboard`;

  const settingsGroup = associateSettingsAccordion(
    () => openProfileTab('profile'),
    () => openProfileTab('security'),
  );

  return (
    <>
      <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
        <SectionSidebar
          groups={groups}
          settingsGroup={settingsGroup}
          sidebarHeader={cohortName}
          collapsed={collapsed}
          mounted={mounted}
          homeHref={homeHref}
          onExpandSidebar={expandSidebar}
        />
        <div className="flex flex-col flex-1 min-w-0 min-h-0">
          <TopBar
            role="associate"
            associateSlug={slug}
            sidebarGroups={groups}
            onToggleSidebar={toggleCollapsed}
            sidebarCollapsed={collapsed}
            onOpenProfile={openProfileTab}
          />
          <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
        </div>
      </div>
      <ProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        initialTab={profileInitialTab}
      />
    </>
  );
}
