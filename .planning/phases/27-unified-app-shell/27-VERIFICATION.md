---
phase: 27-unified-app-shell
verified: 2026-04-16T20:02:00Z
status: gaps_found
score: 4/5 must-haves verified
overrides_applied: 0
gaps:
  - truth: "Associate sidebar shows only Dashboard and Interviews nav items"
    status: failed
    reason: "Sidebar has 3 items (Dashboard, Interviews, Curriculum) not 2. Roadmap SC#2 and REQUIREMENTS.md SHELL-01 both say 'restricted nav (Dashboard, Interviews)'. The plan expanded scope by adding Curriculum as a placeholder nav item per UI-SPEC D-04. This exceeds the roadmap contract."
    artifacts:
      - path: "src/components/shell/sidebar-configs.ts"
        issue: "associateSidebarGroups returns 3 items: Dashboard, Interviews, Curriculum. Roadmap SC#2 specifies 'only Dashboard and Interviews'."
    missing:
      - "Either: update ROADMAP.md SC#2 to reflect the 3-item nav decision, or accept this deviation via override"
human_verification:
  - test: "Navigate to /associate/[slug]/dashboard as an authenticated associate"
    expected: "TopBar shows NLM wordmark linking to /associate/[slug]/dashboard, ThemeToggle, AvatarMenu — no center nav links, no CohortSwitcher. Sidebar shows 3 nav items."
    why_human: "Shell rendering and link correctness requires a browser. TopBar role-awareness cannot be verified by static grep alone."
  - test: "Assign associate to a cohort, then navigate to /associate/[slug]/dashboard"
    expected: "Sidebar header shows 'Cohort: {name}' above nav items"
    why_human: "Requires DB state + browser render to confirm conditional cohort header"
  - test: "Navigate to /associate/[slug]/dashboard as an associate with no cohort"
    expected: "Sidebar shows no cohort header — just nav items"
    why_human: "Requires DB state + browser render"
  - test: "Click Interviews in the associate sidebar"
    expected: "Navigates to / (public automated interview flow); user can select tech and run mock without being in a cohort"
    why_human: "Requires navigation and full public mock flow execution"
  - test: "Navigate to /trainer"
    expected: "Trainer shell completely unchanged — TopBar shows center nav + CohortSwitcher; sidebar shows Dashboard, Gap Analysis, Calibration, New Mock, Reports"
    why_human: "Regression check requires browser render"
---

# Phase 27: Unified App Shell Verification Report

**Phase Goal:** Associates access all pages through the same topbar+sidebar shell as trainers, with a role-restricted nav (Dashboard and Interviews only)
**Verified:** 2026-04-16T20:02:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Associate pages render with a topbar and sidebar matching the trainer shell layout | VERIFIED | `AssociateShell.tsx` wires `TopBar` + `SectionSidebar` in the same flex structure as `trainer/layout.tsx`. `associate/[slug]/layout.tsx` server component fetches associate+cohort and passes to `AssociateShell`. |
| 2 | Associate sidebar shows only Dashboard and Interviews nav items | FAILED | `associateSidebarGroups` in `sidebar-configs.ts` returns 3 items: Dashboard (href `/associate/[slug]/dashboard`), Interviews (href `/`), and Curriculum (href `/associate/[slug]/curriculum`). Roadmap SC#2 says "only Dashboard and Interviews". UI-SPEC D-04 explicitly authorized Curriculum as a 3rd item, but this was not reflected as a roadmap SC update. |
| 3 | Associate sidebar header displays the associate's assigned cohort name (blank if unassigned) | VERIFIED | `SectionSidebar` has `sidebarHeader?: string | null` prop. Renders `"Cohort: ${sidebarHeader}"` at 12px DM Sans 500 uppercase when prop is non-empty string and sidebar is expanded. Hidden when collapsed or when prop is null/undefined. `AssociateShell` passes `cohortName` (resolved in server layout) to `SectionSidebar`. |
| 4 | Associate can start an interview from within the shell; if no cohort/curriculum is assigned it behaves as public mock | VERIFIED | Interviews sidebar item href is `/` — the landing page which IS the public automated interview flow (rate-limited, tech-selectable). No cohort assignment required to use `/`. SHELL-03 satisfied. |
| 5 | PublicShell and AssociateNav components are deleted and no routes reference them | VERIFIED | Both files confirmed deleted. `grep` for `import.*PublicShell`, `import.*AssociateNav`, `import.*ConditionalNavbar`, `from '@/components/Navbar'` across all of `src/` returns 0 results. Only comment-block references remain (non-import, inert). `Navbar.tsx` and `ConditionalNavbar.tsx` also deleted. |

