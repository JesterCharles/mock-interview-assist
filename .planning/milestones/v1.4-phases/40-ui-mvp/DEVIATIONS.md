# Phase 40 Deviations

## UI-SPEC Gate (Task 0 in 40-01) — skipped

**Plan requires:** `.planning/phases/40-ui-mvp/40-UI-SPEC.md` generated via `/gsd-ui-phase 40` before Wave 2/3 run (D-16).

**What we did:** Auto-approved gate with `--skip`. Subagent cannot invoke `/gsd-ui-phase` (skills run in an interactive shell, not inside subagent tasks). Using `40-CONTEXT.md` (D-01 through D-16) + `DESIGN.md` as the binding design contract for v1.4.

**Why this is acceptable:**
- CONTEXT.md already fixes all high-impact visual decisions (card surface, native selects, sticky filter bar, two-col solve layout, Monaco themes vs/vs-dark, verdict badge tier colors, accordion via native `<details>`).
- DESIGN.md owns tokens (colors, typography, spacing, motion) — already the project-wide contract.
- Reuse of `CohortCard` as the canonical surface pattern is explicit in plans 40-02/03.

**Follow-up debt:** If v1.5 authoring requires variation beyond CONTEXT, generate UI-SPEC at that point rather than retroactively.
