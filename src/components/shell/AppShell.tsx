'use client';

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

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      <TopBar sidebarGroups={groups} settingsGroup={trainerSettingsAccordion} />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <SectionSidebar
          groups={groups}
          settingsGroup={trainerSettingsAccordion}
          startCollapsed={startCollapsed}
        />
        <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
