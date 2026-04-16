import { describe, it, expect } from 'vitest'
import { settingsSidebarGroups } from '@/components/shell/sidebar-configs'

describe('trainer nav → cohorts link', () => {
  it('settings sidebar config includes a link to /trainer/settings/cohorts', () => {
    const allItems = settingsSidebarGroups.flatMap(g => g.items)
    const cohortsItem = allItems.find(item => item.href === '/trainer/settings/cohorts')
    expect(cohortsItem).toBeDefined()
    expect(cohortsItem!.label).toBe('Cohorts')
  })
})
