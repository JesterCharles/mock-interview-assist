# Phase 30: Associate Curriculum View - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a read-only curriculum schedule view for associates. Grid layout with weeks as rows and topics as columns, color-coded by the 5-color score system. Current + prior week expanded by default, others collapsed. Banner at top showing unassessed topic count + mock CTA. Empty state for unassigned associates. Visualization only — adaptive interview logic and curriculum ingestion deferred to next milestone.

</domain>

<decisions>
## Implementation Decisions

### Schedule Layout
- **D-01:** Grid layout with week per row. Columns show topics side by side (not mapped to specific days since daily model is deferred). Each topic cell shows topic name + score color dot.
- **D-02:** Weekly granularity from existing CurriculumWeek model (topicTags[] as unordered group per week). No daily mapping in this phase.
- **D-03:** Topics color-coded using Phase 29's 5-color score system: Red (0-40%), Orange (41-60%), Yellow (61-79%), Green (80-89%), Blue (90-100%). Colors use existing semantic tokens + `--mastery`.
- **D-04:** Unassessed topics: grey dot + dashed border + question mark badge on hover showing "Not yet assessed — take a mock to evaluate".

### Collapsible Weeks
- **D-05:** Week rows are collapsible. Current week + prior week expanded by default. All other weeks collapsed. Click to expand/collapse any week.
- **D-06:** Progression goal: prior week topics should all be green by end of Friday, then next week opens. This is a display philosophy, not enforced logic.

### Mock Encouragement Banner
- **D-07:** Banner at top of curriculum view (not bottom) showing: "N topics unassessed this week — Take a mock" with CTA link to interview flow.
- **D-08:** Static banner for Phase 30 — no adaptive encouragement logic (exponential urgency based on topic density + days elapsed is deferred to next milestone).

### Time State Styling
- **D-09:** Past weeks: normal text, muted colors. Topic scores shown if assessed.
- **D-10:** Future weeks: lighter/muted treatment. Topics visible but clearly not yet reached.
- **D-11:** Current week highlight style: Claude's discretion (accent left border recommended).

### Empty State
- **D-12:** No cohort assigned: BookOpen icon (muted) + "You haven't been assigned to a cohort yet. Your trainer will add you when your cohort starts." No CTA.

### Scalability Constraint
- **D-13:** Grid design must accommodate next milestone's richer curriculum model (nested skill→topic structure, daily mapping, PDF curriculum ingestion) without full rewrite. Keep component boundaries clean.

### Claude's Discretion
- Current week highlight style (accent left border vs background tint)
- Grid column sizing and responsive behavior
- Collapse animation on week rows
- How week header displays when collapsed (week number, skill name, date range, topic count summary)
- Whether Fridays show "Review" or are omitted from topic columns

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Data Model
- `prisma/schema.prisma` — CurriculumWeek model (weekNumber, skillName, skillSlug, topicTags[], startDate, cohortId)
- `src/lib/curriculumService.ts` — Curriculum CRUD operations
- `src/lib/curriculumFilter.ts` — Curriculum-based tech filter (setup wizard context)

### Existing Trainer Curriculum UI (reference)
- `src/app/trainer/(settings)/settings/cohorts/[id]/curriculum/CurriculumManager.tsx` — Trainer's curriculum management UI. Associate view is read-only variant.

### Shell (Phase 27 dependency)
- Phase 27 D-04: Curriculum nav item with BookOpen icon. Placeholder "Coming soon" page to replace.

### Score Coloring (Phase 29 dependency)
- Phase 29 D-15/D-16/D-17: 5-color score system (Red/Orange/Yellow/Green/Blue). Apply to topic cells.

### Design System
- `DESIGN.md` — Layout, typography, color tokens
- `src/app/globals.css` — CSS custom properties including chart tokens and `--mastery`

### Requirements
- `.planning/REQUIREMENTS.md` §Curriculum View — CURRIC-01, CURRIC-02

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- CurriculumWeek Prisma model — query via `prisma.curriculumWeek.findMany({ where: { cohortId } })`
- curriculumService.ts — has listing/CRUD, reuse query patterns
- Associate dashboard page — auth guard pattern (`getCallerIdentity`, slug validation)
- Phase 27 placeholder page — replace with real curriculum component

### Established Patterns
- Server component page fetches data, passes to client components
- Cohort ID derived from associate's cohort assignment (never query params — STATE.md decision)
- Inline styles with CSS custom properties
- Empty state pattern from dashboard (centered text, muted color, surface background, border-subtle)

### Integration Points
- `/associate/[slug]/curriculum` route (or whatever Phase 27's placeholder established)
- Associate sidebar "Curriculum" nav item (BookOpen icon, Phase 27)
- Gap scores needed to color-code topics — join CurriculumWeek topics with GapScore data

</code_context>

<specifics>
## Specific Ideas

- Grid with week rows, topic columns. Collapsed/expanded per week.
- Current + prior week expanded by default.
- Score color dots on each topic cell matching Phase 29's 5-band system.
- Unassessed = grey dot + dashed border + hover tooltip with "?" and mock suggestion.
- Top banner: "N topics unassessed — Take a mock" CTA.
- Empty state: BookOpen icon + "not assigned to cohort" message.

</specifics>

<deferred>
## Deferred Ideas

- **Daily topic mapping model** — DayTopic model or structured JSON for accurate Mon-Fri topic assignment. Next milestone.
- **Adaptive mock encouragement** — Exponential urgency curve based on topic density and days elapsed since topic was taught. More encouragement as topics pile up unassessed. Dense-topic days get longer window. Next milestone.
- **Full curriculum ingestion** — PDF curriculum import, nested skill→topic hierarchy, trainer-side curriculum builder overhaul. Next milestone. User will provide PDF example.
- **Friday review/assessment logic** — Prior week should be all green by Friday; how to handle if not. Next milestone.

</deferred>

---

*Phase: 30-associate-curriculum-view*
*Context gathered: 2026-04-16*
