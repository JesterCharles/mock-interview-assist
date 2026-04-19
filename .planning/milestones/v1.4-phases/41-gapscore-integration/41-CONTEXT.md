# Phase 41: GapScore Integration & Trainer Visibility - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning
**Mode:** `--auto`

<domain>
## Phase Boundary

Connect coding attempts to the existing GapScore pipeline with difficulty-weighted signals and surface a per-associate coding panel on the trainer dashboard. Document readiness math updates in DESIGN.md + PROJECT.md.

**In scope:**
- `gapPersistence.ts` extension: consume `CodingSkillSignal` rows, feed them into existing 0.8-decay recency-weighted average alongside interview signals
- Difficulty weighting: easy × 0.7, medium × 1.0, hard × 1.3 multiplier on `mappedScore` before it enters gap math (prevents easy-attempt farming)
- Trainer dashboard `/trainer/[slug]` extension: new "Coding" tab or panel showing attempt history list + per-skill coding-specific bar chart
- Fire-and-forget signal-to-GapScore trigger from Phase 39's poll handler (already writes `CodingSkillSignal`; Phase 41 wires GapScore recompute from that signal)
- DESIGN.md + PROJECT.md readiness-math section: explicit explanation of interview-vs-coding signal weighting

**Out of scope (other phases):**
- Backfill of pre-v1.4 cohort coding data → deferred (v1.5 nice-to-have; noted as open question in discovery)
- SQL dialect reporting → Phase 42
- Readiness sweep schedule change → not needed; existing sweep picks up the new GapScore rows

</domain>

<decisions>
## Implementation Decisions

### Signal → GapScore Wiring (locked)
- **D-01:** Extend `src/lib/gapPersistence.ts` with `persistCodingSignalToGapScore(signal: CodingSkillSignalRow, challenge: {difficulty})`. Called fire-and-forget from Phase 39's poll handler once verdict resolves.
- **D-02:** Calculation: `weightedScore = mappedScore × difficultyMultiplier[difficulty] × signalWeight`. `difficultyMultiplier`: easy 0.7, medium 1.0, hard 1.3. Exported constant `DIFFICULTY_MULTIPLIERS` in `gapPersistence.ts`.
- **D-03:** GapScore row keyed on `(associateId, skill, topic)`. Topic for coding signals = `coding:<language>` (e.g., `coding:python`). Skill = `challenge.skillSlug`. This lets gap scores distinguish "python-in-code" signal from "python-in-interview" signal if trainers want to slice — default trainer view aggregates them.

### Recency-Weighted Feed (locked — no algorithm change)
- **D-04:** Feed the weighted coding score into existing `gapService.recomputeGapScore()` algorithm — which already does 0.8 decay across the per-(skill, topic) history. NO changes to gapService.ts (Phase 36 said so, Phase 41 respects).
- **D-05:** Readiness sweep (`readinessSweep.ts`) picks up the new GapScore rows automatically — associate's `lastComputedAt` is stale or new session/attempt triggers recompute. No sweep changes needed.

### Trainer Dashboard Panel
- **D-06:** `/trainer/[slug]` gets a new "Coding" tab (or collapsible panel below existing sessions panel — planner picks based on existing page layout). Shows:
  - Latest 20 attempts (table: date, challenge title, language, difficulty, verdict, score)
  - Per-skill coding bar chart (reuses recharts setup — bar per skillSlug, value = recency-weighted coding-only gap score)
  - Filter: by language, by skillSlug
- **D-07:** New API route `GET /api/trainer/[slug]/coding` — returns `{ attempts: [...], codingSkillScores: [{skillSlug, score, attemptCount}] }`. Trainer-only via `getCallerIdentity()`.

### Readiness Math Documentation (locked — required)
- **D-08:** `PROJECT.md` v1.4 section gets a "Readiness math with coding signals" subsection. Explain: coding signals use same 0.8-decay as interview signals, plus difficulty multiplier, plus signal-type weight from Phase 36. Worked example (one associate with mixed interview + coding history) included.
- **D-09:** `DESIGN.md` gets a "Trainer dashboard: coding panel" section documenting the visual hierarchy + why the coding panel lives adjacent to (not merged with) interview panel. Rationale: trainers need to diagnose "is this gap coming from coding or interview" before remediating.

