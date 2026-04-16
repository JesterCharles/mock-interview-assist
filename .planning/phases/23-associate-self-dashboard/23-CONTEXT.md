# Phase 23: Associate Self-Dashboard — Context

**Gathered:** 2026-04-16
**Status:** Ready for planning
**Source:** /gsd-discuss-phase --auto (all decisions auto-selected)

<domain>
## Phase Boundary

Replace the P19 dashboard stub (`/associate/[slug]/dashboard`) with a real associate self-dashboard showing personal gap trends, recommended practice area, readiness-goal progress bar, and Book a Mock CTA. Add AssociateNav tabs (Dashboard / Profile / Book a Mock) to the associate layout.

**Out of scope:** Full mock scheduling (deferred per ASELF-04 — mailto only), cohort-mate visibility (aggregate-only per ASELF-03), streaks/leaderboards (out of scope per REQUIREMENTS.md).

</domain>

<decisions>
## Implementation Decisions

### Layout + Navigation (ASELF-01)
- **D-01:** `AssociateNav` component with 3 tabs: Dashboard, Profile, Book a Mock. Rendered in `src/app/associate/[slug]/layout.tsx`.
- **D-02:** Dashboard tab is default landing (replaces P19 redirect stub).
- **D-03:** Profile tab links to existing `/associate/[slug]` page.
- **D-04:** Book a Mock tab renders the CTA inline (not a separate page).

### Gap Trend Chart (ASELF-01)
- **D-05:** Recharts `<LineChart>` showing associate's own GapScore history per skill over time. Same visual pattern as trainer gap trend charts.
- **D-06:** Data from `/api/associates/[slug]/gap-scores` (already exists). May need enrichment for time-series data.
- **D-07:** One line per skill, color-coded. Legend shows skill names. Time axis shows session dates.

### Recommended Practice Area (ASELF-02)
- **D-08:** Single card showing `Associate.recommendedArea` with a one-line "why" (e.g. "Your lowest gap score is in JavaScript — 62%").
- **D-09:** "Not now" dismiss button hides the card for 7 days via `localStorage` key `nlm_dismiss_recommended_{slug}` with timestamp.
- **D-10:** Card reappears after 7 days or when `recommendedArea` changes.

### Readiness Progress Bar (ASELF-03)
- **D-11:** Horizontal progress bar. Fill = current weighted readiness percentage. Threshold line marker at cohort threshold value.
- **D-12:** Threshold fetched from `/api/settings` (GET, public for threshold value). No cohort-mate names shown.
- **D-13:** Label shows "Your Readiness: X% (Target: Y%)". Color: green if at/above threshold, amber if within 10%, red if below.

### Book a Mock (ASELF-04)
- **D-14:** `mailto:` link to trainer email. Trainer email sourced from associate's cohort context or a fallback configured in Settings.
- **D-15:** Minimum viable — no in-app scheduling. Button opens email client with pre-filled subject: "Book a Mock Interview — {associateName}".

### Security (ASELF-05 / SC 5)
- **D-16:** Middleware already enforces authenticated access to `/associate/*`. Dashboard page additionally verifies `caller.associateSlug === params.slug` — returns 403 if mismatch.

### Claude's Discretion
- Exact chart configuration (axis labels, colors per skill)
- Card component styling details
- Whether gap-scores API needs enrichment for time-series or if existing data shape suffices
- AssociateNav tab icons (lucide-react)
- Progress bar animation

</decisions>

<canonical_refs>
## Canonical References

### Roadmap + Requirements
- `.planning/ROADMAP.md` — Phase 23 section, SC 1-5
- `.planning/REQUIREMENTS.md` — ASELF-01 through ASELF-04

### Prior Phase Context
- `.planning/phases/19-bulk-invite/19-CONTEXT.md` — Dashboard stub page created
- `.planning/phases/21-app-shell-redesign/21-CONTEXT.md` — Shell layout patterns, AssociateNav concept

### Existing Code
- `src/app/associate/[slug]/dashboard/page.tsx` — P19 stub (REPLACE with real dashboard)
- `src/app/associate/[slug]/page.tsx` — Existing profile page
- `src/app/associate/[slug]/interview/page.tsx` — Existing interview entry
- `src/components/layout/PublicShell.tsx` — Associate layout wrapper
- `src/app/api/associates/[slug]/gap-scores/route.ts` — Gap scores API
- `src/lib/readinessService.ts` — Readiness classification logic
- `src/app/api/settings/route.ts` — Settings API (threshold)
- `src/app/trainer/[slug]/page.tsx` — Trainer gap trend chart (recharts pattern reference)

### Design System
- `DESIGN.md` — Visual tokens

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **recharts** — Already used for trainer gap trend charts. Reuse `<LineChart>` pattern.
- **Gap scores API** — `/api/associates/[slug]/gap-scores` already returns per-skill gap data.
- **PublicShell** — Existing associate layout wrapper.
- **readinessService** — Trend/classification logic reusable for progress bar computation.

### Integration Points
- Replace P19 dashboard stub with real page
- Add AssociateNav to associate layout
- Fetch gap scores + settings for dashboard data
- Identity check via `getCallerIdentity()` for slug matching

</code_context>

<specifics>
## Specific Ideas

- Dashboard is read-only — associate cannot modify any data, only view their own.
- The 7-day dismiss for recommended area uses localStorage with timestamp comparison, not server state.
- Progress bar threshold comes from the same Settings singleton used by the trainer dashboard.
- Book a Mock is intentionally minimal (mailto) — full scheduling is a separate feature.

</specifics>

<deferred>
## Deferred Ideas

- **Full mock scheduling** — Calendar integration, availability picker. Deferred per ASELF-04.
- **Streaks / badges** — Gamification. Out of scope per REQUIREMENTS.md.
- **Cohort-mate comparison** — Privacy default is aggregate-only. Deferred.
- **Push notifications** — Readiness change alerts. Deferred to v1.3 (NOTIF-01).

</deferred>

---

*Phase: 23-associate-self-dashboard*
*Context gathered: 2026-04-16 via /gsd-discuss-phase --auto*
