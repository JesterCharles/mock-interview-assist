---
phase: 32-shell-overhaul
verified: 2026-04-16T18:30:00Z
status: gaps_found
score: 6/9 must-haves verified
overrides_applied: 0
gaps:
  - truth: "Sidebar is the primary navigation surface for both trainer and associate roles"
    status: failed
    reason: "Plan 01 commits (962f868, 5cc32b2, 08efb85) were executed on worktree branch worktree-agent-a1486649 but never merged into main. SectionSidebar.tsx in main has no settingsGroup prop, no accordion, and no marginTop:auto layout."
    artifacts:
      - path: "src/components/shell/types.ts"
        issue: "Missing SettingsSubItem and SettingsAccordionGroup types — file in main is the pre-Plan-01 version (16 lines, no new types)"
      - path: "src/components/shell/SectionSidebar.tsx"
        issue: "No settingsGroup prop, no accordion rendering, no localStorage persistence for settings state"
    missing:
      - "Merge worktree-agent-a1486649 commits 962f868 + 5cc32b2 + 08efb85 into main, OR re-execute Plan 01 tasks on main"

  - truth: "Settings appears as the last item in the sidebar and expands/collapses sub-items inline without navigation"
    status: failed
    reason: "Same root cause as above — Plan 01 not merged. SectionSidebar has no accordion. SettingsAccordionGroup type doesn't exist in main types.ts."
    artifacts:
      - path: "src/components/shell/SectionSidebar.tsx"
        issue: "No settingsOpen state, no toggleSettings function, no ChevronDown, no max-height transition, no Settings accordion"
    missing:
      - "Same fix: merge Plan 01 branch into main"

  - truth: "TopBar has no center nav links — only wordmark, CohortSwitcher, ThemeToggle, AvatarMenu"
    status: failed
    reason: "TopBar.tsx in main still contains NAV_ITEMS array (Dashboard, Interviews, Question Banks, Settings), resolveGroups function, isNavItemActive function, and the center <nav> block that renders them for trainer role."
    artifacts:
      - path: "src/components/shell/TopBar.tsx"
        issue: "Lines 26-44 define NAV_ITEMS; lines 98-129 render a center <nav> with role==='trainer' guard; resolveGroups (lines 13-18) still exists"
    missing:
      - "Same fix: merge Plan 01 branch into main (commit 08efb85)"

  - truth: "Batch Upload appears in the trainer sidebar under Actions group"
    status: failed
    reason: "sidebar-configs.ts in main has no Batch Upload item in dashboardSidebarGroups Actions array. trainerSettingsAccordion and associateSettingsAccordion are also absent."
    artifacts:
      - path: "src/components/shell/sidebar-configs.ts"
        issue: "Actions group has only New Mock and Reports items; no Upload item; no trainerSettingsAccordion export; no associateSettingsAccordion export"
    missing:
      - "Same fix: merge Plan 01 branch into main (commit 5cc32b2)"
---

# Phase 32: Shell Architecture Overhaul — Verification Report

**Phase Goal:** Restructure AppShell with sidebar-primary navigation for all roles, strip TopBar to utility items only. Fix profile outside shell, landing page missing signin nav, roster slug column, batch upload missing from settings, update-password security. Trainer associate detail matches associate dashboard view.
**Verified:** 2026-04-16T18:30:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Root Cause Summary

