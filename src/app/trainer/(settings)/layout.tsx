'use client'

import { SectionSidebar } from '@/components/shell/SectionSidebar'
import { settingsSidebarGroups } from '@/components/shell/sidebar-configs'

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <SectionSidebar groups={settingsSidebarGroups} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </>
  )
}
