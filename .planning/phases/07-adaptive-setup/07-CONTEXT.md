# Phase 7: Adaptive Setup - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Mock setup wizard pre-populates technology selections and weights from an associate's gap history. Trainer retains full override control. Associates with no gap history (< 3 sessions) fall back to existing manual setup.

</domain>

<decisions>
## Implementation Decisions

### Pre-Population Logic
- **D-01:** When trainer enters an associate slug in setup wizard (Phase 3 addition), fetch that associate's gap scores. Pre-select technologies where the associate has been tested. Set weights inversely proportional to gap scores (weaker areas get higher weight = more questions).

### Weight Mapping
- **D-02:** Gap score → weight mapping: lowest gap score skill gets weight 5, highest gets weight 1. Linear interpolation between. This ensures weak areas get more practice questions.

### Trainer Override
- **D-03:** All pre-selected technologies and weights are editable. Trainer can add/remove techs and adjust any weight. Pre-population is a suggestion, not a lock. Existing manual controls remain fully functional.

### Cold Start Fallback
- **D-04:** Associates with < 3 sessions (no gap data) → setup wizard works exactly as it does today (full manual mode). No error, no placeholder — just normal setup flow.

### Slug Lookup Trigger
- **D-05:** Pre-population triggers after slug input loses focus (onBlur) or on explicit "Load history" action. Brief loading state while fetching gap scores. If slug not found, treat as new associate (manual mode).

### Claude's Discretion
- Exact UI for indicating pre-populated vs manually-set weights
- Animation/transition when pre-population fills in
- Whether to show a summary of gap scores alongside the selections

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Code
- `src/app/dashboard/page.tsx` — Setup wizard with tech selection and weight controls
- `src/store/interviewStore.ts` — `selectedTechs`, `techWeights`, `setTechWeight` — the state that gets pre-populated

### Prior Phase Decisions
- `.planning/phases/03-associate-profiles/03-CONTEXT.md` — Slug input in setup wizard
- `.planning/phases/04-gap-service/04-CONTEXT.md` — GapScore model, skill/topic scores

### Design System
- `DESIGN.md` — Visual styling for pre-populated state indicators

### Requirements
- `.planning/REQUIREMENTS.md` — GAP-05 (adaptive mock setup)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/store/interviewStore.ts` — `setSelectedTechs`, `setTechWeight` actions already exist for manual selection
- Dashboard setup wizard Phase 2 — tech selection UI already built

### Established Patterns
- Zustand store actions called from UI components
- GitHub file listing for available techs (`src/lib/github-service.ts`)

### Integration Points
- Dashboard setup wizard Phase 2 (tech selection) — add pre-population on slug input
- Dashboard setup wizard Phase 3 (candidate info) — slug field added in Phase 3
- New API endpoint or server action to fetch gap scores by slug
- Zustand store — pre-populate `selectedTechs` and `techWeights`

</code_context>

<specifics>
## Specific Ideas

No specific requirements — straightforward integration of gap data into existing setup flow.

</specifics>

<deferred>
## Deferred Ideas

- Difficulty-level adaptation (not just tech/weight but also beginner/intermediate/advanced distribution) — future enhancement
- Suggested question count based on gap severity — future feature

</deferred>

---

*Phase: 07-adaptive-setup*
*Context gathered: 2026-04-13*
