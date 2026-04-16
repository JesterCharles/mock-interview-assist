/**
 * AssociateNav unit tests
 *
 * Tests the component's tab configuration logic (hrefs, mailto, active detection).
 * Uses node environment — tests the pure logic exported from the module, not DOM render.
 */

import { describe, it, expect, vi } from 'vitest';

// Mock next/navigation before importing component
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/associate/test-slug'),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  LayoutDashboard: () => null,
  User: () => null,
  Calendar: () => null,
}));

import { buildTabs, buildMailtoHref } from './AssociateNav';

describe('AssociateNav — buildTabs', () => {
  it('Test 1: returns 3 tabs: Dashboard, Profile, Book a Mock', () => {
    const tabs = buildTabs('test-slug', 'Test Name');
    const labels = tabs.map((t) => t.label);
    expect(labels).toContain('Dashboard');
    expect(labels).toContain('Profile');
    expect(labels).toContain('Book a Mock');
    expect(tabs).toHaveLength(3);
  });

  it('Test 2: Dashboard tab has href /associate/test-slug/dashboard', () => {
    const tabs = buildTabs('test-slug', 'Test Name');
    const dashboard = tabs.find((t) => t.label === 'Dashboard');
    expect(dashboard?.href).toBe('/associate/test-slug/dashboard');
  });

  it('Test 3: Profile tab has href /associate/test-slug', () => {
    const tabs = buildTabs('test-slug', 'Test Name');
    const profile = tabs.find((t) => t.label === 'Profile');
    expect(profile?.href).toBe('/associate/test-slug');
  });

  it('Test 4: Book a Mock tab has mailto href with correct subject', () => {
    const tabs = buildTabs('test-slug', 'Test Name');
    const book = tabs.find((t) => t.label === 'Book a Mock');
    expect(book?.href).toMatch(/^mailto:/);
    expect(book?.href).toContain(encodeURIComponent('Book a Mock Interview — Test Name'));
  });
});

describe('AssociateNav — buildMailtoHref', () => {
  it('Test 5: returns mailto with subject only when no trainerEmail', () => {
    const href = buildMailtoHref('Test Name');
    expect(href).toMatch(/^mailto:\?subject=/);
  });

  it('Test 6: returns mailto with trainerEmail when provided', () => {
    const href = buildMailtoHref('Test Name', 'trainer@example.com');
    expect(href).toMatch(/^mailto:trainer@example\.com\?subject=/);
  });

  it('Test 7: subject includes associate name', () => {
    const href = buildMailtoHref('Jane Doe');
    expect(href).toContain(encodeURIComponent('Book a Mock Interview — Jane Doe'));
  });

  it('Test 8: empty string trainerEmail treated same as unset', () => {
    const href = buildMailtoHref('Test Name', '');
    expect(href).toMatch(/^mailto:\?subject=/);
  });
});
