# Project Research Summary

**Project:** Next Level Mock — v1.3 UX Unification & Polish
**Domain:** Education/training SaaS — shell unification, auth polish, associate-facing data viz
**Researched:** 2026-04-16
**Confidence:** HIGH

## Executive Summary

v1.3 is a focused UX/polish milestone with zero new dependencies. All required capabilities (recharts components, Supabase auth APIs, Tailwind token system) are already installed and functional. The work is component-level refactoring and new composition, not infrastructure additions. The highest-complexity item is the `TrainerShell → AppShell` refactor — it must be done first and done carefully, as it gates all associate-shell work and risks breaking the trainer layout if role-default behavior isn't guarded.

The recommended approach is to sequence work by dependency chain: DESIGN.md tokens first (unblocks chart work), shell refactor second (unblocks associate layout), then build associate surfaces (data viz + curriculum) in parallel, and run dark mode QA last as a sweep pass. Sign-in redesign is independent and can run parallel to shell work.

The primary risk is the shell refactor introducing trainer regressions. Prevention is low-effort: default the `role` prop to `'trainer'` so existing layouts require no changes, and test trainer routes after each incremental shell change. The dark mode pitfall (recharts tooltip white box, hardcoded hex) is fully understood and mechanical to fix — build all new components with CSS vars from day one rather than relying on the final sweep to catch violations.

---

## Key Findings

### Recommended Stack

No new packages required. recharts 3.8.1 already ships `AreaChart`, `Area`, and `ReferenceLine` — all needed for associate trend charts. `supabase.auth.updateUser({ password })` handles the password upgrade flow for magic-link associates. The CSS custom property token system in `globals.css` is complete; dark mode failures are caused by hardcoded hex in component files, not missing infrastructure.

**Core additions within existing packages:**
- `AreaChart` / `Area` — trajectory/trend fill view, already in recharts 3.8.1
- `ReferenceLine` — readiness threshold marker (y=75), already in recharts 3.8.1
- `supabase.auth.updateUser({ password })` — first-login password upgrade, already available
- CSS var tokens for chart colors — migration from hardcoded hex, no new tokens needed

### Expected Features

**Must have (P1):**
- Unified app shell — associates get topbar+sidebar matching trainer UX
- Sign-in redesign — no tabs, stacked buttons, single page for both auth methods
- DESIGN.md data-viz section — chart token palette, gates all chart work
- Skill list with score bars + trend arrows — core associate feedback surface
- Focus area hero card — promote `recommendedArea` above the fold
- Dark mode consistency sweep — all surfaces must respect `[data-theme="dark"]`

**Should have (P2):**
- Per-skill trend LineChart — trajectory over sessions with skill filter
- Associate curriculum view — cohort schedule, read-only, current week highlighted
- Password upgrade prompt — first-login banner after magic-link sign-in

**Defer (v1.4+):**
- OAuth providers (Google, GitHub)
- Leaderboard / cohort comparison views
- Associate-editable profile / avatar upload

### Architecture Approach

The shell unification renames `TrainerShell` → `AppShell` with a `role` prop that drives sidebar config. Trainer config is unchanged; associate config adds two sidebar nodes (Dashboard, Interviews). `PublicShell` and `AssociateNav` are deleted after migration. Gap score history for trend charts is computed at query time from existing `Session` records (no new table needed for MVP; session counts per associate are low). A new read-only `/api/associate/curriculum` route exposes cohort curriculum to authenticated associates, deriving cohort ID from the session — never from query params.

**Major components:**
1. `AppShell.tsx` — unified shell, role-driven sidebar config, replaces TrainerShell + AssociateNav
2. `SignInPage.tsx` — replaces SignInTabs, stacked buttons, inline form expansion
3. `StrengthWeaknessList.tsx` / `FocusAreaHero.tsx` / `SkillTrendChart.tsx` — associate data viz
4. `CurriculumTimeline.tsx` — read-only cohort schedule with current-week highlight
5. `/api/associate/curriculum` — new auth-guarded read-only endpoint

### Critical Pitfalls

1. **Shell refactor breaks trainer layout (HIGH)** — Default `role` prop to `'trainer'`; never restructure trainer config during refactor. Test trainer routes after each incremental change.
2. **Auth callback race in password upgrade (MEDIUM)** — Wait for `supabase.auth.getSession()` before redirecting to password setup; add server-side session check on the setup page.
3. **Gap score history perf (MEDIUM)** — Cap history at last 20 sessions; ensure `Session` is indexed on `(associateId, createdAt)`. Materialize snapshots in follow-up if needed.
4. **Curriculum data exposure (MEDIUM)** — Never accept cohort ID from query params; always derive from authenticated associate. Return `[]` for unassigned associates, not 404.
5. **Dark mode regression in new components (MEDIUM)** — Write DESIGN.md data-viz tokens first; all new components must use CSS vars from day one.

