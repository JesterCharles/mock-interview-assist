# Feature Research — v1.3 UX Unification & Polish

**Domain:** Education/training platform — associate UX, unified shell, auth polish, data visualization
**Researched:** 2026-04-16
**Confidence:** HIGH (established UX patterns; builds on existing v1.2 codebase)

---

## Scope

v1.3 adds six feature areas on top of the v1.2 foundation:

- **A.** Unified App Shell (associate pages adopt two-level topbar+sidebar)
- **B.** Sign-in Redesign (no tabs, dual-method single page, password upgrade)
- **C.** Associate Data Visualization (strengths/weaknesses, trend charts, focus area hero)
- **D.** Associate Curriculum View (cohort schedule, read-only)
- **E.** DESIGN.md Data-Viz Section (chart tokens, informational hierarchy)
- **F.** Dark Mode QA (consistency sweep)

---

## A. Unified App Shell (Associate Pages)

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Topbar + sidebar layout for associates | Visual consistency with trainer shell; same product feel | MEDIUM | Reuse trainer shell component with role prop. Associate nodes: Dashboard, Interviews only. No cohort switcher. |
| Active-route highlight in sidebar | Users expect visual orientation cue | LOW | Already implemented in trainer shell — port to associate config |
| Role-appropriate nav items only | Associates should not see trainer-only links even as disabled states | LOW | Pass sidebar config as prop array to shell component |
| Mobile-responsive shell | Users access on various screens | LOW | Trainer shell already handles responsive; inherits automatically |

### Anti-Features

| Feature | Why Avoid | Alternative |
|---------|-----------|-------------|
| Cohort switcher in associate shell | Associates are in one cohort — switcher adds noise and confusion | Show cohort name as read-only label in sidebar header |
| Editable profile / avatar upload | Identity is trainer-managed; creates auth/validation surface | Display name read-only in topbar |
| Associate sidebar with > 4 nodes | Complexity creep — associates have 2 primary surfaces | Dashboard + Interviews. Curriculum lives within Dashboard tab as a sub-section. |

**Dependencies:** Trainer shell component must accept a `role` or `sidebarConfig` prop before associate pages can adopt it. This is the blocking task for the milestone.

---

## B. Sign-in Redesign

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Single page, no tabs | Users don't self-identify as "trainer vs associate" — tabs create confusion and double the decision burden | LOW | Replace `SignInTabs.tsx`. Two stacked buttons: "Continue with email link" and "Sign in with password". |
| Email-link flow inline | Magic link send + "check your inbox" feedback state | LOW | Already implemented in current tabs; preserve feedback state and resend-after-60s pattern |
| Password flow inline | Expand password field below "sign in with password" button; no separate page | LOW | Supabase `signInWithPassword` — already wired for trainers |
| Password upgrade prompt (first-login) | Associates invited via magic link have no password. Standard onboarding pattern (Notion, Linear, Loom). | MEDIUM | Detect: `associateId` exists + `authUserId` set + no `has_password` flag. Show dismissable banner after first magic-link session. `supabase.auth.updateUser({ password })` |
| Redirect to correct post-login destination | Trainers → `/trainer`; Associates → `/associate/[slug]` | LOW | Already handled in middleware; preserve routing logic |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Password upgrade prompt | Associates who return frequently stop waiting for email; reduces friction after first session | MEDIUM | One-time banner. "Set a password for faster sign-in →". Dismissable, never blocks. |

### Anti-Features

| Feature | Why Avoid | Alternative |
|---------|-----------|-------------|
| OAuth providers (Google, GitHub) | Adds Supabase OAuth config surface + user confusion about which method they used | Email-only for now; defer OAuth to v1.4+ if user research demands it |
| "Forgot password" complex flow | Associates use magic link — password reset is secondary path | Link to "send email link instead" when password fails |
| Separate sign-in pages per role | Requires users to navigate to the right URL before even authenticating | Single `/signin` handles both; role resolved post-auth |

---

