# Phase 12: Cohort Dashboard Views - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Trainer dashboard roster page (`/trainer`) gains a cohort filter dropdown and aggregate readiness summary bar. Filtering is additive — existing roster table, sort, search, and badges remain unchanged. Per-cohort trend charts and snapshots are deferred (COHORT-FUTURE-02).

</domain>

<decisions>
## Implementation Decisions

### Filter UI placement
- **D-01:** Cohort dropdown sits ABOVE the roster table, in a header row alongside (or above) existing search input. Order: page title → filter row (cohort dropdown + search) → summary bar → roster table.
- **D-02:** Default selection is "All Associates" — restores the existing v1.0 unfiltered view exactly. Associates with `cohortId = null` ONLY appear under "All Associates".
- **D-03:** Dropdown lists all cohorts from `Cohort` table sorted by `startDate` desc (most recent first), with "All Associates" pinned at top.

### Aggregate summary bar
- **D-04:** Summary bar appears ONLY when a specific cohort is selected (hidden under "All Associates" to avoid noise on full roster).
- **D-05:** Shows three counts as colored pills/badges: Ready (N) / Improving (N) / Not Ready (N). Uses same color tokens as readiness badges in RosterTable for consistency.
- **D-06:** Summary computed server-side from the same filtered query — no client recomputation. Returned in API response payload.

### Query approach
- **D-07:** Client-side filter state with server-side query. Roster page becomes stateful (`selectedCohortId`), refetches `/api/trainer?cohortId=X` on selection change. Avoids URL search params complexity; preserves existing client-rendered pattern in `src/app/trainer/page.tsx`.
- **D-08:** API endpoint `/api/trainer` accepts optional `cohortId` query param. When present, filters `Associate.findMany` by `where: { cohortId }`. When absent or "all", returns full roster (current behavior preserved).
- **D-09:** Response shape extended to `{ associates: RosterAssociate[], summary: { ready: N, improving: N, notReady: N } | null }`. Summary is `null` when no cohort filter applied.

### Preserving existing behavior
- **D-10:** Existing sort (by readinessStatus asc) and client-side search in RosterTable continue to operate on the (possibly filtered) associate list. No changes to RosterTable internals — it receives the same `associates` prop.
- **D-11:** Loading skeleton refires on cohort change (acceptable — small dataset, fast query).

### Cohort fetch
- **D-12:** Cohorts fetched once on mount via separate `/api/cohorts` GET (assumed exists from Phase 11). If not yet built in Phase 11, this plan adds a minimal GET handler returning `{ id, name }[]`.

### Claude's Discretion
- Exact summary bar visual styling (border, padding) within DESIGN.md tokens
- Dropdown component implementation (native `<select>` vs custom — prefer native for minimal scope)
- Whether to debounce cohort change refetch (probably not needed)

</decisions>

<specifics>
## Specific Ideas

- Summary bar should feel like a "scoreboard" — at-a-glance counts, not dense text
- Native `<select>` is acceptable; this is an internal trainer tool, not a marketing surface
- Filter row should not push roster too far down — keep compact

</specifics>

<canonical_refs>
## Canonical References

### Roster + readiness
- `.planning/REQUIREMENTS.md` §Cohort Management — COHORT-03, COHORT-04 acceptance criteria
- `.planning/ROADMAP.md` §"Phase 12" — Phase goal and success criteria
- `src/lib/trainer-types.ts` — `RosterAssociate` type (extend response shape, do not modify)
- `src/lib/readinessService.ts` — Readiness classification reference for status values
- `src/components/trainer/RosterTable.tsx` — Existing roster table (unchanged in this phase)

### Phase 11 dependency
- `.planning/phases/11-*/` — Cohort model, `/api/cohorts` endpoint (assumed available). Plans must verify and gracefully scaffold if missing.

### Design
- `DESIGN.md` — Color tokens for readiness badges (reuse), filter row spacing

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/trainer/page.tsx`: Client component with auth guard + fetch pattern. Add `selectedCohortId` state and refetch effect.
- `src/components/trainer/RosterTable.tsx`: Receives `associates` prop. No changes needed — pass filtered list.
- `src/lib/prisma.ts`: Prisma singleton already used by `/api/trainer`.
- Readiness badge styling in RosterTable can inform summary pill colors.

### Established Patterns
- Auth via `isAuthenticatedSession()` server helper for all `/api/trainer/*` routes.
- Client fetch pattern: `useEffect` + `useState` for loading/error states (matches `/dashboard`).
- Response validation: `validatedReadinessStatus()` cast helper in `/api/trainer/route.ts`.

### Integration Points
- `/api/trainer` GET handler — extend with `cohortId` query param + summary computation.
- `src/app/trainer/page.tsx` — add filter UI, summary bar, cohort fetch, refetch on filter change.
- `src/lib/trainer-types.ts` — add `CohortSummary` type and `RosterResponse` wrapper.

</code_context>

<deferred>
## Deferred Ideas

- Per-cohort trend charts (COHORT-FUTURE-02) — separate phase
- Cohort snapshots / historical aggregates (COHORT-FUTURE-01) — separate phase
- URL-persisted filter state (`?cohortId=X` as shareable link) — nice-to-have, not in v1.1
- Multi-cohort selection — out of scope (single FK per associate)

</deferred>

---

*Phase: 12-cohort-dashboard-views*
*Context gathered: 2026-04-14*
