'use client';

import { useEffect, useState } from 'react';
import { TopBar } from './TopBar';
import { SectionSidebar } from './SectionSidebar';
import { associateSidebarGroups } from './sidebar-configs';
import type { ReactNode } from 'react';

interface AssociateShellProps {
  slug: string;
  cohortName: string | null;
  children: ReactNode;
}

export function AssociateShell({ slug, cohortName, children }: AssociateShellProps) {
  const groups = associateSidebarGroups(slug);

  const [collapsed, setCollapsed] = useState(false);
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
        sidebarHeader={cohortName}
        collapsed={collapsed}
        mounted={mounted}
      />
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        <TopBar
          role="associate"
          associateSlug={slug}
          sidebarGroups={groups}
          onToggleSidebar={toggleCollapsed}
          sidebarCollapsed={collapsed}
        />
        <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
