# Phase 34: SkillRadar Quality + VIZ Scope Reconciliation - Context

**Gathered:** 2026-04-17
**Status:** Ready for planning
**Mode:** `--auto` (unattended; all gray-area questions resolved with recommended defaults)

<domain>
## Phase Boundary

Close three v1.3 audit gaps around skill-trajectory visualization:

1. **VIZ-03 (cut)** — Reflect "per-skill LineChart is redundant given radar Before/Now overlay" decision in REQUIREMENTS.md (already done) and DESIGN.md trajectory section (radar is canonical).
2. **VIZ-06 (reconcile)** — Dashboard-wide skill filter text is reworded to match 2-component reality (SkillCardList + SkillRadar), with a stale `SkillTrendChart` comment at `AssociateDashboardClient.tsx:99` removed.
3. **VIZ-07 (new)** — Persist per-skill historical gap scores at session completion, and render the SkillRadar "Before" polygon from real snapshots instead of the synthetic `0.85 * current` / `baseDelta + axisDelta` approximation. Remove the "Est. prior is approximated..." disclosure caption.

Out of scope: new chart types, trend chart revival, multi-session history views, trainer-side radar changes, cohort-level snapshots.

</domain>

<decisions>
## Implementation Decisions

### Scope Reconciliation (VIZ-03 cut)

- **D-01:** REQUIREMENTS.md VIZ-03 already reflects the cut (strikethrough + CUT note — verified current). No additional requirement edit needed beyond confirming traceability row reads "Phase 34 | CUT (radar-primary)".
- **D-02:** DESIGN.md §Trajectory Language must add a one-line "radar-canonical" note stating the Before/Now radar overlay is the single trajectory visual on the associate dashboard, and per-skill line charts are intentionally out of scope. Placement: end of Trajectory Language subsection, as a standalone sentence or callout — `[auto] recommended: inline sentence at subsection end, no new heading`.
- **D-03:** Phase 29 CONTEXT.md decisions D-21, D-22, D-23 (per-skill trend chart) are left historically intact (not rewritten). Instead, Phase 34 CONTEXT.md records the supersession. `[auto] recommended: preserve prior CONTEXT.md immutably; downstream agents read ROADMAP.md + REQUIREMENTS.md as source of truth for current scope`.

### VIZ-06 Dashboard Filter Reconciliation

- **D-04:** Remove the stale comment on `AssociateDashboardClient.tsx:99` — `{/* Left column: FocusHero → SkillCardList → SkillTrendChart */}` becomes `{/* Left column: FocusHero → SkillCardList */}`. Single-line edit.
- **D-05:** Confirm `vizUtils.ts` docstring that references `SkillTrendChart` (line 4) is also updated to drop the reference — `[auto] recommended: strip SkillTrendChart name from docstring, leave SkillRadar`.
- **D-06:** No functional change to filter behavior. The 2-component sync (SkillCardList `selectedSkill` highlight + SkillRadar vertex/tick emphasis) already works per Phase 29 D-10, D-14. Phase 34 just deletes dead references.

### Schema Approach for Historical Snapshot (VIZ-07)

- **D-07:** Add `prevWeightedScore Float?` column to existing `GapScore` model (nullable). `[auto] recommended per phase brief: simpler, single migration, no new table or join]`.
- **D-08:** Column stores the `weightedScore` value that was in the row *before* the current upsert — i.e., the last-persisted score prior to the session that just completed. Semantics: "before = score as of the previous session", "now = score after the current session".
- **D-09:** On the very first session for a given (associateId, skill, topic) row (no prior value), `prevWeightedScore` is `null`. SkillRadar treats `null` as "no history yet" — renders only the Now polygon for that vertex (matching current `hasHistory` guard behavior).
- **D-10:** No migration backfill of historical `prevWeightedScore` for existing rows. `[auto] recommended: existing rows get null until their next upsert — avoids synthesizing data we explicitly want to stop synthesizing`. First session after Phase 34 ships populates `prevWeightedScore` from the current `weightedScore` before overwriting.
- **D-11:** New Prisma migration file (e.g., `20260418000000_add_gapscore_prev_score`) adding the nullable column. No index needed — column is only read alongside its parent row.

### Snapshot Write Moment (VIZ-07)

- **D-12:** Write the snapshot inline during `saveGapScores` in `src/lib/gapPersistence.ts`, immediately before/within the existing upsert. Flow: for each computed gap score, read the existing row's `weightedScore` → set `prevWeightedScore = existing.weightedScore` in the update payload → set new `weightedScore` to the computed value. Create path: `prevWeightedScore = null`. `[auto] recommended: inline with upsert per phase brief — atomic, no extra query round-trip if we pre-fetch existing rows in one findMany]`.
- **D-13:** Pre-fetch current rows once via `prisma.gapScore.findMany({ where: { associateId } })` before the Promise.all upsert loop — keys by `skill::topic` in a Map for O(1) lookup. Keeps upsert count identical to today (N) and adds one additional SELECT per save.
- **D-14:** The existing stale-record cleanup step (`deleteMany` for skill/topic rows no longer in the computed set) is unchanged. `prevWeightedScore` travels with the row; when a row is deleted the history is gone (acceptable — that skill is no longer being assessed).

