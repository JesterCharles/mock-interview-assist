'use client';

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

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg)' }}>
      <TopBar role="associate" associateSlug={slug} sidebarGroups={groups} />
      <div className="flex flex-1 overflow-hidden">
        <SectionSidebar groups={groups} sidebarHeader={cohortName} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