Plan 01 (wave 1) was executed in a git worktree (`worktree-agent-a1486649`) and its commits were **never merged back to main**. Plans 02, 03, and 04 (waves 2 and 3) were executed directly on main. The result is that the foundational shell restructure (sidebar accordion, TopBar strip, sidebar-configs exports) is absent from the deployed codebase, while higher-level features built on top of it (ProfileModal, LandingHeader, unified trainer detail) are fully present and wired.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Sidebar is primary navigation surface for both roles | FAILED | SectionSidebar.tsx in main has no settingsGroup prop, no accordion — pre-Plan-01 version |
| 2 | Settings expands/collapses sub-items inline at sidebar bottom | FAILED | No accordion state, no ChevronDown, no max-height transition in SectionSidebar.tsx |
| 3 | TopBar has no center nav links | FAILED | NAV_ITEMS array, resolveGroups, and center `<nav>` block still present in TopBar.tsx |
| 4 | Batch Upload in trainer sidebar Actions group | FAILED | dashboardSidebarGroups.Actions has only New Mock + Reports; no Upload item |
| 5 | Profile click in avatar menu opens modal overlay | VERIFIED | AvatarMenu.tsx uses onSelect to trigger ProfileModal; ProfileModal renders Dialog.Root |
| 6 | Profile modal renders tabs with fetched data | VERIFIED | ProfileModal fetches /api/profile on open; renders ProfileTabs with all 3 tabs |
| 7 | Landing page shows minimal header with NLM logo + Sign In | VERIFIED | LandingHeader.tsx exists; imported and rendered in all 5 step returns of page.tsx |
| 8 | /profile route redirects to home — modal-only | VERIFIED | profile/page.tsx redirects: anonymous→/signin, trainer→/trainer, associate→dashboard |
| 9 | Roster table has no slug column | VERIFIED | RosterTable.tsx has 8 columns (no Slug th); colSpan=8 confirmed |
| 10 | Trainer clicking roster row sees same dashboard as associates | VERIFIED | trainer/[slug]/page.tsx imports and renders AssociateDashboardClient with mapped props |
| 11 | User cannot change password without identity verification | VERIFIED | ProfileTabs.tsx has signInWithPassword (Path A) and reauthenticate+verifyOtp (Path B); verificationStep gates updateUser |

**Score:** 6/9 requirements verified (SHELL-32-01, 02, 03 failed; 04–09 verified)

### Deferred Items