### SkillRadar "Before" Polygon Sourcing (VIZ-07)

- **D-15:** `GapScoreEntry` (in `src/lib/trainer-types.ts`) gains an optional `prevWeightedScore: number | null` field. Dashboard page query in `src/app/associate/[slug]/dashboard/page.tsx` (and any other caller feeding SkillRadar) selects the new column.
- **D-16:** `SkillRadar` computes `before` as:
  - `prevWeightedScore != null` → `Math.round(prevWeightedScore * 100)` (real snapshot)
  - `prevWeightedScore == null` → treat as no-history for that vertex; fall back to `now` and exclude that axis from contributing to the Before polygon rendering. `[auto] recommended: keep vertex visible, but only render the Before polygon if at least one axis has real history — otherwise hide Before entirely]`.
- **D-17:** `hasHistory` flag is recomputed from data: `hasHistory = radarData.some(d => d.prevWeightedScore != null)`. The old overall-session-count heuristic (`scoredSessionCount >= 2`) is removed along with `baseDelta` and `axisDelta` and `associateSig` — all synthetic-prior code is deleted.
- **D-18:** In topic mode (`isTopicMode === true`), the same column powers topic-level before polygons since `GapScore` rows are keyed on `(associateId, skill, topic)` — topics already have their own rows. No additional schema surface needed.

### Removed Code / Captions

- **D-19:** Delete the italic caption block at `SkillRadar.tsx:346-359` starting "Est. prior is approximated from overall session trend…". Replaced with nothing — real snapshots don't need a disclaimer.
- **D-20:** Delete `axisDelta`, `hashStr`, `clamp01`, `baseDelta` useMemo, `associateSig` useMemo, and `scoredSessionCount` useMemo from `SkillRadar.tsx`. These only supported the synthetic prior.
- **D-21:** Keep the two-session legend behavior governed by `hasHistory` — but now `hasHistory` is derived from real snapshot presence, not session count.

### Test Coverage

- **D-22:** New unit test for `saveGapScores` verifying: (a) first upsert leaves `prevWeightedScore` null, (b) second upsert captures the prior `weightedScore`, (c) cleanup of stale skills still works, (d) concurrent skills each get their own prior correctly. `[auto] recommended: extend existing gapPersistence test file if present, otherwise create src/lib/__tests__/gapPersistence.test.ts]`.
- **D-23:** Component test / integration test for `SkillRadar` verifying: (a) Before polygon hidden when all `prevWeightedScore` values are null, (b) Before polygon rendered when at least one axis has a real prior, (c) "Est. prior is approximated…" caption no longer present in the rendered DOM.
- **D-24:** Retain / verify existing 2-component filter sync tests pass unchanged (Phase 29 acceptance). If no explicit integration test covers SkillCardList↔SkillRadar selectedSkill sync today, add a minimal one in phase 34 to lock VIZ-06 reconciled behavior. `[auto] recommended: add a small dashboard-level test that flips selectedSkill and asserts both SkillCardList card highlight + SkillRadar tick/vertex emphasis]`.

### Claude's Discretion

- Exact Prisma migration filename timestamp (standard convention: next sequential `YYYYMMDDHHMMSS_add_gapscore_prev_score`).
- Whether the fallback "no history yet" state on a single vertex in topic mode renders a dot at the Now value (recommended: yes, same as current Now-only rendering).
- Phrasing of the new DESIGN.md §Trajectory Language radar-canonical sentence (one line, follows existing tone).
- Minor refactor scope around `SkillRadar` while deleting synthetic-prior code (e.g., whether to split CustomTooltip out — not required; keep inline).
- Ordering of the two plans (schema+persistence first, then radar integration — matches phase brief "2 plans" hint).

### Folded Todos

None — no pending todos matched Phase 34 scope in the backlog scan.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap (source of truth for current scope)
- `.planning/REQUIREMENTS.md` §Data Visualization — VIZ-03 (cut), VIZ-06 (reconciled), VIZ-07 (new)
- `.planning/ROADMAP.md` §Phase 34 — Goal, Success Criteria, Depends on
- `.planning/v1.3-MILESTONE-AUDIT.md` — Original gap-closure motivation (if present); confirms VIZ regression details