## C. Associate Data Visualization

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Ranked skill list with score bars | Users expect to see which skills are weak (Khan Academy, Codecademy, Duolingo all use this) | MEDIUM | Source: `GapScore` table. Ranked by weighted score ascending. Score bar (0–100%) per row + skill name. |
| Trend arrows (↑↓→) per skill | Universal shorthand for improving/declining/flat | LOW | Compute from last 2 gap score values per skill. ↑ if delta > 2pts, ↓ if delta < -2pts, → otherwise. |
| Focus area hero card | Single prominent "your recommended area is X" callout above the fold | LOW | `Associate.recommendedArea` already computed. Promote from footnote to hero card. Include "why" (last 3 sessions). |
| Per-skill trend LineChart | Shows trajectory over sessions; more actionable than a single number | MEDIUM | `recharts LineChart` (already in stack). Filter dropdown by skill. X-axis: session number. Y-axis: score 0–100. |
| Session history list | Expected on any learning platform | LOW | Already partially exists; ensure it's accessible from associate shell |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Trajectory language over score language | "You're improving on React (+8 pts over 3 sessions)" beats "React: 72%". Self-comparison, not comparison to threshold. | LOW | Copy choice, not engineering. Avoids clinical framing that distances associates. |
| Score + override visibility | Associates can see LLM score vs. trainer-calibrated score. Most edtech hides algorithm internals — transparency builds trust in professional training. | LOW | Already stored in session data; surface in session detail view |

### Anti-Features

| Feature | Why Avoid | Alternative |
|---------|-----------|-------------|
| Red/weakness framing for low scores | Demotivates; Khan Academy research validates "growth area" language | Use "focus area", "growth area", neutral amber color |
| Leaderboard / cohort comparison | Demotivates lower performers — exactly the people who most need engagement | Self-comparison only: "you improved X pts this week" |
| Multiple simultaneous recommendations | Decision fatigue — Duolingo A/B tested away from multi-rec lists | Surface one focus area prominently; "see all gaps" is a secondary link |
| Auto-start recommended mock | Removes associate agency | Show CTA: "Start a mock focusing on [area] →" |

---

## D. Associate Curriculum View

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Cohort schedule list (past + current + upcoming) | Associates preparing for mocks need to know what's coming | MEDIUM | Source: `CurriculumWeek` records for associate's `cohortId`. List format: week number + skill name + date range. |
| Current week highlighted | Standard LMS pattern (Canvas, Notion-based cohort tools) | LOW | Compare `weekStartDate` to today; apply highlighted style to active row |
| Past weeks greyed | Temporal orientation; reduces noise | LOW | CSS opacity on rows where `startDate < today - 7d` |
| Future weeks visible but muted | Associates can preview upcoming topics to self-study | LOW | Same as greyed, different opacity or label |
| Empty state when no cohort assigned | Associates not yet in a cohort shouldn't see broken UI | LOW | "You haven't been assigned to a cohort yet. Ask your trainer." |

### Anti-Features

| Feature | Why Avoid | Alternative |
|---------|-----------|-------------|
| Curriculum editing by associates | Curriculum is trainer-owned; conflict resolution is complex | Read-only view; feedback through trainer out-of-band |
| Completion checkboxes per week | Implies associates should "finish" curriculum weeks — creates anxiety about missed weeks | No checkboxes; curriculum is informational, not a to-do list |

**Dependencies:** Associate must have `cohortId` set on their `Associate` record. View degrades gracefully to empty state if not assigned.

---

## E. DESIGN.md Data-Viz Section

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Chart color palette tokens | Prevents visual inconsistency between charts built in different phases | LOW | Define 5-6 semantic tokens: primary line, secondary line, success fill, warning fill, neutral fill. Add to `globals.css`. |
| Chart typography rules | Axis labels, tick labels, tooltips need to use DESIGN font tokens | LOW | Specify font size (xs/sm), weight, color token for each chart element type |
| Informational hierarchy for data viz | Which data surfaces as prominent vs. supporting | LOW | Hero number → supporting trend chart → detail table. Document the order. |
| Trajectory/trend presentation convention | Consistent meaning of ↑↓→ arrows and color coding across all surfaces | LOW | Align with existing DESIGN tokens (success/warning/danger). Define thresholds. |
| Dark mode chart behavior | Charts must work in dark mode — recharts SVG fills and strokes need dark-mode overrides | LOW | Document which CSS custom properties to override for dark chart surfaces |