### Backfill Decision
- **D-10:** No retroactive backfill of existing 3-per-cohort coding data in v1.4. Reason: legacy data was manually administered without Judge0 — no reliable verdict mapping. Note in PROJECT.md as a v1.5 open item.

### Claude's Discretion
- Tab vs panel for dashboard integration — planner inspects existing `/trainer/[slug]` layout
- Coding bar chart color distinct from interview bar chart color — picks from DESIGN palette
- Attempt pagination on trainer panel (20 with "load more" vs full infinite) — planner picks

### Folded Todos
None.

</decisions>

<canonical_refs>
## Canonical References

### Milestone-level
- `.planning/REQUIREMENTS.md` §CODING-SCORE-01..04
- `.planning/ROADMAP.md` §Phase 41
- `.planning/phases/36-data-model-schema/36-CONTEXT.md` — `CodingSkillSignal` contract, `codingSignalService.mapSignalToScore`
- `.planning/phases/39-execution-api/39-CONTEXT.md` — fire-and-forget signal writeback from poll handler
- `DESIGN.md` — dashboard panel styling; chart color palette
- `PROJECT.md` — readiness math section to extend

### Existing code
- `src/lib/gapService.ts` — recency-weighted algorithm (DO NOT modify — extend usage only)
- `src/lib/gapPersistence.ts` — persistence layer (extend with coding-aware function)
- `src/lib/readinessService.ts` — classification (no changes)
- `src/lib/readinessSweep.ts` — background sweep (no changes)
- `src/app/trainer/[slug]/page.tsx` — add panel/tab
- `src/app/api/trainer/[slug]/route.ts` — may be refactored to split attributes or add new coding route
- Recharts usage — existing trend-line pattern to mirror

### Explicitly out-of-scope
- `src/lib/gapService.ts` modifications
- SQL dialect reporting — Phase 42

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `gapService.ts` recency-weighted algorithm — consumes `{skillSlug, rawScore, weight}` tuples and returns decay-weighted average
- `gapPersistence.ts` — DB write pattern; readiness recompute follow-up
- `readinessSweep.ts` — picks up stale associates on schedule (no change)
- recharts chart utilities from Phase 29 — can be reused for coding bar chart

### Established Patterns
- Fire-and-forget side effects wrapped in try/catch with log-only error handling (precedent: session persistence → gap score)
- Trainer dashboard panels use server-component pages + client islands for interactive charts
- DESIGN.md is read-only source of truth — any new tokens require explicit addition + review

### Integration Points
- Phase 39's poll handler fires `codingSignalService.mapSignalToScore()` → writes CodingSkillSignal row. Phase 41 adds a second fire-and-forget that ALSO calls `persistCodingSignalToGapScore` at the same point.
- Trainer dashboard loads from `/api/trainer/[slug]` — this phase adds a sibling route for coding attempts data.

### Known Constraints
- GapScore recompute must complete within 5 sec of attempt verdict per CODING-SCORE-01 — fire-and-forget means we surface staleness briefly but pipeline catches up quickly
- No modifications to interview scoring path — coding feeds the SAME pipeline without changing its existing behavior

</code_context>

<specifics>
## Specific Ideas

- CODING-SCORE-02: "difficulty-weighted so easy-attempt farming cannot inflate readiness" — D-02 multiplier table is the exact mechanism
- CODING-SCORE-03: per-associate coding panel on trainer dashboard — D-06
- CODING-SCORE-04: DESIGN.md + PROJECT.md doc update — D-08 + D-09
- Codex discovery §7: "Readiness gameable by easy attempts unless signal source + difficulty are weighted" — D-02 addresses; signal-type weight comes from Phase 36

</specifics>

<deferred>
## Deferred Ideas

- **Backfill of pre-v1.4 coding data** — v1.5 open question per discovery
- **Per-language readiness breakdown on associate-facing UI** — v1.5
- **Coding signal decay cap** (e.g., clamp so single attempt can only move gap by N points) — v1.5 tuning
- **Trainer alerts when coding gap exceeds threshold** — v1.5+

### Reviewed Todos (not folded)
None.

</deferred>

---

*Phase: 41-gapscore-integration*
*Context gathered: 2026-04-18 (auto)*
