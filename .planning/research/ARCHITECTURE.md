# Architecture — v1.3 UX Unification & Polish

**Milestone:** v1.3
**Researched:** 2026-04-16
**Confidence:** HIGH (direct codebase knowledge from v1.2 execution)

---

## Integration Map

### A. Unified App Shell — Extending TrainerShell

**Current state:**
- `TrainerShell` wraps trainer pages (topbar + sidebar + cohort switcher)
- Associate pages use `PublicShell` + `AssociateNav` (single old-style navbar)
- Shell selection happens at layout level (`/trainer/layout.tsx` vs `/associate/layout.tsx`)

**Integration approach:**
1. Refactor `TrainerShell` → `AppShell` with a `role` prop (`trainer` | `associate`)
2. Sidebar config driven by role: trainer gets full nav (Overview, Actions, Settings), associate gets restricted nav (Dashboard, Interviews)
3. Associate layout switches from `PublicShell` → `AppShell role="associate"`
4. `PublicShell` + `AssociateNav` deprecated, then removed
5. Cohort switcher hidden for associates (single cohort shown as label)

**Files modified:**
- `src/components/TrainerShell.tsx` → rename to `AppShell.tsx`, add role prop
- `src/app/associate/layout.tsx` → swap shell
- `src/components/AssociateNav.tsx` → delete after migration
- `src/components/PublicShell.tsx` → delete after migration

**Data flow:** `getCallerIdentity()` already resolves role in server components. Pass role to `AppShell` at layout level.

### B. Sign-in Redesign

**Current state:**
- `/signin` renders `SignInTabs.tsx` — two tabs (Trainer / Associate)
- Each tab has its own form (email+password vs magic link)
- Auth callback at `/auth/callback/route.ts` handles redirects

**Integration approach:**
1. Replace `SignInTabs.tsx` with `SignInPage.tsx` — two stacked buttons, no tabs
2. Button 1: "Continue with email link" → expands inline email input + send
3. Button 2: "Sign in with password" → expands inline email + password fields
4. Password upgrade: detect `!user_metadata.has_set_password` after magic-link callback → redirect to password setup page
5. Reuse existing `/auth/update-password/page.tsx` with adjusted copy for first-login context

**Files modified:**
- `src/components/SignInTabs.tsx` → rewrite as `SignInPage.tsx`
- `src/app/auth/callback/route.ts` → add first-login detection + redirect
- `src/app/auth/update-password/page.tsx` → handle first-login context (different heading/copy)

### C. Associate Data Visualization

**Current state:**
- `/associate/[slug]` has basic profile with session list + readiness status
- Gap data fetched via `/api/associates/[slug]/gap-scores`
- Trainer dashboard has `GapTrendChart.tsx` (recharts LineChart)

**Integration approach:**
1. New component: `StrengthWeaknessList.tsx` — ranked skills from GapScore, with score bars + trend arrows
2. New component: `FocusAreaHero.tsx` — promotes `Associate.recommendedArea` to hero card
3. New component: `SkillTrendChart.tsx` — recharts LineChart/AreaChart with skill filter dropdown
4. Extend `/api/associates/[slug]/gap-scores` to return per-session history (for trend charting), not just current scores
5. All chart colors use CSS var tokens per DESIGN.md data-viz section

**New API data needed:**
- Gap score history over time (session-indexed) — currently only latest weighted score stored
- Option A: Derive from `Session` records at query time (compute gap per session)
- Option B: Add `GapScoreHistory` table for pre-computed snapshots
- Recommend Option A for v1.3 (simpler, session count is low per associate)

**Files new:**
- `src/components/associate/StrengthWeaknessList.tsx`
- `src/components/associate/FocusAreaHero.tsx`
- `src/components/associate/SkillTrendChart.tsx`

**Files modified:**
- `src/app/api/associates/[slug]/gap-scores/route.ts` — add session history
- `src/app/associate/[slug]/page.tsx` — compose new components

### D. Associate Curriculum View

**Current state:**
- `CurriculumWeek` model exists with `cohortId`, `weekNumber`, `skillName`, `skillSlug`, `startDate`
- CRUD at `/api/cohorts/[id]/curriculum` — trainer-only
- Associates have `cohortId` on their record

**Integration approach:**
1. New API route: `/api/associate/curriculum` — returns curriculum weeks for the authenticated associate's cohort
2. Auth guard: `getCallerIdentity()` must be associate, fetch `Associate.cohortId`, query `CurriculumWeek` records
3. New component: `CurriculumTimeline.tsx` — list view with current week highlighted
4. Place within associate dashboard (sidebar nav item or dashboard sub-section)

**Files new:**
- `src/app/api/associate/curriculum/route.ts`
- `src/components/associate/CurriculumTimeline.tsx`

### E. DESIGN.md Data-Viz Section

**Current state:**
- `DESIGN.md` covers typography, color, spacing, motion
- No data visualization conventions documented
- Chart components use inconsistent color approaches (some hex, some CSS vars)

**Integration approach:**
1. Add `## Data Visualization` section to `DESIGN.md`
2. Define chart color tokens in `globals.css` (both light + dark)
3. Document: chart typography, axis conventions, tooltip patterns, trajectory language, threshold markers
4. All subsequent chart work references this section

**Files modified:**
- `DESIGN.md` — new section
- `src/app/globals.css` — chart-specific token pairs if not already covered by existing tokens

### F. Dark Mode QA

**Current state:**
- Token system complete in `globals.css`
- Some components use hardcoded hex (confirmed: `GapTrendChart.tsx`)
- Some Tailwind utilities may be light-only (`bg-white`, `text-black`)

**Integration approach:**
1. Grep audit: find all hardcoded hex in `style={{}}` props and light-only Tailwind classes
2. Systematic replacement with CSS var tokens
3. Visual sweep of every route in dark mode
4. Must be last phase — sweep after all new surfaces built

---

## Suggested Build Order

```
Phase 26: DESIGN.md Data-Viz Section (E)
    | unblocks chart work
Phase 27: Unified App Shell (A) — refactor TrainerShell -> AppShell
    | unblocks associate layout
Phase 28: Sign-in Redesign (B) + Password Upgrade
    | independent of shell, can parallel
Phase 29: Associate Data Viz (C) — charts, skill list, focus hero
    | requires shell + design tokens
Phase 30: Associate Curriculum View (D)
    | requires shell
Phase 31: Dark Mode QA (F) — sweep all surfaces last
```

**Parallelization:** Phases 28 (sign-in) and 27 (shell) can overlap. Phase 29 and 30 can overlap if shell is done.

---

## Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| Rename TrainerShell -> AppShell with role prop | Single shell component, role-driven config. Avoids maintaining two shell components. |
| Compute gap history from Sessions at query time | No new table needed. Session count per associate is small (<50). Pre-compute later if perf requires. |
| New `/api/associate/curriculum` route | Separate from trainer CRUD routes. Cleaner auth guard. Associates get read-only access to their own cohort's curriculum. |
| Dark mode as final phase | All surfaces must exist before sweeping. Building dark-mode-correct from start reduces but doesn't eliminate need for final pass. |

---
*Architecture research for: v1.3 UX Unification & Polish*
*Researched: 2026-04-16*
