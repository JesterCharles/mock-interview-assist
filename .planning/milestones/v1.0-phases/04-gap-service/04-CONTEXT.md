# Phase 4: Gap Service - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Compute meaningful skill and topic gaps per associate using recency-weighted scoring. Two levels: skill-level (e.g., React) and topic-level within each skill (e.g., hooks, state management). Uses 0.8 decay factor. Requires 3+ sessions before displaying scores.

</domain>

<decisions>
## Implementation Decisions

### Gap Algorithm
- **D-01:** Recency-weighted average: `score_n * 0.8^0 + score_(n-1) * 0.8^1 + ...` normalized by sum of weights. Computed per skill and per topic within each skill. As documented in CLAUDE.md §Gap Tracking Algorithm.

### Topic Source
- **D-02:** Topic tags derived from question bank Markdown metadata. The markdown parser (`src/lib/markdownParser.ts`) already extracts question data — topics come from the file path/name structure in the GitHub repo (each file = one technology/skill area). Within files, keywords serve as topic-level tags.

### Score Extraction
- **D-03:** Per-question scores come from the `assessments` JSON stored in Phase 2. Use `finalScore` (trainer-validated) when available, fall back to `llmScore`. Map each question's score to its skill (from which tech file it came) and topics (from keywords).

### Computation Timing
- **D-04:** Gap scores computed on session save (not on dashboard load). Stored as denormalized records in a `GapScore` table. Updated whenever a new session is saved for an associate. This keeps dashboard reads fast.

### 3-Session Gate
- **D-05:** Associates with fewer than 3 completed sessions show a placeholder message instead of gap scores. The gate check is a simple count query, not part of the gap calculation itself.

### Gap Score Storage
- **D-06:** New `GapScore` Prisma model: associateId, skill, topic (nullable for skill-level scores), weightedScore, sessionCount, lastUpdated. Composite unique on (associateId, skill, topic).

### Claude's Discretion
- Whether to compute gaps as a service function or API route
- Normalization approach for scores across different question difficulties
- Whether to store raw score history or just the weighted aggregate

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Algorithm
- `CLAUDE.md` §Gap Tracking Algorithm — 0.8 decay coefficient, readiness signal formula, recommended area logic

### Existing Code
- `src/lib/markdownParser.ts` — Parses question bank Markdown, extracts keywords and difficulty
- `src/lib/types.ts` — `ParsedQuestion` (has keywords, difficulty), `QuestionAssessment` (has finalScore, llmScore)
- `src/lib/langchain.ts` — Scoring workflow that produces llmScore/llmFeedback

### Prior Phase Decisions
- `.planning/phases/02-session-persistence/02-CONTEXT.md` — Session schema, assessments as JSON column
- `.planning/phases/03-associate-profiles/03-CONTEXT.md` — Associate model, slug-based identity

### Requirements
- `.planning/REQUIREMENTS.md` — GAP-01 (two-level tracking), GAP-02 (recency-weighted), GAP-03 (3-session gate), GAP-04 (topic tags from metadata)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/markdownParser.ts` — Already extracts keywords per question (usable as topic tags)
- `src/lib/github-service.ts` — File paths map to skills (e.g., `react.md` → React skill)

### Established Patterns
- Service modules in `src/lib/` — gap computation fits as `src/lib/gapService.ts`
- Async per-question scoring pattern in langchain.ts — gap computation is similar (async post-processing)

### Integration Points
- Session save (Phase 2 dual-write) triggers gap recalculation
- Associate model (Phase 3) provides the identity to score against
- Prisma schema — new GapScore model
- Question metadata maps to skill/topic taxonomy

</code_context>

<specifics>
## Specific Ideas

No specific requirements — algorithm fully specified in CLAUDE.md.

</specifics>

<deferred>
## Deferred Ideas

- Autoresearch optimization of the 0.8 decay factor — noted for post-MVP optimization loop
- Cross-associate gap comparison — future dashboard feature

</deferred>

---

*Phase: 04-gap-service*
*Context gathered: 2026-04-13*