### Phase 29 (dependency — do NOT rewrite, read for context)
- `.planning/phases/29-associate-data-visualization/29-CONTEXT.md` §Radar Plot (D-12, D-13, D-14), §Per-Skill Trend Chart (D-21–D-23 — superseded), §Dashboard Skill Filter (D-09, D-10, D-11)

### Schema & Persistence
- `prisma/schema.prisma` §model GapScore (lines 66-79) — target of the new nullable column
- `prisma/migrations/` — existing migration sequence (last sequential is `20260416000000_add_profile`)
- `src/lib/gapPersistence.ts` — `saveGapScores` is the snapshot write point
- `src/lib/gapService.ts` — `computeGapScores` (pure algorithm; untouched)
- `src/lib/trainer-types.ts` — `GapScoreEntry` type gains `prevWeightedScore`

### SkillRadar Component
- `src/components/associate/SkillRadar.tsx` — full rewrite of the synthetic-prior paths (D-19, D-20); keep polygon/tooltip styling
- `src/app/associate/[slug]/dashboard/page.tsx` — server query feeding SkillRadar; ensure `prevWeightedScore` is selected
- `src/app/associate/[slug]/dashboard/AssociateDashboardClient.tsx` §line 99 — stale SkillTrendChart comment removed
- `src/lib/vizUtils.ts` §line 4 — docstring SkillTrendChart reference removed

### Design System
- `DESIGN.md` §Trajectory Language — radar-canonical sentence added
- `src/app/globals.css` — no changes needed (chart tokens already cover radar polygons)

### Tests
- `src/lib/__tests__/gapService.test.ts` — existing gap-service test; adjacent location for `gapPersistence.test.ts` if created
- `src/app/associate/[slug]/dashboard/page.test.tsx` — dashboard integration test; extend or add sibling for VIZ-06 filter sync

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `GapScore` Prisma model — add single nullable column, no new relations
- `saveGapScores` in `gapPersistence.ts` — already has pre-fetch pattern (`existingScores` findMany for cleanup); extend same findMany to cover the prior-value read without adding a second round-trip
- `SkillRadar` structure (tooltip, CustomTick, topic/skill modes, hasHistory gating) is sound — only the `before` derivation changes
- Prisma client singleton (`src/lib/prisma.ts`) — unchanged

### Established Patterns
- Dual-write file+Supabase persistence at session completion (sessionPersistence → gapPersistence → readinessService cascade already exists)
- Prisma migrations are additive + idempotent; nullable columns deploy cleanly over existing data
- GapScoreEntry is the client/server boundary type — changes here ripple to all consumers
- Tests live in `src/lib/__tests__/` or colocated `*.test.ts(x)`; Vitest is configured

### Integration Points
- `gapPersistence.saveGapScores` — reads existing rows, computes new scores, upserts. Snapshot write slots naturally between read and update.
- SkillRadar's `RadarDataPoint` interface — gains no new prop (before is still rendered), but source of `before` changes
- Prisma generated client regen (`prisma generate`) required after schema change — Dockerfile already runs this in build
- Server component `page.tsx` selects gap scores — ensure new column is in the select/shape if explicit selects are used

</code_context>

<specifics>
## Specific Ideas

- User/phase brief explicitly recommends `prevWeightedScore` column over `GapScoreHistory` table — "simpler, single migration". Followed.
- Phase brief explicitly says "write gap score snapshots during GapScore upsert in gapPersistence.ts". Followed (D-12, D-13).
- The synthetic-prior code in SkillRadar (`axisDelta`, `baseDelta`, `associateSig`, `hashStr`) is fully removed — not left as fallback. Per-skill "no history" renders Now-only at that vertex and hides the Before polygon when no axis has history (D-16, D-17).
- "Est. prior is approximated…" caption (SkillRadar.tsx:346-359) is deleted, not reworded — real snapshots don't warrant an explanation (D-19).
- No retrospective backfill of `prevWeightedScore` for existing GapScore rows (D-10) — Phase 34 explicitly stops synthesizing; waiting one session per associate to populate is correct behavior.

</specifics>

<deferred>
## Deferred Ideas

- Multi-snapshot history (N previous scores for longer-range trajectory) — deferred; `prevWeightedScore` column is single-value by design. Future phase could add `GapScoreHistory` table if trajectory charts beyond Before/Now are requested.
- Trainer-side radar or radar on trainer associate-detail — out of scope (trainer already reuses `AssociateDashboardClient` per Phase 32 D-03, so this phase's changes propagate automatically; no extra work).
- Cohort-level radar snapshots — deferred (COHORT-05 backlog).
- Per-session snapshot timing precision (exact session IDs attached to snapshots) — deferred; current design only needs "value before most recent computation", not full audit trail.

### Reviewed Todos (not folded)
None — no todos surfaced from the backlog scan for Phase 34.

</deferred>

---

*Phase: 34-skill-radar-quality*
*Context gathered: 2026-04-17 (--auto mode)*
