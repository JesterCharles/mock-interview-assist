# Phase 32: Shell Architecture Overhaul - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-17
**Phase:** 32-shell-overhaul
**Areas discussed:** Sidebar scope, TopBar reduction, Landing page nav, Roster detail, Profile integration, Settings placement

---

## Sidebar Scope

| Option | Description | Selected |
|--------|-------------|----------|
| All section nav in sidebar | Move all TopBar center nav links to sidebar | ✓ |
| Keep top-level in TopBar | Only sub-sections in sidebar | |

**User's choice:** All section nav moves to sidebar. Sidebar is primary navigation surface.
**Notes:** Batch Upload added under Actions group. Settings as collapsible bottom section.

## TopBar Reduction

| Option | Description | Selected |
|--------|-------------|----------|
| Utility only | Home, cohort, user icon, dark mode | ✓ |
| Keep some nav | Reduce but keep top-level sections | |

**User's choice:** Utility only. No center nav links at all.

## Landing Page Nav

| Option | Description | Selected |
|--------|-------------|----------|
| Full shell | Complete TopBar + empty sidebar | |
| Minimal header | Logo + sign in button only | ✓ |
| No nav | Current state (no navigation) | |

**User's choice:** Minimal header.

## Roster Detail

| Option | Description | Selected |
|--------|-------------|----------|
| Same component | Reuse AssociateDashboardClient at /trainer/[slug] | ✓ |
| Similar but separate | Trainer-specific view that looks similar | |

**User's choice:** Same component. Remove slug from roster table.

## Profile Integration

| Option | Description | Selected |
|--------|-------------|----------|
| Sidebar item + page | Profile as route inside shell | |
| Modal from avatar | Full ProfileTabs as overlay | ✓ |
| Separate page | Current standalone /profile | |

**User's choice:** Modal overlay from avatar menu. Full ProfileTabs (all 3 tabs).

## Settings Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Avatar menu only | Settings link in dropdown | |
| Sidebar bottom collapsible | Always last, expands inline | ✓ |
| Both | Avatar menu + sidebar | |

**User's choice:** Sidebar bottom, collapsible accordion. Settings sub-items expand inline. Both roles get Settings section.
**Follow-up:** Associate Settings shows Profile + Security. Trainer Settings shows Threshold, Cohorts, Curriculum, Users, Associates.

## Claude's Discretion

- Modal implementation approach
- Settings accordion animation
- Mobile responsive behavior
- Minimal header component structure

## Deferred Ideas

- Notifications icon (user said "eventual")
- Associate Settings beyond Profile/Security
