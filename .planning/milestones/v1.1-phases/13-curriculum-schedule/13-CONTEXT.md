# Phase 13: Curriculum Schedule - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning
**Patched:** 2026-04-14 (Codex findings #7 downgrade <400ms SLO, #9 canonical skillSlug)

<domain>
## Phase Boundary

Trainers define a weekly curriculum schedule per cohort (week number, skill name, canonical skillSlug, topic tags, start date). The interview setup wizard auto-filters question selection to skills whose `startDate <= today` when the associate belongs to a cohort with a curriculum. Adaptive gap-based weight pre-population composes on top of the filter. If no cohort or no curriculum exists, wizard behavior is identical to v1.0 (no regression).

Out of scope: curriculum cloning between cohorts (deferred to v1.2), curriculum-scoped gap computation, notifications when new weeks unlock, cached question-bank manifest (deferred — see D-19 patch).

</domain>

<decisions>
## Implementation Decisions

### Curriculum data model (from Phase 8, patched per Codex finding #9)
- **D-01:** `CurriculumWeek` in `prisma/schema.prisma` has fields `id`, `cohortId` (FK), `weekNumber` (Int), `skillName` (String — DISPLAY ONLY), `skillSlug` (String — CANONICAL MATCHER), `topicTags` (String[]), `startDate` (DateTime). The `skillSlug` column and `@@unique([cohortId, weekNumber])` constraint are added in Phase 8 per the patch.
- **D-02:** `weekNumber` naming convention matches GitHub question bank file paths. Documented contract, not code-enforced.

### Trainer curriculum UI
- **D-03:** Curriculum is managed per cohort via a table view inside the cohort detail page. Columns: Week #, Skill Name (display), Skill Slug (canonical), Topic Tags, Start Date, Actions.
- **D-04:** Add-week row: inline form with number input, text input (skillName display), text input (skillSlug canonical — lower-kebab-case suggested/autofilled from skillName but editable), tag input, date picker.
- **D-05:** Edit is inline. Delete is a confirm dialog.
- **D-06:** No bulk import in v1.1. No curriculum cloning.
- **D-07:** Styling uses DESIGN.md tokens.

### API surface
- **D-08:** `GET /api/cohorts/[id]/curriculum` — returns all weeks ordered by weekNumber.
- **D-09:** `GET /api/cohorts/[id]/curriculum?taught=true` — returns only weeks where `startDate <= now()`.
- **D-10:** `POST /api/cohorts/[id]/curriculum` — add a week. Body: `{ weekNumber, skillName, skillSlug, topicTags, startDate }`. Zod-validated. `skillSlug` required, lowercase-kebab regex.
- **D-11:** `PATCH /api/cohorts/[id]/curriculum/[weekId]` — update.
- **D-12:** `DELETE /api/cohorts/[id]/curriculum/[weekId]` — delete.
- **D-13:** All routes trainer-auth guarded.
- **D-24 (NEW per Codex #9):** The unique constraint `(cohortId, weekNumber)` is DB-enforced (Phase 8). API routes return 409 on violation with a clear message instead of a 500.

### Setup wizard filter integration (REVISED per Codex finding #9)
- **D-14:** On dashboard mount, if the entered associate slug maps to an associate with `cohortId != null`, fetch `/api/cohorts/{cohortId}/curriculum?taught=true` in parallel with the GitHub tech list fetch (`Promise.all`).
- **D-15 (REVISED):** Match GitHub path segments to curriculum rows using `skillSlug` with an EXACT (case-insensitive) comparison. Extract the first path segment: `tech.path.split('/')[0].toLowerCase()`; compare to `taughtSlugs.map(s => s.toLowerCase())` via `includes`. NO substring matching. This eliminates `sql` vs `postgresql`, `node` vs `nodejs`, `react` vs `react-native` ambiguity. `skillName` is NEVER used for matching — it's display text only.
- **D-16:** Adaptive weights apply AFTER curriculum filter.
- **D-17:** Fallback behavior (no regression): if associate has no `cohortId`, or cohort has no curriculum, or fetch errors, or `taughtSlugs` empty → show full unfiltered GitHub tech list. Silent failure (log warn).
- **D-18:** UI signal: "Filtered by cohort curriculum (N taught skills)" badge with dropdown of week names (display: skillName).

### Performance posture (REVISED per Codex finding #7)
- **D-19 (REVISED):** `<400ms` wizard load with curriculum filter active is a TARGET, NOT a release gate. Reason: the dominant latency source is the recursive GitHub question-bank discovery (`src/lib/github-service.ts` walks the repo), NOT the curriculum DB fetch. `Promise.all` only hides serial latency — it can't make recursive GitHub calls faster. A mocked Playwright perf assertion would validate client render speed only, not real system latency. The perf test in Plan 13-03 becomes ADVISORY (non-blocking). Future milestone: a cached/persisted question-bank manifest is the real fix. Tracked under `Deferred Ideas`.
- **D-20:** Curriculum fetch is a single indexed DB query (`WHERE cohortId = ? AND startDate <= now()`), expected <50ms — still true and still useful as a baseline.
- **D-21:** Playwright timing in Plan 13-03 measures wizard mount → tech list render. Test logs elapsed ms but does NOT assert < 400. The assertion becomes `expect(elapsed).toBeLessThan(2000)` as a sanity ceiling (not a perf gate). A real-infra perf benchmark is out of scope for v1.1.

### Composition with adaptiveSetup
- **D-22:** `mapGapScoresToWeights` called after curriculum filter. Gap scores for untaught skills silently dropped.
- **D-23:** Associates with gap scores for skills no longer in the taught list: those skills hidden from wizard; no warning.

### Claude's Discretion
- Exact tag input UX
- Visual design of the filter badge
- Sort order of taught weeks in the dropdown (weekNumber asc assumed)
- Error toast wording
- Whether the curriculum UI auto-suggests a slug from the skillName (nice UX polish)

</decisions>

<specifics>
## Specific Ideas

- Canonical `skillSlug` matches GitHub folder names exactly — e.g. a question bank folder `react/` maps to `skillSlug: "react"`. Trainer sees `skillName: "React"` as display.
- Filter badge should feel informative, not restrictive.
- `Promise.all` still used for wizard concurrency even though it is not a perf gate — general hygiene.

</specifics>

<canonical_refs>
## Canonical References

### Curriculum architecture
- `.planning/research/ARCHITECTURE.md` §curriculum
- `.planning/REQUIREMENTS.md` §Curriculum — CURRIC-01, CURRIC-02
- `.planning/ROADMAP.md` §"Phase 13"
- `.planning/PIPELINE-PLAN-CODEX.md` §Findings 7, 8, 9

### Phase 8 schema (foundation)
- `prisma/schema.prisma` — CurriculumWeek model with `skillSlug` + unique `(cohortId, weekNumber)` (Phase 8 patched)
- `.planning/phases/08-schema-migration/08-CONTEXT.md`

### Phase 11 cohort management
- `.planning/phases/11-cohort-management/`

### Adaptive setup (composition target)
- `src/lib/adaptiveSetup.ts` — `mapGapScoresToWeights`
- `src/app/dashboard/page.tsx`

### Question source
- `src/lib/github-service.ts` — GitHub fetch contract (`GitHubFile`); recursive discovery is the real perf bottleneck per Codex #7
- `src/lib/markdownParser.ts`

### Design
- `DESIGN.md`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/adaptiveSetup.ts::mapGapScoresToWeights`
- Phase 11 cohort CRUD routes — mirror auth + Zod pattern
- `src/app/api/associates/[slug]/gap-scores/route.ts` — Phase 7 fetch pattern

### Established Patterns
- Zod validation at API entry
- `Promise.all` for parallel async work (hygiene, not a perf gate)
- HttpOnly trainer cookie auth

### Integration Points
- Dashboard mount useEffect: add curriculum fetch to Promise.all
- After `availableTechs`, apply curriculum filter via `skillSlug` exact match
- Before `mapGapScoresToWeights`, filter gap scores to taught slugs

</code_context>

<deferred>
## Deferred Ideas

- Curriculum cloning between cohorts — v1.2 (CURRIC-FUTURE-01)
- Curriculum-scoped gap computation — v1.2 (CURRIC-FUTURE-02)
- Bulk CSV import — post-v1.1
- Notifications when new week taught — post-v1.1
- Per-session override to disable filter — post-v1.1
- **Cached question-bank manifest (the REAL fix for <400ms wizard load)** — later milestone per Codex finding #7. Server pre-discovers GitHub question-bank structure and caches; wizard loads the manifest in a single DB call; <400ms becomes achievable and enforceable.
- Upgrading `<400ms` from advisory to release gate — deferred until the cached manifest exists.

</deferred>

---

*Phase: 13-curriculum-schedule*
*Context gathered: 2026-04-14*
*Patched 2026-04-14 for Codex findings #7 (perf SLO → target), #8/#9 (canonical skillSlug matching)*
