# Phase 6: Trainer Dashboard - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Trainer-facing dashboard at `/trainer` — roster view of all associates with readiness badges, drill-down to per-associate detail with session history, gap trend charts (recharts), and AI vs trainer score calibration view. Protected by existing single-password auth.

</domain>

<decisions>
## Implementation Decisions

### Route Structure
- **D-01:** `/trainer` — roster view (all associates). `/trainer/[slug]` — associate detail. No separate layout — uses existing app layout with nav back to dashboard.

### Roster View
- **D-02:** Table/list of all associates showing: name, slug, readiness badge (color-coded), session count, last session date, recommended area. Sortable by readiness status. Click navigates to detail view.

### Associate Detail View
- **D-03:** Three sections: (1) Session history — last 5+ sessions with date, overall scores, status. (2) Gap trend chart — recharts LineChart with skill filter dropdown, topic-level breakdown on click. (3) Calibration view — AI score vs trainer override side-by-side per dimension for selected session.

### Charts Library
- **D-04:** recharts 3.8.1 (React 19 compatible, per CLAUDE.md stack decision). LineChart for gap trends, BarChart or RadarChart for skill comparison. All SVG-based, Tailwind-themed.

### Empty States
- **D-05:** Associates with < 3 sessions show a meaningful placeholder: "N more sessions needed for gap analysis" with completed session count. No broken charts or blank panels (DASH-07).

### Auth Protection
- **D-06:** `/trainer` route protected by existing single-password auth middleware. Same pattern as `/dashboard`, `/interview`, `/review` routes. No new auth logic needed.

### Data Fetching
- **D-07:** Server Components for initial data load. No client-side cache library (per CLAUDE.md stack decisions). Recharts components are client components (`"use client"`), data passed as props from server component.

### Claude's Discretion
- Exact chart configurations (colors, axes, tooltips)
- Responsive layout breakpoints
- Session detail expand/collapse behavior
- Loading states for chart data

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design System
- `DESIGN.md` — Editorial/utilitarian aesthetic, warm parchment + burnt orange accent, typography, spacing

### Stack Decisions
- `CLAUDE.md` §Technology Stack — recharts 3.8.1, RSC + fetch data pattern

### Prior Phase Decisions
- `.planning/phases/03-associate-profiles/03-CONTEXT.md` — Associate model, slug-based identity
- `.planning/phases/04-gap-service/04-CONTEXT.md` — GapScore model, gap computation
- `.planning/phases/05-readiness-signals/05-CONTEXT.md` — Readiness badges, recommended area

### Existing Code
- `src/middleware.ts` — Auth middleware protecting routes (add /trainer)
- `src/app/dashboard/page.tsx` — Existing dashboard page pattern
- `src/lib/auth-server.ts` — `isAuthenticatedSession()` guard

### Requirements
- `.planning/REQUIREMENTS.md` — DASH-01 through DASH-07

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Auth middleware already protects routes — add `/trainer` to pattern
- `isAuthenticatedSession()` server-side guard
- Existing page layout components (if any shared layout)

### Established Patterns
- App Router page components in `src/app/[route]/page.tsx`
- Zustand for client state, but dashboard data is read-only from server
- Tailwind CSS 4 for styling

### Integration Points
- Middleware route protection — add /trainer
- Prisma client — query associates, sessions, gap scores
- recharts — new dependency to install
- DESIGN.md — all visual decisions

</code_context>

<specifics>
## Specific Ideas

No specific requirements beyond requirements doc. Design system (DESIGN.md) governs all visual decisions.

</specifics>

<deferred>
## Deferred Ideas

- Real-time score updates via Supabase Realtime — post-MVP
- Export/download of associate reports — future feature
- Batch readiness assessment view — future enhancement

</deferred>

---

*Phase: 06-trainer-dashboard*
*Context gathered: 2026-04-13*
