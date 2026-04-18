# Phase 34: SkillRadar Quality + VIZ Scope Reconciliation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `34-CONTEXT.md` — this log preserves the alternatives considered and auto-mode selections.

**Date:** 2026-04-17
**Phase:** 34-skill-radar-quality
**Mode:** `--auto` (unattended — Claude auto-selected recommended defaults per phase brief)
**Areas discussed:** VIZ-03 Scope Cut Propagation, VIZ-06 Stale References, Schema Approach, Snapshot Write Timing, SkillRadar Before Derivation, Synthetic-Prior Code Removal, Test Coverage

---

## VIZ-03 Scope Cut Propagation

**Gray area:** REQUIREMENTS.md already strikes VIZ-03; DESIGN.md trajectory section and prior Phase 29 CONTEXT.md still reference the per-skill line chart. How to propagate the cut?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline sentence in DESIGN.md §Trajectory Language marking radar as canonical | Minimal edit — one line, no new heading | ✓ |
| New DESIGN.md subsection "Radar-Canonical Policy" | Heavier doc surface for a single decision | |
| Rewrite Phase 29 CONTEXT.md to strike VIZ-03 decisions | Rewrites history; breaks immutability of prior context | |
| Leave as-is — REQUIREMENTS.md cut is enough | Leaves DESIGN.md out of sync; phase brief explicitly asks for DESIGN.md update | |

**Auto selection:** Inline sentence in DESIGN.md §Trajectory Language (D-02) + preserve Phase 29 CONTEXT.md immutably (D-03). Matches phase brief success criterion #1.

**Notes:** Phase brief: *"VIZ-03 scope cut reflected in REQUIREMENTS.md + DESIGN.md trajectory section (radar canonical)"*. REQUIREMENTS.md row already correct (verified). DESIGN.md line-level edit is the remaining work.

---

## VIZ-06 Stale References

**Gray area:** `AssociateDashboardClient.tsx:99` comment mentions `SkillTrendChart`; `vizUtils.ts:4` docstring also mentions it. How much dead-reference cleanup fits in Phase 34?

| Option | Description | Selected |
|--------|-------------|----------|
| Remove both the line-99 comment and the vizUtils.ts docstring reference | Full cleanup of string references; no orphaned code | ✓ |
| Remove only the AssociateDashboardClient.tsx:99 comment (as phase brief calls out) | Matches success-criteria literal wording; leaves vizUtils docstring stale | |
| Add a TODO to delete later | Leaves scope-drift bait for future audit | |

**Auto selection:** Full cleanup — both references removed (D-04, D-05). Phase brief success criterion #2 calls out the specific line but the intent is "no stale SkillTrendChart refs"; catching the vizUtils docstring in the same pass keeps future audits clean.

---

## Schema Approach — prevWeightedScore column vs GapScoreHistory table

**Gray area:** Where to persist per-skill historical snapshots?

| Option | Description | Selected |
|--------|-------------|----------|
| Add nullable `prevWeightedScore Float?` column on existing `GapScore` model | Single migration, single-value snapshot, matches current Before/Now radar needs exactly | ✓ |
| New `GapScoreHistory` table (associateId, skill, topic, weightedScore, recordedAt) | Supports multi-snapshot history; overkill for Before/Now only; adds a migration + join + retention policy | |
| JSON array column on GapScore (snapshot log) | Hard to query, fights Prisma typing | |

**Auto selection:** `prevWeightedScore` column (D-07). Phase brief explicitly recommends this: *"RECOMMEND: prevWeightedScore column — simpler, single migration"*.

**Notes:** Multi-snapshot history captured as **deferred** in CONTEXT.md — future phase can add `GapScoreHistory` if trajectory views beyond Before/Now are requested.

---

## Snapshot Write Timing

**Gray area:** When to capture the prior weightedScore — during upsert, in a post-save hook, or as a DB trigger?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline in `saveGapScores` — pre-fetch existing rows once, write old value into `prevWeightedScore` as part of the update payload | Atomic per associate; reuses existing findMany for cleanup; phase brief's explicit recommendation | ✓ |
| Separate function called after `saveGapScores` | Risk of partial writes; two round-trips of findMany | |
| Postgres trigger (BEFORE UPDATE) | Adds DB-side logic; harder to test; harder to evolve with Prisma schema | |

**Auto selection:** Inline in saveGapScores (D-12, D-13). Phase brief: *"Write gap score snapshots during GapScore upsert in gapPersistence.ts"*. Pre-fetch pattern already exists for cleanup step — extend it.

---

## SkillRadar Before Derivation

**Gray area:** What does the "Before" polygon render when some vertices have real history (`prevWeightedScore != null`) and others don't?

| Option | Description | Selected |
|--------|-------------|----------|
| Render Before polygon only if ≥1 axis has real history; axes with null prior contribute their `now` value (no visual bump at that vertex) | Honest — no synthesized prior anywhere; polygon visible once real data exists | ✓ |
| Hide Before polygon entirely unless ALL axes have priors | Delays usefulness of the overlay by N sessions per associate | |
| Synthesize prior for null vertices using overall-session delta (current behavior) | This is exactly what Phase 34 is removing | |

**Auto selection:** Option 1 (D-16, D-17). Aligns with phase brief: *"Before polygon renders from real snapshots not 0.85*current"*. `hasHistory` derived from data presence.

---

## Synthetic-Prior Code Removal Scope

**Gray area:** How much of the current synthetic-prior machinery to delete?

| Option | Description | Selected |
|--------|-------------|----------|
| Delete `axisDelta`, `hashStr`, `clamp01`, `baseDelta` useMemo, `associateSig` useMemo, `scoredSessionCount` useMemo, and "Est. prior is approximated…" caption | Full cleanup — no dead code, no misleading disclaimer | ✓ |
| Keep helpers as internal utilities in case snapshots lag | Dead code; contradicts "real snapshots are the source of truth" | |
| Delete caption but keep helpers behind a feature flag | Adds flag plumbing for code we don't use | |

**Auto selection:** Full deletion (D-19, D-20, D-21). Phase brief success criteria #4 and #5 mandate both: real polygon + caption removal.

---

## Test Coverage

**Gray area:** Which tests to add/update?

| Option | Description | Selected |
|--------|-------------|----------|
| (a) `gapPersistence` unit test for prevWeightedScore lifecycle + (b) SkillRadar test for Before polygon presence/absence + (c) VIZ-06 filter sync test | Covers all 3 success criteria that reference tests | ✓ |
| Only gapPersistence test | Leaves radar rendering untested for the new data path | |
| Only SkillRadar test | Leaves persistence layer untested | |

**Auto selection:** All three (D-22, D-23, D-24). Phase brief success criterion #6: *"2-component filter sync tests continue to pass"* — if none exists explicitly, Phase 34 adds one to lock reconciled VIZ-06 behavior.

---

## Claude's Discretion

Captured in CONTEXT.md §Claude's Discretion:
- Prisma migration filename timestamp
- Exact DESIGN.md trajectory sentence wording
- Topic-mode single-vertex Now-only rendering style
- Minor refactor scope during synthetic-prior deletion
- Plan ordering (schema+persistence first, then radar integration)

## Deferred Ideas

- `GapScoreHistory` table for multi-snapshot history
- Trainer-side radar enhancements (auto-inherits via AssociateDashboardClient reuse per Phase 32)
- Cohort-level radar snapshots (COHORT-05 backlog)
- Per-session snapshot timing precision with session ID attachment
