---
phase: 32-shell-overhaul
plan: 02
subsystem: shell
tags: [profile-modal, avatar-menu, landing-page, redirect]
dependency_graph:
  requires: [32-01]
  provides: [ProfileModal, LandingHeader, avatar-profile-trigger, profile-redirect]
  affects: [shell-layout, landing-page, profile-page]
tech_stack:
  added: []
  patterns: [Radix-Dialog-modal, fetch-on-open, role-based-redirect]
key_files:
  created:
    - src/components/shell/ProfileModal.tsx
    - src/components/shell/LandingHeader.tsx
  modified:
    - src/components/shell/AvatarMenu.tsx
    - src/app/profile/ProfileTabs.tsx
    - src/app/profile/page.tsx
    - src/app/page.tsx
decisions:
  - "ProfileModal uses Radix Dialog with fetch-on-open pattern — fresh data every time modal opens"
  - "ProfileTabs outer page wrapper removed — component is now modal-safe (no min-h-screen, no full-page background)"
  - "LandingHeader inserted into all step returns in page.tsx to cover loading/limit/topics/interview/done states"
  - "/profile redirects based on role: anonymous->signin, trainer/admin->trainer, associate->associate dashboard"
metrics:
  duration: ~3min
  completed: 2026-04-17
  tasks_completed: 2
  files_modified: 6
---

# Phase 32 Plan 02: Profile Modal + Landing Header Summary

**One-liner:** Profile converted to Radix Dialog modal triggered from avatar menu; landing page gets sticky minimal header with NLM wordmark and Sign In link.

## What Was Built

Per D-08, D-09, D-12, D-13:

1. **ProfileModal** — `'use client'` Radix Dialog wrapper at `src/components/shell/ProfileModal.tsx`. Fetches `GET /api/profile` on each open (re-fetches on every open for fresh data). Shows loading/error states. Renders `ProfileTabs` directly. Close button (X) top-right. `initialTab` prop controls which tab opens first.

2. **ProfileTabs update** — Removed the full-page wrapper div (`min-h-screen`, flex centering, full-page background). Inner card div is now the root element. Added optional `initialTab` prop — uses `useState<Tab>(initialTab ?? 'profile')`.

3. **AvatarMenu update** — Profile item now uses `onSelect` to open ProfileModal (avoids z-index conflict vs onClick). Settings item routes trainer/admin to `/trainer/settings`, associates to security tab of modal. Avatar menu order: email/role, separator, Profile, Settings, separator, Sign Out. ProfileModal rendered after DropdownMenu.Root.

4. **/profile page** — Stripped to ~15 lines. Pure role-based redirects: anonymous → `/signin`, trainer/admin → `/trainer`, associate → `/associate/[slug]/dashboard` (falls back to `/` if no slug).

5. **LandingHeader** — Sticky 56px header at `src/components/shell/LandingHeader.tsx`. NLM wordmark left (Clash Display, `var(--ink)`), Sign In button right (`btn-accent-flat`). No shell, no sidebar. Inserted into all 5 step returns of `src/app/page.tsx`.

## Commits

| Task | Commit | Files |
|------|--------|-------|
| Task 1: Profile modal + AvatarMenu + /profile redirect | fb5758e | ProfileModal.tsx, AvatarMenu.tsx, ProfileTabs.tsx, profile/page.tsx |
| Task 2: Landing page minimal header | 4b7aa4c | LandingHeader.tsx, page.tsx |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — ProfileModal fetches `/api/profile` which already auth-guards via `getCallerIdentity()`. No new API surface introduced.

## Self-Check

### Files Exist
- `src/components/shell/ProfileModal.tsx` — Dialog.Root present, fetches /api/profile
- `src/components/shell/LandingHeader.tsx` — LandingHeader exported
- `src/components/shell/AvatarMenu.tsx` — ProfileModal rendered, onSelect for Profile/Settings
- `src/app/profile/ProfileTabs.tsx` — initialTab prop, no full-page wrapper
- `src/app/profile/page.tsx` — redirect-only, no DB queries
- `src/app/page.tsx` — LandingHeader imported and rendered in all steps

### Commits Exist
- fb5758e, 4b7aa4c — verified via git log

## Self-Check: PASSED
