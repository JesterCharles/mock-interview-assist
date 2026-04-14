# Phase 13: Curriculum Schedule - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Trainers define a weekly curriculum schedule per cohort (week number, skill name, topic tags, start date). The interview setup wizard auto-filters question selection to skills whose `startDate <= today` when the associate belongs to a cohort with a curriculum. Adaptive gap-based weight pre-population composes on top of the filter. If no cohort or no curriculum exists, wizard behavior is identical to v1.0 (no regression).

Out of scope: curriculum cloning between cohorts (deferred to v1.2), curriculum-scoped gap computation, notifications when new weeks unlock.

</domain>

<decisions>
## Implementation Decisions

### Curriculum data model (from Phase 8)
- **D-01:** `CurriculumWeek` already exists in `prisma/schema.prisma` with fields `id`, `cohortId` (FK), `weekNumber` (Int), `skillName` (String), `topicTags` (String[] or Json), `startDate` (DateTime). No schema changes needed in this phase.
- **D-02:** `weekNumber` naming convention matches GitHub question bank file paths (e.g. `react/question-bank-v1.md` week numbers). This is a documented contract, not code-enforced.

### Trainer curriculum UI
- **D-03:** Curriculum is managed per cohort via a table view inside the cohort detail page (`/trainer/cohorts/[id]` or inline section on existing cohort management page from Phase 11). Table columns: Week #, Skill Name, Topic Tags, Start Date, Actions (edit/delete).
- **D-04:** Add-week row: inline form at bottom of table with number input, text input, tag input (comma-separated → array), date picker. Single "Add Week" button.
- **D-05:** Edit is inline (click row → fields become editable). Delete is a confirm dialog.
- **D-06:** No bulk import in v1.1 (single-row CRUD only). No curriculum cloning.
- **D-07:** Styling uses DESIGN.md tokens (warm parchment, Clash Display headings, DM Sans body) — Phase 14 ensures cohesion but this phase ships DESIGN-compliant from the start.

### API surface
- **D-08:** `GET /api/cohorts/[id]/curriculum` — returns all weeks for the cohort, ordered by weekNumber.
- **D-09:** `GET /api/cohorts/[id]/curriculum?taught=true` — returns only weeks where `startDate <= now()`. Used by setup wizard.
- **D-10:** `POST /api/cohorts/[id]/curriculum` — add a week. Body: `{ weekNumber, skillName, topicTags, startDate }`. Validated with Zod.
- **D-11:** `PATCH /api/cohorts/[id]/curriculum/[weekId]` — update a week.
- **D-12:** `DELETE /api/cohorts/[id]/curriculum/[weekId]` — delete a week.
- **D-13:** All routes guarded by trainer auth middleware (existing pattern).

### Setup wizard filter integration
- **D-14:** On dashboard mount, if the entered associate slug maps to an associate with `cohortId != null`, fetch `/api/cohorts/{cohortId}/curriculum?taught=true` in parallel with the GitHub tech list fetch (both via `Promise.all`).
- **D-15:** Filter the available tech list (`availableTechs` from GitHub) to only entries whose path/name matches a taught `skillName`. Matching rule: case-insensitive substring match between `CurriculumWeek.skillName` and `GitHubFile.path.split('/')[0]` (the skill folder).
- **D-16:** Adaptive weights (from `adaptiveSetup.ts`) apply AFTER curriculum filter: map gap scores to weights for the filtered tech list only. Order: curriculum filters the set → adaptiveSetup weights what remains.
- **D-17:** Fallback behavior (no regression): if associate has no `cohortId`, or cohort has no curriculum rows, or `/api/cohorts/[id]/curriculum?taught=true` returns empty or errors → show the full unfiltered GitHub tech list (v1.0 behavior). Failure is silent (log warn, do not block wizard).
- **D-18:** UI signal: when filter is active, show a small badge near the tech list header: "Filtered by cohort curriculum (N taught skills)". Clicking the badge shows a dropdown of taught week names for transparency. No "disable filter" override in v1.1 — filter is authoritative when curriculum exists.

