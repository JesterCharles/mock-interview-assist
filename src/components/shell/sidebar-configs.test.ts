import { describe, it, expect } from 'vitest';
import { dashboardSidebarGroups, settingsSidebarGroups } from './sidebar-configs';

describe('dashboardSidebarGroups', () => {
  it('has 2 groups', () => {
    expect(dashboardSidebarGroups).toHaveLength(2);
  });

  it('first group is Overview with 3 items', () => {
    const overview = dashboardSidebarGroups[0];
    expect(overview.label).toBe('Overview');
    expect(overview.items).toHaveLength(3);
  });

  it('second group is Actions with 3 items', () => {
    const actions = dashboardSidebarGroups[1];
    expect(actions.label).toBe('Actions');
    expect(actions.items).toHaveLength(3);
  });

  it('has correct hrefs for Overview items', () => {
    const items = dashboardSidebarGroups[0].items;
    expect(items[0].href).toBe('/trainer');
    expect(items[1].href).toBe('/trainer/gap-analysis');
    expect(items[2].href).toBe('/trainer/calibration');
  });

  it('has correct hrefs for Actions items', () => {
    const items = dashboardSidebarGroups[1].items;
    expect(items[0].href).toBe('/interview/new');
    expect(items[1].href).toBe('/trainer/reports');
    expect(items[2].href).toBe('/trainer/onboarding');
  });

  it('all items have icon property that is a React component', () => {
    for (const group of dashboardSidebarGroups) {
      for (const item of group.items) {
        // lucide-react exports forwardRef components (typeof 'object'), not plain functions
        expect(item.icon).toBeTruthy();
        expect(typeof item.icon === 'function' || (typeof item.icon === 'object' && item.icon !== null)).toBe(true);
      }
    }
  });
});

describe('settingsSidebarGroups', () => {
  it('has 1 group', () => {
    expect(settingsSidebarGroups).toHaveLength(1);
  });

  it('group is Settings with 5 items', () => {
    const settings = settingsSidebarGroups[0];
    expect(settings.label).toBe('Settings');
    expect(settings.items).toHaveLength(5);
  });

  it('has correct hrefs for Settings items', () => {
    const items = settingsSidebarGroups[0].items;
    expect(items[0].href).toBe('/trainer/settings/threshold');
    expect(items[1].href).toBe('/trainer/settings/cohorts');
    expect(items[2].href).toBe('/trainer/settings/curriculum');
    expect(items[3].href).toBe('/trainer/settings/users');
    expect(items[4].href).toBe('/trainer/settings/associates');
  });

  it('all items have icon property that is a React component', () => {
    for (const group of settingsSidebarGroups) {
      for (const item of group.items) {
        // lucide-react exports forwardRef components (typeof 'object'), not plain functions
        expect(item.icon).toBeTruthy();
        expect(typeof item.icon === 'function' || (typeof item.icon === 'object' && item.icon !== null)).toBe(true);
      }
    }
  });
});