**Score:** 4/5 truths verified (1 gap — sidebar item count exceeds roadmap SC)

### Deferred Items

None.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/shell/sidebar-configs.ts` | `associateSidebarGroups` function returning flat nav config | VERIFIED | Exists, exports `associateSidebarGroups(slug: string): SidebarGroup[]`. Returns 1 group with empty label and 3 items. |
| `src/components/shell/TopBar.tsx` | Role-aware topbar (no center nav/CohortSwitcher for associate, slug-aware wordmark) | VERIFIED | `role?: 'trainer' | 'associate'` prop defaults to `'trainer'`. Associate: renders spacer div instead of NAV_ITEMS, hides CohortSwitcher, wordmark href is `/associate/${associateSlug}/dashboard`. |
| `src/components/shell/SectionSidebar.tsx` | Optional `sidebarHeader` prop for cohort label | VERIFIED | `sidebarHeader?: string | null` prop added. Renders "Cohort: {name}" header before groups when non-empty + not collapsed. |
| `src/app/associate/[slug]/layout.tsx` | Associate layout using TopBar + SectionSidebar instead of PublicShell + AssociateNav | VERIFIED | Server component fetches associate + cohort, delegates to `AssociateShell` client component. No PublicShell or AssociateNav imports. |
| `src/components/shell/AssociateShell.tsx` | Client component rendering TopBar + SectionSidebar with associate groups | VERIFIED | Created per plan deviation decision. `'use client'`, receives `slug`, `cohortName`, `children`. Constructs `associateSidebarGroups(slug)` client-side and passes to `TopBar` + `SectionSidebar`. |
| `src/app/associate/[slug]/curriculum/page.tsx` | Curriculum placeholder page | VERIFIED | Exists. Renders "Curriculum" h1 + "Your cohort's curriculum schedule is coming soon." + sub-copy. No PublicShell wrapper — inherits shell from layout. |
| `src/components/ClientLayout.tsx` | Simplified — AuthProvider only, no ConditionalNavbar | VERIFIED | Contains only `AuthProvider` wrapping children. No ConditionalNavbar. |
| `src/app/interview/layout.tsx` | TopBar layout for /interview/* | VERIFIED | Created. Renders `<TopBar />` (default trainer role) + main wrapper. |
| `src/app/review/layout.tsx` | TopBar layout for /review/* | VERIFIED | Created. Same pattern. |
| `src/app/history/layout.tsx` | TopBar layout for /history | VERIFIED | Created. Same pattern. |
| `src/app/question-banks/layout.tsx` | TopBar layout for /question-banks | VERIFIED | Created. Same pattern. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `associate/[slug]/layout.tsx` | `AssociateShell.tsx` | `<AssociateShell slug={slug} cohortName={cohortName}>` | WIRED | Server layout passes plain strings to client shell. |
| `AssociateShell.tsx` | `sidebar-configs.ts` | `associateSidebarGroups(slug)` call | WIRED | Confirmed in AssociateShell.tsx: `const groups = associateSidebarGroups(slug);` |
| `AssociateShell.tsx` | `TopBar.tsx` | `<TopBar role="associate" associateSlug={slug} sidebarGroups={groups} />` | WIRED | Confirmed. Role prop present. |
| `AssociateShell.tsx` | `SectionSidebar.tsx` | `<SectionSidebar groups={groups} sidebarHeader={cohortName} />` | WIRED | Confirmed. cohortName passed as sidebarHeader. |
| `TopBar.tsx` | CohortSwitcher | Conditional render — hidden for associate role | WIRED | `{role === 'trainer' && <Suspense><CohortSwitcher /></Suspense>}` confirmed. |
| `ClientLayout.tsx` | `auth-context.tsx` | `AuthProvider` wrapping children | WIRED | Confirmed — only import is AuthProvider. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `associate/[slug]/layout.tsx` | `cohortName` | `prisma.cohort.findUnique` on associate's `cohortId` | Yes — real DB query | FLOWING |
| `associate/[slug]/layout.tsx` | `associate` | `prisma.associate.findUnique` | Yes — real DB query | FLOWING |
| `SectionSidebar.tsx` | `sidebarHeader` | Prop from AssociateShell ← layout DB query | Real | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript compiles cleanly | `npx tsc --noEmit` | No output (no errors) | PASS |
| All tests pass | `npm run test -- --run` | 51 files passed, 462 tests passed, 1 file skipped | PASS |
| No dangling imports of deleted components | `grep -r "import.*PublicShell\|import.*AssociateNav\|import.*ConditionalNavbar" src/` | 0 results | PASS |
| associateSidebarGroups returns flat group with 3 items | Code inspection of `sidebar-configs.ts` | 1 group, label `''`, 3 items: Dashboard/`/associate/slug/dashboard`, Interviews/`/`, Curriculum/`/associate/slug/curriculum` | PASS |
| TopBar hides center nav and CohortSwitcher for associate role | Code inspection of `TopBar.tsx:99-143` | `role === 'trainer'` gates both NAV_ITEMS render and CohortSwitcher | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SHELL-01 | 27-01, 27-02 | Associate pages use unified topbar+sidebar shell with restricted nav (Dashboard, Interviews) | PARTIAL | Shell wired correctly. Nav has 3 items (Dashboard, Interviews, Curriculum) instead of 2. See gap. |
| SHELL-02 | 27-01 | Associate sidebar displays cohort name label in header | SATISFIED | `sidebarHeader` prop on SectionSidebar renders "Cohort: {name}" conditionally. |
| SHELL-03 | 27-01 | Associate can start an interview from shell; no cohort → public mock | SATISFIED | Interviews href is `/` (public automated flow). No cohort dependency. |
| SHELL-04 | 27-02 | Old PublicShell + AssociateNav removed after migration | SATISFIED | Both files deleted. No imports remain. ConditionalNavbar + Navbar also removed. |

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `associate/[slug]/page.tsx` line 17 | Comment references "Wrapped in PublicShell" — stale doc comment | Info | Non-functional comment only. No code impact. |
| `associate/[slug]/interview/page.tsx` line 10 | Comment references "wrapped in PublicShell" — stale doc comment | Info | Non-functional comment only. No code impact. |
| `associate/[slug]/curriculum/page.tsx` | "Coming soon" placeholder content | Info | Intentional — Phase 30 fills real curriculum data. Not a blocker. |

### Human Verification Required

#### 1. Associate Shell Render

**Test:** Sign in as an associate, navigate to `/associate/[slug]/dashboard`
**Expected:** TopBar shows NLM wordmark (links to dashboard), ThemeToggle, AvatarMenu — no center nav links, no CohortSwitcher. Sidebar shows 3 items (Dashboard, Interviews, Curriculum).
**Why human:** Shell render and link correctness requires browser.

#### 2. Cohort Header (assigned associate)

**Test:** Assign associate to a cohort in DB, navigate to `/associate/[slug]/dashboard`
**Expected:** Sidebar header shows "Cohort: {name}" above nav items
**Why human:** Requires live DB state + browser render.

#### 3. Cohort Header (unassigned associate)

**Test:** Navigate as associate with no cohort assignment
**Expected:** No cohort header visible in sidebar — only nav items
**Why human:** Requires DB state + browser render.

#### 4. Interviews CTA — Public Mock Flow

**Test:** Click "Interviews" in associate sidebar
**Expected:** Navigates to `/`; associate can select technologies and run a public automated mock interview without cohort/curriculum requirement
**Why human:** Requires navigation + interview flow execution.

#### 5. Trainer Shell Regression

**Test:** Sign in as trainer, navigate to `/trainer`
**Expected:** Trainer shell completely unchanged — TopBar shows center nav + CohortSwitcher; sidebar shows Dashboard/Gap Analysis/Calibration/New Mock/Reports
**Why human:** Regression check requires browser render of trainer-specific chrome.

### Gaps Summary

**1 gap** found against the roadmap success criteria:

The roadmap SC#2 states the associate sidebar should show "only Dashboard and Interviews nav items." The implementation adds a 3rd item: Curriculum (linking to `/associate/[slug]/curriculum`). This was an authorized decision in UI-SPEC D-04, which explicitly lists Curriculum as a 3rd nav item targeting a placeholder page built in Plan 02. The deviation **exceeds** rather than falls short of the goal — the shell is more capable than specified.

**Resolution options:**
1. Accept via override (deviation is intentional and aligned with Phase 30 work)
2. Update ROADMAP.md SC#2 to say "Dashboard, Interviews, and Curriculum" to match the UI spec

To accept, add to VERIFICATION.md frontmatter:

```yaml
overrides:
  - must_have: "Associate sidebar shows only Dashboard and Interviews nav items"
    reason: "UI-SPEC D-04 explicitly authorized a 3rd Curriculum nav item as a placeholder for Phase 30. The deviation adds capability rather than reducing it."
    accepted_by: "jestercharles"
    accepted_at: "2026-04-16T00:00:00Z"
```

---

_Verified: 2026-04-16T20:02:00Z_
_Verifier: Claude (gsd-verifier)_
