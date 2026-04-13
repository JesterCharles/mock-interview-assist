# Phase 5: Readiness Signals - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Compute a readiness signal per associate and surface the next recommended practice area. Readiness badge (ready / improving / not ready) and practice recommendation update on every session save.

</domain>

<decisions>
## Implementation Decisions

### Readiness Formula
- **D-01:** Ready = 75% weighted avg + 3+ sessions + non-negative trend (slope of last 3 sessions >= 0). As specified in CLAUDE.md and READY-01.

### Badge States
- **D-02:** Three states: "ready" (meets all criteria), "improving" (3+ sessions with positive trend but below threshold), "not ready" (below threshold or negative trend or < 3 sessions).

### Recommended Practice Area
- **D-03:** Lowest weighted gap score topic = recommended next practice area. Displayed per associate. As specified in READY-02.

### Configurable Threshold
- **D-04:** Readiness threshold (default 75%) stored in a `Settings` table or config record. Trainer can change via a settings UI. Changing threshold recalculates all badges. As per READY-03.

### Computation & Storage
- **D-05:** Readiness signal computed on session save (same trigger as gap scores in Phase 4). Stored as fields on the Associate model: `readinessStatus`, `recommendedArea`, `lastComputedAt`. Pre-computed so dashboard reads are instant (DASH-05).

### Claude's Discretion
- Settings UI location (inline on dashboard vs separate /settings page)
- "Improving" state exact criteria (positive trend interpretation)
- Whether to show trend direction icon alongside badge

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Algorithm
- `CLAUDE.md` §Gap Tracking Algorithm — readiness signal formula, recommended area logic

### Prior Phase Decisions
- `.planning/phases/04-gap-service/04-CONTEXT.md` — Gap score computation, GapScore model, 3-session gate

### Requirements
- `.planning/REQUIREMENTS.md` — READY-01, READY-02, READY-03

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Gap scores from Phase 4 — readiness computation reads from GapScore table

### Established Patterns
- Computation-on-save pattern (same as gap scores)

### Integration Points
- Session save pipeline (Phase 2 → Phase 4 gap computation → Phase 5 readiness computation)
- Associate model — add readinessStatus, recommendedArea fields
- Settings table — new model for trainer-configurable thresholds
- Dashboard (Phase 6) — reads pre-computed badges

</code_context>

<specifics>
## Specific Ideas

No specific requirements — algorithm fully specified in requirements and CLAUDE.md.

</specifics>

<deferred>
## Deferred Ideas

- Notification when associate moves to "ready" status — future feature
- Historical readiness timeline — future dashboard enhancement

</deferred>

---

*Phase: 05-readiness-signals*
*Context gathered: 2026-04-13*
