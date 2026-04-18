import { describe, it, expect } from 'vitest';
import {
  dashboardSidebarGroups,
  trainerSettingsAccordion,
  associateSidebarGroups,
} from './sidebar-configs';

describe('dashboardSidebarGroups', () => {
  it('has 2 groups', () => {
    expect(dashboardSidebarGroups).toHaveLength(2);
  });

  it('first group is Overview with 3 items', () => {
    const overview = dashboardSidebarGroups[0];
    expect(overview.label).toBe('Overview');
    expect(overview.items).toHaveLength(3);
  });

  it('second group is Actions with 4 items (Coding added in Phase 40)', () => {
    const actions = dashboardSidebarGroups[1];
    expect(actions.label).toBe('Actions');
    expect(actions.items).toHaveLength(4);
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
    expect(items[1].href).toBe('/coding');
    expect(items[2].href).toBe('/trainer/reports');
    expect(items[3].href).toBe('/trainer/onboarding');
  });

  it('trainer sidebar contains a Coding entry labeled "Coding"', () => {
    const allItems = dashboardSidebarGroups.flatMap((g) => g.items);
    const coding = allItems.find((i) => i.href === '/coding');
    expect(coding).toBeDefined();
    expect(coding?.label).toBe('Coding');
  });

  it('associate sidebar contains a Coding entry labeled "Coding" pointing at /coding (Phase 40 truth)', () => {
    const groups = associateSidebarGroups('alice');
    const allItems = groups.flatMap((g) => g.items);
    const coding = allItems.find((i) => i.href === '/coding');
    expect(coding).toBeDefined();
    expect(coding?.label).toBe('Coding');
    // Shared URL (not /associate/[slug]/coding) per 40-01 D-02
    expect(coding?.href).toBe('/coding');
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

describe('trainerSettingsAccordion', () => {
  it('is labeled "Settings"', () => {
    expect(trainerSettingsAccordion.label).toBe('Settings');
  });

  it('has 5 items', () => {
    expect(trainerSettingsAccordion.items).toHaveLength(5);
  });

  it('has correct hrefs for Settings items', () => {
    const items = trainerSettingsAccordion.items;
    expect(items[0].href).toBe('/trainer/settings/threshold');
    expect(items[1].href).toBe('/trainer/settings/cohorts');
    expect(items[2].href).toBe('/trainer/settings/curriculum');
    expect(items[3].href).toBe('/trainer/settings/users');
    expect(items[4].href).toBe('/trainer/settings/associates');
  });

  it('group icon is a React component', () => {
    expect(trainerSettingsAccordion.icon).toBeTruthy();
    expect(
      typeof trainerSettingsAccordion.icon === 'function' ||
        (typeof trainerSettingsAccordion.icon === 'object' && trainerSettingsAccordion.icon !== null),
    ).toBe(true);
  });

  it('all items have icon property that is a React component', () => {
    for (const item of trainerSettingsAccordion.items) {
      // lucide-react exports forwardRef components (typeof 'object'), not plain functions
      expect(item.icon).toBeTruthy();
      expect(typeof item.icon === 'function' || (typeof item.icon === 'object' && item.icon !== null)).toBe(true);
    }
  });
});