---

## Implications for Roadmap

### Phase 26: DESIGN.md Data-Viz Section
**Rationale:** Unblocks all chart work. Chart tokens must exist before any chart component is built.
**Delivers:** Chart color palette in `globals.css`, typography/axis conventions, tooltip patterns, trajectory language, dark mode chart behavior documented in `DESIGN.md`.
**Avoids:** P5 (dark mode regression) — tokens established before any chart component is written.

### Phase 27: Unified App Shell
**Rationale:** Blocks associate layout adoption for data viz and curriculum. Must come before Phases 29/30.
**Delivers:** `AppShell.tsx` with `role` prop; associate layout switched from `PublicShell`; `AssociateNav` deprecated.
**Avoids:** P1 (shell regression) — role defaults to `'trainer'`, trainer config untouched, trainer routes verified.
**Avoids:** P8 (layout shift) — associate components tested at 1280px with sidebar present.

### Phase 28: Sign-in Redesign + Password Upgrade
**Rationale:** Independent of shell; can run parallel to Phase 27.
**Delivers:** `SignInPage.tsx` (no tabs), inline form expansion, first-login password upgrade prompt.
**Avoids:** P2 (auth race) — session hydration check before redirect. P6 (state management) — single `activeMethod` state, shared email field.

### Phase 29: Associate Data Visualization
**Rationale:** Requires shell (Phase 27) and chart tokens (Phase 26).
**Delivers:** `StrengthWeaknessList`, `FocusAreaHero`, `SkillTrendChart`; gap API extended with session history.
**Avoids:** P3 (history perf) — 20-session cap, query-time compute. P7 (tooltip dark mode) — `contentStyle` CSS vars from day one.

### Phase 30: Associate Curriculum View
**Rationale:** Requires shell (Phase 27). Can run parallel to Phase 29.
**Delivers:** `CurriculumTimeline.tsx`, `/api/associate/curriculum` read-only route, empty state for unassigned associates.
**Avoids:** P4 (data exposure) — cohort ID derived from auth session, never from request params.

### Phase 31: Dark Mode QA Sweep
**Rationale:** Must be last — sweeps all surfaces built in Phases 26-30.
**Delivers:** All routes verified in dark mode; hardcoded hex eliminated; recharts tooltips fixed.

### Phase Ordering Rationale

- Phase 26 before Phase 29 — chart tokens are a strict unblock for chart components
- Phase 27 before Phases 29 and 30 — associate shell dependency
- Phases 27 and 28 can run in parallel — sign-in is shell-independent
- Phases 29 and 30 can run in parallel once Phase 27 is done
- Phase 31 always last — sweep requires all surfaces to exist

### Research Flags

No phases require `/gsd-research-phase` — all patterns are resolved by existing codebase knowledge and confirmed APIs.

Phases with standard patterns (skip research):
- **All phases (26-31):** Verified implementations in existing codebase; no novel integrations

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All components verified in `node_modules`; APIs confirmed in existing codebase |
| Features | HIGH | All features built on existing data models; no novel UX patterns |
| Architecture | HIGH | Direct codebase knowledge from v1.2 execution; specific files identified |
| Pitfalls | HIGH | Root causes verified by code inspection, not inference |

**Overall confidence:** HIGH

### Gaps to Address

- **Gap score history query perf:** Theoretical concern. Validate actual query time after Phase 29 implementation; materialize if >2s. Low risk given typical session counts.
- **Password upgrade UX copy:** Exact banner copy and placement should be confirmed during Phase 28 planning against DESIGN.md hierarchy rules.

---

## Sources

### Primary (HIGH confidence)
- Direct `node_modules` inspection — recharts component availability at `node_modules/recharts/types/`
- Existing codebase — `RosterSparkline.tsx` (CSS var in recharts), `auth/update-password/page.tsx` (updateUser pattern), `GapTrendChart.tsx` (hardcoded hex root cause identified)
- Supabase JS `auth.updateUser` — confirmed in project codebase

### Secondary (MEDIUM confidence)
- UX patterns: Notion/Linear (sign-in stacked buttons), Duolingo/Khan Academy (learner viz framing), Canvas LMS (curriculum schedule)

---

*Research completed: 2026-04-16*
*Ready for roadmap: yes*