None.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/shell/types.ts` | SettingsSubItem + SettingsAccordionGroup types | STUB | File is pre-Plan-01 (16 lines); missing both new types |
| `src/components/shell/sidebar-configs.ts` | trainerSettingsAccordion, associateSettingsAccordion, Batch Upload | STUB | No new exports; Actions group missing Upload item |
| `src/components/shell/SectionSidebar.tsx` | Settings accordion with expand/collapse | STUB | No settingsGroup prop, no accordion logic |
| `src/components/shell/TopBar.tsx` | Utility-only (no center nav) | STUB | NAV_ITEMS, resolveGroups, center nav block all present |
| `src/components/shell/MobileSidebar.tsx` | settingsGroup prop for settings items | STUB | No settingsGroup prop |
| `src/components/shell/ProfileModal.tsx` | Radix Dialog wrapper fetching /api/profile | VERIFIED | Dialog.Root present, fetch on open, renders ProfileTabs |
| `src/components/shell/LandingHeader.tsx` | Minimal landing header with logo + Sign In | VERIFIED | Exists and rendered in page.tsx all 5 steps |
| `src/components/shell/AvatarMenu.tsx` | Profile modal trigger + Settings routing | VERIFIED | onSelect opens ProfileModal; Settings routes by role |
| `src/app/profile/page.tsx` | Redirect-only (no DB queries) | VERIFIED | ~23 lines; pure redirects by identity kind |
| `src/app/profile/ProfileTabs.tsx` | initialTab prop + security re-verification | VERIFIED | initialTab prop exists; signInWithPassword + reauthenticate + verifyOtp present |
| `src/components/trainer/RosterTable.tsx` | No slug column (8 columns) | VERIFIED | Header has no Slug th; colSpan=8 |
| `src/app/trainer/(dashboard)/[slug]/page.tsx` | Renders AssociateDashboardClient | VERIFIED | Imported and rendered with parallel fetch from /api/trainer/[slug] + /api/settings |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| sidebar-configs.ts | SectionSidebar.tsx | settingsGroup prop | NOT_WIRED | settingsGroup not exported from sidebar-configs; SectionSidebar doesn't accept it |
| TopBar.tsx | MobileSidebar.tsx | settingsGroup forwarded | NOT_WIRED | TopBar has no settingsGroup prop; MobileSidebar has no settingsGroup prop |
| AvatarMenu.tsx | ProfileModal.tsx | setProfileOpen callback | WIRED | AvatarMenu renders ProfileModal; onSelect handlers call setProfileInitialTab + setProfileOpen |
| ProfileModal.tsx | /api/profile | fetch on modal open | WIRED | fetch('/api/profile') inside useEffect with open as dep |
| page.tsx (landing) | LandingHeader.tsx | import + render | WIRED | Imported and rendered in all 5 step returns |
| trainer/[slug]/page.tsx | AssociateDashboardClient | import + render with props | WIRED | Import confirmed; rendered at line 245 with full prop mapping |
| trainer/[slug]/page.tsx | /api/trainer/[slug] | parallel fetch | WIRED | Promise.all([fetch(/api/trainer/${slug}), fetch(/api/settings)]) |
| ProfileTabs.tsx | supabase.auth.signInWithPassword | old-password re-verification | WIRED | signInWithPassword called at line 173 before updateUser |
| ProfileTabs.tsx | supabase.auth.reauthenticate | OTP for magic-link users | WIRED | reauthenticate() called at line 190; verifyOtp at line 205 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| ProfileModal.tsx | data (ProfileApiResponse) | fetch /api/profile | Yes — API queries DB via getCallerIdentity | FLOWING |
| trainer/[slug]/page.tsx | detail (AssociateDetail) | fetch /api/trainer/${slug} | Yes — existing auth-guarded trainer API | FLOWING |
| AssociateDashboardClient | gapScores, sessions, readinessPercent | mapped from AssociateDetail | Yes — derived from real DB data | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript compiles cleanly | npx tsc --noEmit | No errors | PASS |
| /profile page is redirect-only | Read file + inspect | 23 lines, pure redirects | PASS |
| Roster table has 8 columns | Inspect headers + colSpan | 8 th elements, colSpan=8 | PASS |
| TopBar still has center nav | grep NAV_ITEMS TopBar.tsx | Found NAV_ITEMS array + center nav block | FAIL |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SHELL-32-01 | 32-01 | Sidebar primary nav with Settings accordion | BLOCKED | Plan 01 not in main; SectionSidebar unchanged |
| SHELL-32-02 | 32-01 | TopBar utility-only, no center nav | BLOCKED | TopBar.tsx still has NAV_ITEMS and center nav |
| SHELL-32-03 | 32-01 | Batch Upload in trainer sidebar | BLOCKED | sidebar-configs.ts Actions group lacks Upload |
| SHELL-32-04 | 32-02 | Profile is modal overlay from avatar menu | SATISFIED | ProfileModal + AvatarMenu wiring verified |
| SHELL-32-05 | 32-02 | Landing page minimal header | SATISFIED | LandingHeader in all 5 page.tsx returns |
| SHELL-32-06 | 32-02 | /profile redirects to dashboard | SATISFIED | profile/page.tsx is redirect-only |
| SHELL-32-07 | 32-03 | Roster table no slug column | SATISFIED | 8 columns, no Slug th confirmed |
| SHELL-32-08 | 32-03 | Trainer detail = AssociateDashboardClient | SATISFIED | Imported and rendered with full prop mapping |
| SHELL-32-09 | 32-04 | Password change requires identity verification | SATISFIED | signInWithPassword + reauthenticate/verifyOtp gate updateUser |

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `src/components/shell/TopBar.tsx` | NAV_ITEMS array still present (Dashboard, Interviews, Question Banks, Settings) | Blocker | Renders center nav links for trainers; contradicts D-06/D-07 |
| `src/components/shell/TopBar.tsx` | resolveGroups function still present | Blocker | Fallback resolves sidebar groups from pathname — was meant to be deleted |
| `src/components/shell/sidebar-configs.ts` | settingsSidebarGroups still active (no @deprecated marker) | Warning | Was supposed to be deprecated in Plan 01; still referenced by TopBar resolveGroups |

### Gaps Summary

Three requirements (SHELL-32-01, 02, 03) all share the same root cause: **Plan 01 was executed in a git worktree and the commits were never merged to main**. The commits exist at:
- `962f868` — types.ts + SectionSidebar accordion
- `5cc32b2` — sidebar-configs Batch Upload + Settings accordion exports
- `08efb85` — TopBar strip + MobileSidebar settingsGroup

Branch: `worktree-agent-a1486649`

The fix is a single merge (or cherry-pick of 3 commits) rather than re-implementation. Plans 02, 03, and 04 built on top of Plan 01's intended state — they don't depend on the missing types at runtime (TypeScript compiles cleanly), but the UX is broken for trainers who still see center nav links and no sidebar Settings accordion.

---

_Verified: 2026-04-16T18:30:00Z_
_Verifier: Claude (gsd-verifier)_
