# Phase 11: Cohort Management - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Trainers can create, edit, and delete cohorts and assign associates to them from the trainer dashboard. Scope is CRUD plus assignment wiring. Cohort filtering of the roster and aggregate readiness summaries are Phase 12. Curriculum weeks are Phase 13.

Depends on Phase 8 (Cohort model + Associate.cohortId FK already migrated).

Requirements addressed: COHORT-01, COHORT-02.
</domain>

<decisions>
## Implementation Decisions

### API Surface
- **D-01:** Create `/api/cohorts/route.ts` with `GET` (list all cohorts, ordered by startDate desc) and `POST` (create cohort).
- **D-02:** Create `/api/cohorts/[id]/route.ts` with `GET` (single cohort + associate count), `PATCH` (edit name/dates/description), `DELETE` (remove cohort).
- **D-03:** All cohort routes require trainer auth via `isAuthenticatedSession()` — same pattern as `/api/trainer/route.ts`. Unauthenticated → 401.
- **D-04:** Validate all request payloads with Zod 4 (already a project dep). Schemas live inline in each route file at top (consistent with lightweight repo conventions). Fields: `name: z.string().min(1).max(100)`, `startDate: z.coerce.date()`, `endDate: z.coerce.date()`, `description: z.string().max(500).optional().nullable()`. Reject if `endDate < startDate`.
- **D-05:** Associate assignment uses the existing `/api/trainer/[slug]/route.ts` — add a `PATCH` method that accepts `{ cohortId: number | null }` and updates `Associate.cohortId`. Keeps associate mutations co-located with existing associate route.

### Delete Behavior
- **D-06:** Cohort delete is non-cascading. Implementation: before `prisma.cohort.delete`, run `prisma.associate.updateMany({ where: { cohortId: id }, data: { cohortId: null } })` inside a single `prisma.$transaction`. Associates remain; cohort row is removed.
- **D-07:** Phase 8 schema MUST set `onDelete: SetNull` on `Associate.cohortId` FK as a safety net. If Phase 8 shipped with a different onDelete rule, add a note in Plan 1 to verify and update the Prisma schema before implementing delete logic.

### Trainer UI Pattern
- **D-08:** Dedicated page at `/trainer/cohorts` for list + CRUD. NOT a modal. Rationale: cohorts are a first-class entity users will return to; a dedicated route gives shareable URLs and matches the existing `/trainer` dashboard pattern (server-rendered list + client interactions).
- **D-09:** Cohort list is a table with columns: Name, Start Date, End Date, Associate Count, Actions (Edit / Delete). "New Cohort" button above the table opens an inline form (no modal library — simple conditional render of form component).
- **D-10:** Edit uses the same inline form component, pre-filled with existing cohort data. Form toggles between `create` and `edit` mode via a local `editingCohortId` state.
- **D-11:** Delete uses a native `window.confirm("Delete cohort X? Associates will be unassigned but kept.")`. No custom dialog library — keep footprint minimal for solo dev velocity.
- **D-12:** Add a "Cohorts" link to the existing trainer dashboard header/nav on `/trainer/page.tsx` so trainers can reach the new page. Nav link placement is Claude's discretion within existing header structure.

### Associate Assignment Flow
- **D-13:** On `/trainer/[slug]/page.tsx` (existing associate detail page), add a "Cohort" row/card showing current cohort name (or "Unassigned") with a dropdown to change it. Dropdown options: "Unassigned" + all cohorts from `/api/cohorts`. On change, PATCH to `/api/trainer/[slug]` with `{ cohortId }`.
- **D-14:** After successful assignment, optimistically update local state and show a subtle toast/inline success message. No page reload required.
- **D-15:** No assignment UI from the cohort detail page in Phase 11 (single-sided assignment via associate page is sufficient for COHORT-02). Batch assignment from cohort page is a future enhancement.

### Validation & Error Handling
- **D-16:** Zod validation errors → return 400 with `{ error, issues }`. Prisma unique-constraint errors (duplicate cohort name) → return 409 with clear message. Other errors → 500 with generic message, log to console (match existing route patterns).
- **D-17:** Cohort name is not required to be globally unique in the schema (unless Phase 8 added that constraint). Client-side the form should allow duplicates; leave uniqueness to future requirements if trainers complain.

### Design
- **D-18:** Follow DESIGN.md tokens from the start (warm parchment background, Clash Display headings, DM Sans body, burnt orange accent) for all new UI. Reuse Tailwind classes/patterns already present in `/trainer/page.tsx` and `/trainer/[slug]/page.tsx` to match visual language. Explicit design pass for cohesion is Phase 14.

### Claude's Discretion
- Exact Tailwind class structure for the cohorts table and form layout.
- Whether to extract a shared `<CohortForm />` component or keep the form inline in the page.
- Inline success/error toast implementation (can be a simple conditional `<p className="text-green-700">` — no toast library needed).
- Whether to use Server Components + route handlers or a client component with `fetch` for the cohorts list page (match whatever the existing `/trainer` page does).

</decisions>

<specifics>
## Specific Ideas

- Match the existing `/trainer` dashboard's visual rhythm — server-rendered list, client-side actions.
- Native `window.confirm` is fine for delete confirmation. No new modal/dialog library.
- Associate-side dropdown is the primary assignment UX (from `/trainer/[slug]`). Cohort detail page does not need a bulk assign tool in v1.1.

</specifics>

<canonical_refs>
## Canonical References

### Requirements & Roadmap
- `.planning/ROADMAP.md` §"Phase 11: Cohort Management" — goal and success criteria
- `.planning/REQUIREMENTS.md` §"Cohort Management" — COHORT-01, COHORT-02 definitions

### Architecture
- `.planning/research/ARCHITECTURE.md` §"Cohort + Curriculum Data Layer" — planned routes and models
- `prisma/schema.prisma` — current models; Phase 8 adds Cohort + Associate.cohortId

### Existing Patterns (MUST match)
- `src/app/api/trainer/route.ts` — auth check, Prisma query, JSON response pattern
- `src/app/api/trainer/[slug]/route.ts` — dynamic param handling, slug validation, error shape
- `src/app/trainer/page.tsx` — trainer dashboard page structure, header, nav
- `src/app/trainer/[slug]/page.tsx` — associate detail layout, where cohort dropdown will be added
- `src/lib/auth-server.ts` — `isAuthenticatedSession()` helper
- `src/lib/prisma.ts` — Prisma singleton import

### Design
- `DESIGN.md` — tokens for all new UI

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `isAuthenticatedSession()` from `@/lib/auth-server` — use in every new route handler.
- `prisma` singleton from `@/lib/prisma` — standard DB client.
- Zod (already in deps) — import `z` from `'zod'`.
- Existing trainer page Tailwind/DESIGN.md class patterns — copy for visual consistency.

### Integration Points
- `/api/trainer/[slug]/route.ts` — currently GET-only; add PATCH for cohortId assignment.
- `src/app/trainer/[slug]/page.tsx` — add cohort row with dropdown.
- `src/app/trainer/page.tsx` — add "Cohorts" nav link.

### Constraints
- Phase 8 must have shipped with `Associate.cohortId` nullable FK and `Cohort` model. If not, block and escalate.
- Do not break existing `/trainer/[slug]` GET shape — PATCH is additive.

</code_context>
