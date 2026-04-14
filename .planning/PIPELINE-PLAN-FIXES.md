# Milestone v1.1 Plan Patches — Codex Review Response

Date: 2026-04-14
Source review: `.planning/PIPELINE-PLAN-CODEX.md`

One line per finding → files changed.

| # | Finding | Files Changed |
|---|---------|---------------|
| 1 | `/api/trainer` contract stability — default response stays `RosterAssociate[]`; wrapped `{associates, summary}` opt-in via `?includeSummary=true` | `.planning/phases/12-cohort-dashboard-views/12-CONTEXT.md`, `.planning/phases/12-cohort-dashboard-views/12-01-PLAN.md` |
| 2 | Authenticated automated-interview entry — new `/associate/[slug]/interview` route added to Phase 9; Phase 10 consumes it | `.planning/phases/09-associate-pin-auth/09-CONTEXT.md`, `.planning/phases/09-associate-pin-auth/09-03-PLAN.md`, `.planning/phases/10-automated-interview-pipeline/10-CONTEXT.md` |
| 3 | Anonymous `associateSlug` injection hole — endpoints split: `/api/public/interview/complete` unconditionally strips identity; new `/api/associate/interview/complete` requires cookie | `.planning/phases/10-automated-interview-pipeline/10-CONTEXT.md`, `.planning/phases/10-automated-interview-pipeline/10-01-PLAN.md` |
| 4 | PIN cookie revocation + dedicated secret — `ASSOCIATE_SESSION_SECRET` env var; token version = `pinGeneratedAt`; version check in server helpers (one DB lookup, not in middleware) | `.planning/PROJECT.md`, `.planning/phases/09-associate-pin-auth/09-CONTEXT.md`, `.planning/phases/09-associate-pin-auth/09-01-PLAN.md`, `.planning/phases/09-associate-pin-auth/09-02-PLAN.md` |
| 5 | Readiness recompute repair path — `Session.readinessRecomputeStatus` column + new `/api/admin/readiness-sweep` endpoint (Plan 10-03) | `.planning/phases/08-schema-migration/08-01-PLAN.md`, `.planning/phases/10-automated-interview-pipeline/10-CONTEXT.md`, `.planning/phases/10-automated-interview-pipeline/10-01-PLAN.md`, `.planning/phases/10-automated-interview-pipeline/10-03-PLAN.md` (NEW) |
| 6 | Postgres canonical; file history = transitional export/backup for v1.1 | `.planning/PROJECT.md`, `.planning/phases/10-automated-interview-pipeline/10-CONTEXT.md` |
| 7 | Downgrade `<400ms` curriculum SLO from release gate to target; real bottleneck is recursive GitHub discovery; future fix = cached manifest | `.planning/phases/13-curriculum-schedule/13-CONTEXT.md`, `.planning/phases/13-curriculum-schedule/13-03-PLAN.md` |
| 8 | Preserve legacy CSS utilities (`.nlm-bg`, `.glass-card`, `.gradient-text`, glow classes, motion keyframes); new tokens/classes ADDED alongside; `/`, `/interview`, `/review` unchanged | `.planning/phases/14-design-cohesion/14-CONTEXT.md`, `.planning/phases/14-design-cohesion/14-01-PLAN.md` |
| 9 | Curriculum matching — canonical `skillSlug` column added to `CurriculumWeek`; DB-enforced `@@unique([cohortId, weekNumber])` added NOW; wizard uses exact (case-insensitive) match, not substring | `.planning/phases/08-schema-migration/08-01-PLAN.md`, `.planning/phases/13-curriculum-schedule/13-CONTEXT.md`, `.planning/phases/13-curriculum-schedule/13-01-PLAN.md`, `.planning/phases/13-curriculum-schedule/13-03-PLAN.md` |

Also updated: `.planning/ROADMAP.md` — Phase 10 now 3 plans (added 10-03 sweep); Phase 9/12/13/14 success criteria updated to reflect patched behavior.
