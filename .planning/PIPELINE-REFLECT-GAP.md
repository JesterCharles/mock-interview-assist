---
type: pipeline-reflect
milestone: v1.3
sub_run: gap-closure
date: 2026-04-17
pr: 6
branch: v1.3-gap-closure
parent_pr: 5 (c444f9e)
mode: unattended
---

# Reflection Pipeline — v1.3 Gap Closure (P33-35)

## Context

This is a **sub-run** of v1.3. The main v1.3 run shipped 2026-04-17 (PR #5, c444f9e). Post-merge milestone audit (`v1.3-MILESTONE-AUDIT.md`) surfaced 5 requirement gaps across 3 dimensions — auth (SIGNIN-02), viz (VIZ-03, VIZ-06, VIZ-07 new), and shell (SHELL-01, SHELL-32-01). Rather than defer to v1.4, we opened a gap-closure cycle as P33-35 on branch `v1.3-gap-closure`.

## Retrospective

### What went well

- **Tight, focused gap-closure cycle landed clean.** Three phases, 24 commits, ~97 minutes of active work (19:40 → 01:17 UTC with sleep gap). The smaller scope made discuss → plan → execute → review → fix trivial to sequence.
- **Codex P1 + 2xP2 all closed same-session.** Review found 3 real issues (trainer password gate fail-open, TOCTOU race on gap prior snapshot, double ProfileModal mount). Each had a clear recommendation that translated directly into a fix commit.
- **Test count monotonically increased across every stage.** 479 (v1.3 main ship) → 505 (P33-35 feature work) → 524 (review fixes). +45 net over gap closure, no regressions.
- **Atomic commits per task held under unattended mode.** 24 commits, each a coherent unit of work (schema + persistence + types + refactor + tests + summary). No amend-shenanigans, no hook skips.
- **Gap audit → phase-plan pipeline worked cleanly.** `v1.3-MILESTONE-AUDIT.md` → `/gsd-plan-milestone-gaps` → 3 phases with auto-discuss + plan under `--unattended --discuss`. 43 decisions auto-locked with no HITL blocks.
- **VIZ-07 (real trajectory snapshots) closed the synthetic-prior credibility debt** that v1.3 reflect flagged as health deduction. Schema column + transaction-safe upsert + radar rewrite eliminated the "Est. prior" disclosure the audit flagged. Closed Seed 1 from v1.3 reflection same-milestone instead of punting to v1.4.
- **Pre-existing failing test not auto-fixed.** `src/app/trainer/nav-link.test.ts` staged pre-session — left untouched as out-of-scope. Correct unattended discipline: only close issues the current run owns.

### What didn't / what to improve

- **Audit gaps caught only post-merge.** The 5 gaps in `v1.3-MILESTONE-AUDIT.md` were all latent in PR #5 at merge time. SIGNIN-02 was explicitly flagged in Phase 28's own VERIFICATION.md and never fixed. Codex passed PR #5 but didn't surface the gate bypass. Could have shifted earlier with a pre-ship audit gate OR with codex scope tuned to auth-specific threats.
- **Codex consistently catches auth + race conditions Claude misses.** Trend confirmation from main v1.3 run (demo cohort prefix, passwordSetAt writable) into gap closure (password-status fail-open, saveGapScores TOCTOU). Claude's feature-first execution repeatedly ships the happy path; codex's adversarial pass finds the concurrency / auth-fail-mode issues. Pattern is now 2-for-2 across auth work.
- **TOCTOU on read-then-update pattern was not caught by unit tests.** Phase 34 Plan 01 shipped `gapScore.findMany` → in-memory map → per-row upsert with prior — all covered by 5 tests, all passing. But no concurrency test fired two saves in parallel. Codex caught it; we had to add the concurrency test in the fix.
- **Double-mount of ProfileModal was not caught by structural tests.** Phase 35 Plan 01 added an AssociateShell source-text regression test that asserted `<ProfileModal` appears exactly once in that file. It did not assert the wider tree only mounts ProfileModal once — AvatarMenu's own internal ProfileModal was invisible to the file-scoped grep check. Codex saw the two-component compose problem; our tests only saw the single-component invariant.
- **No design-review step on shell work, even after v1.3 seed 2 flagged it.** Phase 35 touches AssociateShell directly; should have triggered the "design-review precedes codex on shell/layout" gate. Didn't — gap closure scope was narrow enough to skip, but this is the exact trigger condition Seed 2 named.

### What to change

1. **Shift codex review pre-execute on auth-touching code.** When a phase plan contains `src/lib/auth-*`, `src/app/api/auth/*`, `src/middleware.ts`, or any route that calls `auth.getUser()` / `auth.signIn*`, run codex review against the **plan** before execution (not after). Catch fail-open / ordering / gate-bypass issues at design time when they cost 1 commit to fix, not post-ship when they cost a sub-run.
2. **Add concurrency tests as default for any pre-fetch + update pattern.** New test-template rule: any service method that reads DB state, computes over it, then writes back (TOCTOU shape) must ship with a parallel-invocation test that asserts serializability. Pattern detectors: `findMany` followed by `upsert` or `update` in same function; `prisma.$transaction` *absence* around those. Make this part of the `/gsd-plan-phase` checklist for persistence work.
3. **Compose-level invariant tests for shell-wiring.** Source-text tests on one file can't catch "this component renders another component that internally renders the thing you banned." Add composition tests that mount the actual shell (AssociateShell / AppShell) with RTL and assert invariants like `getAllByRole('dialog')` count, `getAllByTestId('profile-modal')` count. This is a new test shape, not a migration of existing tests.
4. **Run audit before milestone ship, not after.** Move `/gsd-audit-milestone` from "post-merge archive prep" to "pre-merge gate." A `gaps_found` status should block merge approval until gaps are either closed or accepted as next-milestone scope. The 5 gaps found post-PR-#5-merge would have been catchable in the audit against the unmerged branch.

### Trends (cross-run signal)

Two patterns now have 2+ data points and warrant durable learnings:

- **Codex catches auth + race conditions Claude misses.** 4-for-4 across v1.3 main + gap closure.
  - v1.3 main: `passwordSetAt` writable via PUT /api/profile (P1)
  - v1.3 main: demo cohort prefix collision (P1)
  - v1.3 gap closure: password-status fail-open to `/trainer` (P1)
  - v1.3 gap closure: saveGapScores TOCTOU on prev-snapshot (P2)
- **Small scoped runs ship faster and cleaner.** v1.3 main: ~15 active hours, 8 phases, 4 codex passes, 1 P1. v1.3 gap closure: ~1.6 hours, 3 phases, 1 codex pass, 1 P1 + 2 P2 (all closed same-session). Scoping around a specific artifact (milestone audit in this case) tightens the loop dramatically.

### Velocity

- Gap-closure cycle: **97 minutes active** (19:40 → 01:17 UTC, with sleep gap between 20:17 plan and 00:21 resume). 24 commits. ~15 commits/hour active.
- Phases: 3 planned, 3 executed, 3 reviewed, 3 fixed, 0 deferred.
- Net LOC delta: +6021 / -369 (shown in PR #6; most additions are planning artifacts + generated prisma files, not source).

## Statistics

- **Phases completed:** 3 (P33, P34, P35)
- **Plans executed:** 4 (33-01, 34-01, 34-02, 35-01)
- **Commits:** 24
- **Files changed:** 55 (planning + source + generated prisma)
- **Source LOC delta:** ~+400 / −200 (excl. planning docs + generated client)
- **Unit tests:** 479 → 505 (feature work, +26) → 524 (review fixes, +19). All passing.
- **E2E tests:** 7 passing (unchanged)
- **Type check:** clean (pre-existing `nav-link.test.ts` resolved by deletion in P35)
- **Build:** clean
- **Codex passes:** 1 (vs 4 on main v1.3)
- **Codex findings:** 1 P1 + 2 P2 — all closed same-session
- **Audit gaps closed:** 5 (SIGNIN-02, VIZ-03, VIZ-06, VIZ-07-new, SHELL-01, SHELL-32-01 — 6 reqs, 3 phases)
- **Health score:** 10/10 (synthetic radar history debt closed, gap audit resolved cleanly)

## Session

- **Duration:** ~5.6 hours elapsed (19:40 04/17 → 01:17 04/18 UTC); ~97 minutes active
- **Sleep gap:** ~4 hours between initial planning commit (20:17) and execution resume (00:21)
- **Commits/hour (active):** ~15
- **Codex round-trip time:** single pass, ~5 minutes between test-passing state and review request
- **Review-fix cycle time:** 1 P1 + 2 P2 → 3 commits → tests green in ~10 minutes
- **Tasks completed:** 4 plans + 1 codex review + 3 review fixes + artifact writes

## Learnings

**Durable learnings to add to wiki:**

- **Codex + auth work = always pre-execute, not post-execute.** Two milestones, four auth findings, zero caught by Claude's own tests. Shift left.
- **Any `findMany` + `update` in the same function needs a concurrency test.** Serializability is invisible to single-shot unit tests. Transaction wrap or parallel-invocation test — one or the other is required.
- **Source-text greps on one file miss compose-level invariants.** If a shell renders a child that renders the thing you want to singleton, grep can't see it. Need RTL/JSDOM composition tests, not just file-level regex checks.
- **Milestone audit pre-merge, not post-merge.** If the audit runs against the merged branch, gaps become sub-runs. If it runs against the pre-merge branch, gaps become inline fixes.

## Seeds Planted

3 seeds for v1.4 consideration:

### Seed 1 — Shift codex review pre-execute on auth-touching code

**Trigger:** Any phase plan whose file scope contains `src/lib/auth-*`, `src/app/api/auth/*`, `src/middleware.ts`, or API routes that invoke Supabase `auth.*` methods.

**Context:** 4-for-4 codex finds Claude missed across v1.3 + gap closure. All involved either auth ordering, fail-open paths, or concurrent writes on auth-adjacent state. Cost of catching post-merge = full sub-run (see this gap closure). Cost of catching pre-execute = 1 commit to fix before coding.

**Action:** Extend `/pipeline-execute` with a pre-flight step that detects auth-adjacent file scope and runs `codex review` against the PLAN.md (not the diff). Requires codex-consult mode for plan-level review. Gate: no plan execution until codex plan-review returns no P0/P1 findings.

### Seed 2 — Concurrency tests as default for pre-fetch+update patterns

**Trigger:** Any new or modified service method in `src/lib/*Service.ts` or `src/lib/*Persistence.ts` that contains both a `findMany`/`findFirst`/`findUnique` read and a subsequent `upsert`/`update`/`updateMany` write on the same table within the same function scope.

**Context:** Phase 34 `saveGapScores` shipped 5 unit tests, all passing. Codex caught TOCTOU on prev-snapshot in ~30 seconds of review. Pattern (read → compute → write) is invisible to single-shot tests. Fix required wrapping in `prisma.$transaction` + adding a parallel-invocation test.

**Action:** Add detection rule to `/gsd-plan-phase` checklist: any new service method matching this pattern requires (1) explicit `prisma.$transaction` wrap OR (2) a parallel-invocation test that asserts serializability. Plan review fails without one of these. Could be lint-enforced via custom AST rule in the long run.

### Seed 3 — Composition-level invariant tests for shell wiring

**Trigger:** Any phase touching `AppShell.tsx`, `AssociateShell.tsx`, `TopBar.tsx`, `AvatarMenu.tsx`, or any component that conditionally renders singleton UI (modals, dialogs, toasts).

**Context:** Phase 35 Plan 01 added a source-text test asserting `AssociateShell.tsx` contains exactly one `<ProfileModal` literal. Test passed. Codex found TWO ProfileModal instances at runtime because `TopBar → AvatarMenu → <ProfileModal>` is invisible to file-scoped regex. Composition-level test missing.

**Action:** Add composition-test template in `src/components/shell/__tests__/` that mounts `<AssociateShell>` + `<AppShell>` with RTL and asserts: (a) `getAllByRole('dialog')` returns at most 1 rendered, (b) `queryAllByTestId('profile-modal')` count ≤ 1 per shell, (c) any singleton component flagged as "mount exactly once" has a corresponding compose-test. Enforce via `/gsd-plan-phase` checklist for shell-touching phases.

## Second-Brain

**Notes saved:**

- `~/second-brain/projects/nlm/notes/retro-gap-closure-2026-04-17.md`
- `~/second-brain/projects/nlm/notes/session-gap-closure-2026-04-17.md`

**Local artifacts:**

- `.planning/PIPELINE-REFLECT-GAP.md` (this file)
- `.planning/seeds/v1.3-gap-closure-seeds.md` (3 new seeds)

## Next

- PR #6 merge deferred per `--unattended` (no auto-merge policy)
- After human merge of PR #6: re-run `/gsd-audit-milestone v1.3` to verify all 5 audit gaps close; then `/gsd-complete-milestone v1.3`
- Seeds surface at v1.4 discovery / planning when their trigger conditions hit
