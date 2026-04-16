# Domain Pitfalls — v1.3 UX Unification & Polish

**Domain:** Shell unification + auth refactor + data viz + curriculum exposure + dark mode
**Researched:** 2026-04-16
**Confidence:** HIGH (patterns from v1.2 execution + known codebase issues)

---

## P1: Shell Refactor Breaks Trainer Layout

**Risk:** HIGH
**Phase:** Shell unification (A)

Renaming/refactoring `TrainerShell` to a generic `AppShell` while adding role logic can break the existing trainer layout if sidebar config, active-route highlighting, or cohort switcher logic gets disrupted.

**Warning signs:** Trainer pages lose sidebar items, cohort switcher disappears, mobile drawer stops working.

**Prevention:**
- Snapshot existing trainer shell behavior with tests before refactoring
- Role prop defaults to `'trainer'` so existing layouts work unchanged without modification
- Add associate config separately, don't restructure trainer config
- Test trainer routes after every shell change

---

## P2: Auth Callback Race in Password Upgrade

**Risk:** MEDIUM
**Phase:** Sign-in redesign (B)

Magic-link callback -> session established -> redirect to password setup page. If redirect happens before Supabase session is fully hydrated on the client, `supabase.auth.updateUser()` fails with "not authenticated."

**Warning signs:** Password setup page shows auth error intermittently, especially on slow connections.

**Prevention:**
- Wait for `supabase.auth.getSession()` to return valid session before redirect
- Use server-side session check in the password setup page's server component
- Add loading state while session hydrates

---

## P3: Gap Score History Performance

**Risk:** MEDIUM
**Phase:** Associate data viz (C)

Computing gap scores per-session at query time (Option A from architecture) requires joining Sessions -> per-question assessments -> techMap for every historical session. With 20+ sessions and 5+ skills, this could be slow.

**Warning signs:** Associate dashboard takes >2s to load, especially for associates with many sessions.

**Prevention:**
- Limit history to last 20 sessions (sufficient for meaningful trends)
- Index `Session` on `associateId` + `createdAt` (likely already indexed)
- If perf is unacceptable after implementation, add materialized `GapScoreSnapshot` table in a follow-up

---

## P4: Curriculum Data Exposure

**Risk:** MEDIUM
**Phase:** Curriculum view (D)

New `/api/associate/curriculum` route exposes cohort curriculum to associates. Must ensure:
- Associate can only see their own cohort's curriculum
- Unauthenticated users get 401
- Associates without a cohort get empty state, not error

**Warning signs:** Associate sees another cohort's curriculum, or unauthenticated request returns data.

**Prevention:**
- `getCallerIdentity()` -> must be associate -> fetch `Associate.cohortId` -> query only that cohort's weeks
- Never accept cohort ID from query params — always derive from authenticated associate
- Return `[]` (not 404) when no cohort assigned

---

## P5: Dark Mode Regression from New Components

**Risk:** MEDIUM
**Phase:** All phases, especially data viz (C) and shell (A)

New components built during v1.3 may introduce fresh dark mode violations if developers use hardcoded colors. The dark mode QA sweep (Phase F) catches these, but fixing late is more expensive than building correctly.

**Warning signs:** New chart components use `fill="#C85A2E"` instead of `fill="var(--accent)"`.

**Prevention:**
- Write DESIGN.md data-viz section FIRST (Phase E) — establishes token palette
- All new components must use CSS var tokens from day one
- Dark mode QA phase catches stragglers but shouldn't be the primary defense

---

## P6: Sign-in UX State Management

**Risk:** LOW
**Phase:** Sign-in redesign (B)

Stacked buttons that expand inline to forms need state management for which form is visible. Easy to get wrong: both forms open simultaneously, form state persists when switching, magic-link "check inbox" state lost when toggling.

**Warning signs:** Both forms render at once, switching clears typed email, success state disappears.

**Prevention:**
- Single `activeMethod` state: `null | 'email' | 'password'`
- Shared email field persists across method switch (user typed it once)
- Success/pending states tied to the method, cleared on switch

---

## P7: recharts Tooltip in Dark Mode

**Risk:** LOW
**Phase:** Data viz (C) + Dark mode QA (F)

recharts `Tooltip` renders a `<div>` with inline styles. Default background is white, text is dark. In dark mode, tooltip appears as a bright white box. `contentStyle` prop accepts inline style objects — must use CSS vars.

**Warning signs:** Bright white tooltip boxes on dark chart backgrounds.

**Prevention:**
```tsx
<Tooltip contentStyle={{
  backgroundColor: 'var(--surface)',
  color: 'var(--ink)',
  border: '1px solid var(--border)'
}} />
```
Document this pattern in DESIGN.md data-viz section.

---

## P8: Layout Shift During Shell Migration

**Risk:** LOW
**Phase:** Shell unification (A)

Switching associate pages from `PublicShell` (no sidebar) to `AppShell` (with sidebar) changes the content width. Components that assumed full-width layout may look wrong with sidebar present.

**Warning signs:** Charts stretch oddly, text wraps differently, spacing feels cramped.

**Prevention:**
- Associate dashboard components should use `ResponsiveContainer` (recharts) or relative widths
- Test on 1280px viewport (common laptop) with sidebar visible
- Don't delete `PublicShell` until all associate pages are verified in new shell

---

## Summary Matrix

| # | Pitfall | Risk | Phase | Prevention Cost |
|---|---------|------|-------|-----------------|
| P1 | Shell refactor breaks trainer | HIGH | A | LOW |
| P2 | Auth callback race | MEDIUM | B | LOW |
| P3 | Gap history perf | MEDIUM | C | LOW |
| P4 | Curriculum data exposure | MEDIUM | D | LOW |
| P5 | Dark mode regression | MEDIUM | All | LOW |
| P6 | Sign-in state mgmt | LOW | B | LOW |
| P7 | Tooltip dark mode | LOW | C/F | LOW |
| P8 | Layout shift | LOW | A | LOW |

---
*Pitfalls research for: v1.3 UX Unification & Polish*
*Researched: 2026-04-16*
