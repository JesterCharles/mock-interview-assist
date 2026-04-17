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
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg)' }}>
      <TopBar sidebarGroups={groups} settingsGroup={trainerSettingsAccordion} />
      <div className="flex flex-1 items-start">
        <SectionSidebar
          groups={groups}
          settingsGroup={trainerSettingsAccordion}
          startCollapsed={startCollapsed}
        />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
