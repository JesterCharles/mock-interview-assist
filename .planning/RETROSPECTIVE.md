# Retrospective: Readiness Loop MVP (v1.0)

**Sprint:** 2026-04-13 12:35 to 2026-04-14 06:37 (~18 hours elapsed)
**Developer:** JesterCharles (solo) + Claude AI assistance
**Result:** 22/22 requirements met, TECH_DEBT status (shippable, 11 debt items tracked)

---

## By the Numbers

| Metric | Value |
|--------|-------|
| Phases | 7/7 complete |
| Plans | 15/15 executed |
| Requirements | 22/22 satisfied |
| Commits | 116 |
| Files changed | 160 |
| Lines added | ~37,500 |
| Unit tests | 76 (all passing) |
| Pipeline stages | 10/12 (optimize skipped, reflect + maintain pending) |
| HITL gates | 5/5 passed |
| Codex findings | 9 (4 fixed, 5 MVP-accepted) |
| Tech debt items | 11 |
| Integration issues | 3 medium, 2 low |

---

## What Went Well

**Pipeline discipline paid off.** The full discover-to-ship pipeline kept scope locked. No feature creep despite 18 hours of continuous work. Every phase had research, context gathering, planning, execution, code review, and verification -- none were skipped.

**TDD on the hard parts.** Phases 4 (gap scoring) and 5 (readiness signals) used proper RED-GREEN-REFACTOR with vitest. The gap algorithm has 24 tests, readiness has 8 truth assertions. These are the most logic-dense modules and the ones most likely to regress. The investment was correct.

**Design approval on first try.** The editorial/utilitarian aesthetic (warm parchment, burnt orange accent, system fonts) was approved without revision. Three AI voices converged on the same direction, outside reviewers (Codex + subagent) agreed. Zero design rework saved hours.

**No taste decisions during autoplan.** All 15 plans across 7 phases auto-approved because the stack decisions (Prisma, Supabase, recharts, zod) were locked during discovery. Front-loading those decisions in CLAUDE.md and PROJECT.md eliminated planning friction entirely.

**Phase ordering was correct.** DB Foundation -> Session Persistence -> Associate Profiles -> Gap Service -> Readiness Signals -> Trainer Dashboard -> Adaptive Setup. Each phase consumed the prior phase's output cleanly. No phase needed to reach back and modify earlier work (except one minor fix in Phase 4 for Phase 2's session creation).

**New route performance.** Trainer dashboard routes load in 22-24ms. The new code added zero performance regressions.

---

## What Could Improve

**Nyquist validation was skipped.** 6/7 phases have no VALIDATION.md. Only Phase 1 has a partial one. The validation step exists in the workflow but was consistently deprioritized under time pressure. Either make it automatic (generate from verification reports) or drop it as a requirement.

**Public interview persistence is incomplete.** The `/api/public/interview/complete` endpoint exists but has zero callers. The public interview `handleFinish()` never calls it. This was caught in review but accepted as MVP-scope. It means public interviews don't feed the gap/readiness pipeline -- a meaningful gap in the "readiness loop" concept.

**Auth pattern inconsistency.** Trainer routes (`/api/trainer/*`) manually check cookies instead of using the shared `isAuthenticatedSession()` helper. Two routes also have auth/validation ordering bugs. This happened because Phase 6 was built fast and didn't reference the auth patterns established in earlier phases. A linting rule or shared middleware wrapper would prevent this.

**No middleware protection for /trainer routes.** The Next.js middleware protects `/dashboard`, `/interview`, `/review` but not `/trainer` or `/associate`. Client-side `useAuth()` redirect works but causes a flash. This should have been caught during Phase 6 planning, not Phase 8 review.

**readinessScore dead code.** The Associate type includes `readinessScore: number | null` but no code ever computes or persists a numeric score. ReadinessDisplay renders "-- pending" always. The readiness STATUS (ready/improving/not_ready) works fine, but the numeric score was designed and never built. Should have been cut from the type definition if it wasn't in scope.

**Console.log in production paths.** 5 console.log statements shipped in production code, including one that logs LLM response content. Should have been caught by a lint rule or pre-commit hook.

---

## Velocity Observations

**~8 plans/day effective throughput.** 15 plans in ~18 hours of wall time. Each plan averaged roughly 70 minutes including research, planning, execution, review, and fixes. The bottleneck was sequential phase dependencies, not individual plan complexity.

**Review stage found real issues.** The review pipeline (source analysis + CSO + health check) caught 8 source-level findings and the orphaned endpoint. 3 were classified HIGH. All were resolved in the debug stage. The review stage is not ceremony -- it caught bugs that would have shipped.

**Codex adversarial review added value.** 9 findings, 4 of which were fixed immediately. The remaining 5 were consciously accepted as MVP-scope. Without adversarial review, the auth ordering bug (CR-01) and zod import inconsistency (CR-03) would have shipped silently.

**Phases 4-5 were the hardest, Phases 1-3 were the fastest.** DB setup and CRUD are well-trodden ground. The gap scoring algorithm and readiness classification required actual thinking -- test-first development, edge case handling, decay coefficient tuning. Phase 6 (dashboard) was the largest by line count but straightforward (mostly React components + recharts wiring).

---

## Learnings to Carry Forward

1. **Lock stack decisions before planning.** Writing technology choices into CLAUDE.md before the planning stage eliminated all taste decisions during autoplan. Do this for every milestone.

2. **TDD for algorithms, not for CRUD.** The gap scoring and readiness services justified full RED-GREEN-REFACTOR. The API routes and React components did not. Be selective about where TDD adds value.

3. **Review finds different bugs than testing.** Testing found 2 bugs (vitest config, responsive CSS). Review found 8 source-level issues and an orphaned endpoint. Both stages are necessary. Neither substitutes for the other.

4. **Dual-write is inherently messy.** The file + DB dual-write strategy works but creates subtle divergence risks (silent DB failure, public vs trainer paths). Track it as explicit tech debt and plan the migration to DB-only as a near-term priority.

5. **Front-load middleware decisions.** Adding new route groups (`/trainer`, `/associate`) without updating middleware is a predictable mistake. Add a checklist item: "Does this phase add new protected routes? Update middleware matcher."

6. **Design convergence saves time.** Getting design approved on first try saved an estimated 2-3 hours of iteration. The editorial/utilitarian direction was well-reasoned and the preview page made approval easy.

7. **Numeric readiness score was premature.** The status enum (ready/improving/not_ready) is sufficient for MVP. The numeric score added type complexity and dead code. Cut features from types, not just from UI.

8. **18 hours for 22 requirements is a reasonable pace for a solo sprint with AI assistance.** Don't plan more than this for a single push. The quality started to slip in later phases (auth inconsistency, console.logs) -- fatigue is real even with AI help.

---

## Tech Debt Carried Forward

See `.planning/v1.0-MILESTONE-AUDIT.md` for the full list. Priority items for v1.1:

1. Wire public interview persistence into the gap/readiness pipeline
2. Add `/trainer` and `/associate` to middleware route matcher
3. Replace `db push` with proper Prisma migrations
4. Remove dead code (readinessScore, orphaned getGapScores, duplicate gap endpoint)
5. Add settings UI for readiness threshold
6. Strip console.log from production paths

---

*Written 2026-04-14. Next: `/gsd-complete-milestone` to archive and tag v1.0.*
