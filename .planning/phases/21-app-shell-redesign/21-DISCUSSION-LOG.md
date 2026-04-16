# Phase 21: App Shell Redesign - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.

**Date:** 2026-04-16
**Phase:** 21-app-shell-redesign
**Mode:** --auto (all decisions auto-selected with recommended defaults)
**Areas discussed:** Topbar Structure, Sidebar Architecture, Route Reorganization, Cohort Switcher, Mobile Sidebar

---

## Topbar Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Single TopBar.tsx with section highlighting | usePathname() for active section, avatar dropdown | YES |
| Separate TopBar + NavBar hybrid | Keep existing Navbar, add topbar above | |

**User's choice:** [auto] Single TopBar.tsx (recommended)

---

## Sidebar Architecture

| Option | Description | Selected |
|--------|-------------|----------|
| Per-section config objects | Each section exports sidebarItems array | YES |
| Dynamic sidebar from route metadata | Read route tree for sidebar items | |

**User's choice:** [auto] Per-section config (recommended — explicit, no magic)

---

## Route Reorganization

| Option | Description | Selected |
|--------|-------------|----------|
| Route groups within /trainer/ | (dashboard)/, (settings)/ groups for layout scoping | YES |
| /trainer → /app rename | Full URL restructure | |

**User's choice:** [auto] Route groups, keep /trainer URLs (recommended — SC 3 requires URL preservation)

---

## Cohort Switcher

| Option | Description | Selected |
|--------|-------------|----------|
| URL param + localStorage fallback | ?cohort=<id> primary, localStorage pre-fill | YES |
| localStorage only | No URL param | |

**User's choice:** [auto] URL param + localStorage (recommended — SC 5)

---

## Mobile Sidebar

| Option | Description | Selected |
|--------|-------------|----------|
| Radix Dialog sheet | Off-canvas from left, hamburger trigger | YES |
| Custom CSS drawer | Tailwind-only implementation | |

**User's choice:** [auto] Radix Dialog sheet (recommended — SC 6 specifies Radix)

---

## Claude's Discretion
- Radix Dialog API details, animation, avatar dropdown implementation
- Icon choices, breadcrumbs (not required)
- Topbar mobile breakpoint

## Deferred Ideas
- /trainer → /app route rename
- Admin-promote full UI
- Breadcrumbs
- Command palette
