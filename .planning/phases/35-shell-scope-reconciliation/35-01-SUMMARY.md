# Phase 35 — Plan 01 Summary

**Status:** Complete
**Completed:** 2026-04-17
**Branch:** `v1.3-gap-closure`
**Wave:** 1
**Requirements closed:** SHELL-01, SHELL-32-01

## Outcome

Wired the already-authored `associateSettingsAccordion` factory into `AssociateShell` so associate users now see a bottom Settings accordion (Profile + Security sub-items) that opens `ProfileModal` on the correct tab. Simultaneously removed the `@deprecated settingsSidebarGroups` export from Phase 32 and cleaned up its two orphaned test importers. No new features, no layout restructuring.

## Tasks

| # | Task | Commit | Files Touched |
|---|------|--------|---------------|
| 1 | Wire `associateSettingsAccordion` + `ProfileModal` into `AssociateShell` | `36c8e71` | `src/components/shell/AssociateShell.tsx` |
| 2 | Delete `settingsSidebarGroups` export + clean up importers | `f3796aa` | `src/components/shell/sidebar-configs.ts`, `src/components/shell/sidebar-configs.test.ts`, `src/app/trainer/nav-link.test.ts` (deleted) |
| 3 | Add `AssociateShell` accordion-wiring test | `42eb9c2` | `src/components/shell/AssociateShell.test.ts` (new) |

## Diff Shape

**`src/components/shell/AssociateShell.tsx`**: +42 / -19 lines
- Added `ProfileModal` import, combined with existing `sidebar-configs` import to pull in `associateSettingsAccordion`.
- Added local `type ProfileTab = 'profile' | 'security' | 'learning'`.
- Added two `useState` hooks (`profileOpen`, `profileInitialTab`).
- Added `openProfileTab` helper.
- Built `settingsGroup = associateSettingsAccordion(...)` right before `return`.
- Passed `settingsGroup` into `SectionSidebar` only (not `TopBar`, per D-03).
- Wrapped return in Fragment with sibling `<ProfileModal>` at shell root.

**`src/components/shell/sidebar-configs.ts`**: -14 lines
- Deleted `@deprecated` comment + `settingsSidebarGroups` export (lines 51-63).
- All 15 lucide-react imports retained — still used by `trainerSettingsAccordion` and `associateSettingsAccordion`.

**`src/components/shell/sidebar-configs.test.ts`**: +20 / -26 lines
- Import switched from `settingsSidebarGroups` to `trainerSettingsAccordion`.
- Replaced `describe('settingsSidebarGroups', …)` with parallel `describe('trainerSettingsAccordion', …)` — 5 its preserving regression coverage (label, 5 items, 5 hrefs, group icon, item icons).

**`src/app/trainer/nav-link.test.ts`**: deleted (11 lines gone)
- Orphan coverage of dying export. The cohorts-href assertion is now covered by `trainerSettingsAccordion.items[1].href` in the replacement test block.

**`src/components/shell/AssociateShell.test.ts`**: +70 lines (new)
- 3 factory tests (label + length, Profile wiring, Security wiring).
- 4 source-text tests (factory import, ProfileModal import, `<ProfileModal` rendered, single `settingsGroup=` prop).
- Node-env compatible — no RTL / jsdom dependency (per D-09 discretion paragraph).

## Grep Verification

```
$ grep -rn "settingsSidebarGroups" src/
# Zero matches (deprecated export fully removed)

$ grep -n "@deprecated" src/components/shell/sidebar-configs.ts
# Zero matches

$ grep -n "<ProfileModal" src/components/shell/AssociateShell.tsx
# Line 81 — exactly 1 match

$ grep -n "settingsGroup=\\{" src/components/shell/AssociateShell.tsx
# Line 63 — exactly 1 match (SectionSidebar only, not TopBar)

$ test ! -f src/app/trainer/nav-link.test.ts
# File deleted
```

## Tests

| File | Count | Status |
|------|-------|--------|
| `src/components/shell/sidebar-configs.test.ts` | 11 | All pass |
| `src/components/shell/AssociateShell.test.ts` (new) | 7 | All pass |
| Full suite | 505 passed / 4 skipped | All pass |

## Scope Guards Held

- No changes to `AppShell.tsx`, `AvatarMenu.tsx`, `SectionSidebar.tsx`, `ProfileModal.tsx`, `TopBar.tsx`, or `types.ts`.
- `associateSidebarGroups` (3 items) unchanged.
- `trainerSettingsAccordion` (5 items) unchanged.
- `TopBar` receives no `settingsGroup` prop (per D-03 — avoids duplicate mobile entry point vs AvatarMenu).