**This section gates associate visualization work.** Build DESIGN.md additions before building charts.

---

## F. Dark Mode QA

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| All pages respect `[data-theme="dark"]` | Any page stuck on light mode feels broken and breaks immersion | MEDIUM | Sweep: `/interview/new`, `/interview`, `/review`, `/associate/*`, `/signin`, new shell surfaces |
| No hardcoded `bg-white`, `text-black`, `border-gray-*` | Root cause of dark mode failures | LOW | Grep for hardcoded Tailwind light-only utilities; replace with CSS custom property classes |
| Chart SVG elements respect dark mode | recharts SVG fills default to white/black — will break in dark mode | LOW | Use CSS custom property values in recharts `stroke` and `fill` props rather than hardcoded colors |
| New shell surfaces dark-mode-correct from day one | Cheaper to build it right than QA it twice | LOW | Shell components must use DESIGN token classes throughout |

### Anti-Features

| Feature | Why Avoid | Alternative |
|---------|-----------|-------------|
| Per-page dark mode toggle | Inconsistent; users expect system-wide setting | Single toggle that persists to localStorage; boot script on `<html>` already exists |
| Dark mode as an afterthought | Any feature built without dark-mode awareness creates QA debt | Design tokens + `[data-theme="dark"]` variants are required on all new components |

---

## Feature Dependencies

```
DESIGN.md Data-Viz Section (E)
    └──required-by──> Associate Data Visualization (C) — chart tokens must exist first

Trainer Shell refactor (topbar+sidebar accept role/config prop)
    └──required-by──> Associate Shell (A) — must be parameterizable first

Associate Shell (A)
    └──required-by──> Associate Curriculum View (D) — curriculum lives in associate shell nav
    └──required-by──> Associate Data Visualization (C) — viz lives in associate shell

Sign-in Redesign (B)
    └──enables──> Password Upgrade Prompt — new sign-in provides entry point context
    └──required-by──> Dark Mode QA (F) — new sign-in page must be swept

Dark Mode QA (F)
    └──requires──> All other surfaces complete — sweep happens last
```

### Recommended Build Order

1. **E** — DESIGN.md data-viz section (low complexity, unblocks chart work)
2. **A** — Unified shell (shell refactor + associate layout)
3. **B** — Sign-in redesign + password upgrade prompt
4. **C** — Associate data visualization (charts, skill list, focus area hero)
5. **D** — Associate curriculum view
6. **F** — Dark mode QA sweep (last — all surfaces must be complete)

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Associate unified shell | HIGH | MEDIUM | P1 |
| Sign-in redesign (no tabs) | HIGH | LOW | P1 |
| DESIGN.md data-viz section | HIGH (gates) | LOW | P1 |
| Skill list + trend arrows | HIGH | MEDIUM | P1 |
| Focus area hero card | HIGH | LOW | P1 |
| Dark mode consistency sweep | MEDIUM | MEDIUM | P1 |
| Associate curriculum view | MEDIUM | MEDIUM | P2 |
| Per-skill trend LineChart | MEDIUM | MEDIUM | P2 |
| Password upgrade prompt | MEDIUM | MEDIUM | P2 |

---

## Sources

- Existing codebase: `src/components/SignInTabs.tsx`, `src/lib/gapPersistence.ts`, `src/lib/curriculumService.ts`, `src/app/globals.css`, PROJECT.md v1.3 target features
- Supabase JS: `auth.updateUser({ password })` — standard client method, HIGH confidence
- Recharts 3: `LineChart`, `BarChart` — already in stack, React 19 compatible
- UX patterns: Notion/Linear (sign-in), Duolingo/Khan Academy (learner viz framing), Canvas LMS (curriculum schedule), Linear/Vercel (dark mode token approach) — MEDIUM confidence, well-established patterns

---
*Feature research for: Next Level Mock v1.3 UX Unification & Polish*
*Researched: 2026-04-16*
