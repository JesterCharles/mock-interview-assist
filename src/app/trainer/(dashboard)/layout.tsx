'use client'

import { SectionSidebar } from '@/components/shell/SectionSidebar'
import { dashboardSidebarGroups } from '@/components/shell/sidebar-configs'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <SectionSidebar groups={dashboardSidebarGroups} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </>
  )
}