### Performance budget
- **D-19:** Wizard must load in under 400ms when curriculum filter is active. Curriculum fetch and GitHub fetch run in parallel via `Promise.all` — total time = max(curriculum, github), not sum.
- **D-20:** Curriculum fetch is a single indexed DB query (`WHERE cohortId = ? AND startDate <= now()`), expected < 50ms.
- **D-21:** Perf is measured via Playwright timing from wizard mount to tech list render. Assertion in E2E test (not unit).

### Composition with adaptiveSetup
- **D-22:** `mapGapScoresToWeights` is called after curriculum filter is applied. The gap scores response may contain skills not in the taught list; those are silently dropped before weight mapping (don't pre-populate weights for untaught skills).
- **D-23:** If an associate has gap scores for a skill that is no longer in the taught list (curriculum changed), that skill is hidden from the wizard. No warning — trainer is responsible for curriculum correctness.

### Claude's Discretion
- Exact tag input UX (comma-separated vs chip input)
- Visual design of the filter badge (within DESIGN.md bounds)
- Sort order of taught weeks in the dropdown (weekNumber ascending assumed)
- Error toast wording

</decisions>

<specifics>
## Specific Ideas

- Filter badge should feel informative, not restrictive — trainers should read it as "curriculum is guiding this" rather than "something is being hidden"
- `Promise.all` composition pattern: wizard should never block on curriculum if GitHub is slow or vice versa
- When curriculum changes while a session is in flight, the existing in-memory session keeps working — only future wizard loads reflect the change

</specifics>

<canonical_refs>
## Canonical References

### Curriculum architecture
- `.planning/research/ARCHITECTURE.md` §curriculum — curriculum data flow, setup wizard integration, week number convention
- `.planning/research/ARCHITECTURE.md` §setup-wizard — existing selectedWeeks/techMap flow
- `.planning/REQUIREMENTS.md` §Curriculum — CURRIC-01, CURRIC-02 definitions
- `.planning/ROADMAP.md` §"Phase 13" — goal, success criteria

### Phase 8 schema (foundation)
- `prisma/schema.prisma` — CurriculumWeek model (added Phase 8)
- `.planning/phases/08-schema-migration/08-CONTEXT.md` — schema decisions

### Phase 11 cohort management (parent UI)
- `.planning/phases/11-cohort-management/` — cohort CRUD, trainer UI patterns to mirror

### Adaptive setup (composition target)
- `src/lib/adaptiveSetup.ts` — `mapGapScoresToWeights` pure function to compose with
- `src/app/dashboard/page.tsx` — setup wizard where filter integrates

### Question source
- `src/lib/github-service.ts` — GitHub fetch contract (`GitHubFile`)
- `src/lib/markdownParser.ts` — question parsing (no change needed)

### Design
- `DESIGN.md` — token source for curriculum UI styling

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/adaptiveSetup.ts::mapGapScoresToWeights` — pure function, already handles empty input, compose in-memory after filter
- Phase 11 cohort CRUD routes — mirror the same auth + Zod validation pattern
- `src/app/api/associates/[slug]/gap-scores/route.ts` — Phase 7 fetch pattern to follow for wizard integration
- `useInterviewStore` — `selectedTechs` and `techWeights` already in store; no store shape changes needed

### Established Patterns
- Zod validation at API route entry (CLAUDE.md §Validation)
- `Promise.all` for parallel async work (already used in wizard for GitHub fetch + gap scores)
- HttpOnly trainer cookie auth middleware (existing)
- `src/lib/prisma.ts` singleton for DB access

### Integration Points
- Dashboard mount useEffect: add curriculum fetch to existing Promise.all block (currently fetches gap scores + GitHub)
- After `availableTechs` is set, apply curriculum filter before rendering
- Before calling `mapGapScoresToWeights`, filter gap scores to taught skills

</code_context>

<deferred>
## Deferred Ideas

- Curriculum cloning from another cohort — v1.2 (CURRIC-FUTURE-01)
- Curriculum-scoped gap computation — v1.2 (CURRIC-FUTURE-02)
- Bulk CSV import of weeks — post-v1.1
- Notifications when a new week becomes taught — post-v1.1
- Trainer override to disable the curriculum filter per-session — post-v1.1

</deferred>

---

*Phase: 13-curriculum-schedule*
*Context gathered: 2026-04-14*
