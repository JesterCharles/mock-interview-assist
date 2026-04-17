'use client';

import { useEffect, useState } from 'react';
import { TopBar } from './TopBar';
import { SectionSidebar } from './SectionSidebar';
import {
  dashboardSidebarGroups,
  trainerSettingsAccordion,
} from './sidebar-configs';

type Variant = 'trainer' | 'mock';

interface AppShellProps {
  children: React.ReactNode;
  variant?: Variant;
}

export function AppShell({ children, variant = 'trainer' }: AppShellProps) {
  const groups = dashboardSidebarGroups;
  const startCollapsed = variant === 'mock';

  const [collapsed, setCollapsed] = useState(startCollapsed);
  const [mounted, setMounted] = useState(false);

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

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      <SectionSidebar
        groups={groups}
        settingsGroup={trainerSettingsAccordion}
        collapsed={collapsed}
        mounted={mounted}
      />
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        <TopBar
          sidebarGroups={groups}
          settingsGroup={trainerSettingsAccordion}
          onToggleSidebar={toggleCollapsed}
          sidebarCollapsed={collapsed}
        />
        <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
