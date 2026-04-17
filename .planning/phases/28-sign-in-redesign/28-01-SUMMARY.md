---
phase: 28-sign-in-redesign
plan: "01"
subsystem: auth-ui
tags: [signin, accordion, first-login, password-setup, ux]
dependency_graph:
  requires: []
  provides: [accordion-signin, first-login-password-gate]
  affects: [src/app/signin/SignInTabs.tsx, src/app/signin/page.tsx, src/app/api/auth/exchange/route.ts, src/app/auth/set-password/page.tsx]
tech_stack:
  added: [lucide-react/Mail, lucide-react/KeyRound]
  patterns: [css-grid-accordion, supabase-updateUser-metadata]
key_files:
  created:
    - src/app/auth/set-password/page.tsx
  modified:
    - src/app/signin/SignInTabs.tsx
    - src/app/signin/page.tsx
    - src/app/api/auth/exchange/route.ts
decisions:
  - "Grid-template-rows 0fr/1fr trick used for accordion animation — avoids max-height guessing"
  - "password_set flag written via updateUser data field — no Prisma migration needed (deferred to Phase 28.1)"
  - "First-login gate applies to all magic-link flows (trainers and associates); password sign-in bypasses exchange route"
metrics:
  duration: "~10 minutes"
  completed: "2026-04-17T01:07:00Z"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 4
---

# Phase 28 Plan 01: Sign-In Redesign Summary

**One-liner:** Accordion sign-in replacing tab UI (Mail + KeyRound icons, grid-row animation) with mandatory first-login password gate via user_metadata.password_set flag.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Replace SignInTabs with accordion buttons (SIGNIN-01) | e0aabf1 | SignInTabs.tsx, page.tsx |
| 2 | First-login password setup flow (SIGNIN-02) | 9ca053f | set-password/page.tsx, exchange/route.ts |
| 3 | Verify sign-in redesign (checkpoint) | auto-approved | — |

## What Was Built

**Task 1 — Accordion sign-in (SIGNIN-01):**
- Rewrote `SignInTabs.tsx` as `SignInAccordion` (export name kept as `SignInTabs` to minimize diff)
- Two stacked buttons: `Mail` icon "Continue with email link" and `KeyRound` icon "Sign in with password"
- CSS `grid-template-rows: 0fr → 1fr` transition (200ms) for smooth height animation without max-height hacks
- Opacity fade (150ms) on form content for polish
- Active button: `border-color: var(--accent)`. Dimmed button: `surface-muted` bg, `muted` text, 0.7 opacity
- Clicking same button collapses; clicking other button swaps expansion
- All existing form handlers preserved (trainer login, magic-link, forgot-password reset)
- `page.tsx` simplified: removed `as` search param, removed `initialTab` and `showAssociateTab` props

**Task 2 — First-login password gate (SIGNIN-02):**
- New `src/app/auth/set-password/page.tsx`: password + confirm form, 8 char min, no skip/cancel
- Single `updateUser({ password, data: { password_set: true } })` call sets both password and metadata flag
- After success: reads role from user_metadata, redirects trainer → `/trainer`, associate → `/associate/[slug]/dashboard` (via `/api/associate/me`), fallback → `/`
- Unauthenticated access: `getUser()` check in useEffect redirects to `/signin`
- `/api/auth/exchange/route.ts`: checks `user_metadata.password_set === true` after session exchange and before role-based redirect; falsy → redirect to `/auth/set-password`
- Recovery flows (`type=recovery`) still redirect to `/auth/update-password` (unchanged)
- Middleware unchanged: `/auth/set-password` not in matcher, passes through automatically

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data paths are wired. The `password_set` metadata flag is intentionally stored in `user_metadata` (not Prisma) at this phase; Phase 28.1 will migrate to a Profile table.

## Threat Flags

No new trust boundaries beyond what the threat model documented. `/auth/set-password` requires active Supabase session (T-28-01 mitigated via `getUser()` check in useEffect).

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| src/app/signin/SignInTabs.tsx | FOUND |
| src/app/auth/set-password/page.tsx | FOUND |
| src/app/api/auth/exchange/route.ts | FOUND |
| commit e0aabf1 (accordion buttons) | FOUND |
| commit 9ca053f (first-login gate) | FOUND |
