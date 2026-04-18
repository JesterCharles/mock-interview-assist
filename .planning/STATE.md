---
gsd_state_version: 1.0
milestone: v1.5
milestone_name: "Production Migration: Cloud Run + Supabase Hybrid"
status: executing
last_updated: "2026-04-18T21:58:42.268Z"
last_activity: 2026-04-18 -- Phase 53 planning complete
progress:
  total_phases: 9
  completed_phases: 0
  total_plans: 36
  completed_plans: 0
  percent: 0
---

# Project State — v1.5 Production Migration

## Current Position

Phase: 45 (not started)
Plan: —
Status: Ready to execute
Last activity: 2026-04-18 -- Phase 53 planning complete

## Progress Bar

```
v1.5: [░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 0% (0/9 phases)
```

## Project Reference

See: `.planning/PROJECT.md`

**Core value:** Associates get consistent, feedback-rich practice reps that adapt to their weaknesses — replacing snapshot audits with continuous improvement trajectories.

**Current focus:** v1.5 — migrate v1.0-v1.4 codebase from legacy v0.1 GCE to Cloud Run + Supabase hybrid; ship staging + CI/CD + k6 load-test baseline; cut DNS from v0.1 to new prod without breaking existing public-interview users.

## v1.5 Phase Map

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 45 | Terraform Skeleton + Artifact Registry + Secret Manager | INFRA-01..03, INFRA-06..07 | Not started |
| 46 | Supabase Staging + Env Hygiene + Prisma Migrate Baseline | DATA-01..06 | Not started |
| 47 | Staging Cloud Run Service + Load Balancer + Domains | INFRA-04..05, CI-04 | Not started |
| 48 | GitHub Actions CI + Deploy-Staging + Observability | CI-01..02, CI-05..06, OBS-01..04 | Not started |
| 49 | k6 Load Test + Hardening (HARD-01..03) | LOAD-01..03, HARD-01..03 | Not started |
| 50 | Judge0 Integration Points + Flag Audit | JUDGE-INTEG-01..04 | Not started |
| 51 | Prod Cloud Run + Deploy-Prod Pipeline + DNS Records | CI-03, DNS-01..03 | Not started |
| 52 | DNS Cutover + Zero-Downtime Validation + Kill Switch | DNS-04, SUNSET-01..02, SUNSET-04 | Not started |
| 53 | Reflect + Maintain + Runbook Finalization + Decommission Plan | META-01..02, DOCS-01..04, SUNSET-03 | Not started |

## v1.5 Direction (finalized in discover)

- **Approach C — Hybrid:** Cloud Run app + Supabase DB/auth (both stay). Supabase = company-standard, cloud-agnostic for future AWS migration.
- **Judge0 integration points only** (env vars, facade, `judge0.tf.disabled` stub) — self-hosted IaC deferred to v1.6.
- **P0 scope:** staging Cloud Run + staging Supabase project + deploy-on-tag CI/CD + k6 single-instance load-test baseline.
- **HARD-01/02/03** carried from v1.4 — executed under the deployed stack in Phase 49.
- **Env hygiene reset:** wipe dirty dev data from existing "prod" Supabase, reseed staging with demo data, reserve prod for real users.
- **DNS cutover:** Cloudflare Free Tier on `nextlevelmock.com`; 30-day `legacy.nextlevelmock.com` rollback window.

### Finalized IDs (for execute phase)

- GCP projects: `nlm-prod`, `nlm-staging-493715` (suffix accepted — `nlm-staging` globally taken)
- GCP billing: `01A910-0C5083-DCCFED` (active)
- Supabase staging ref: `lzuqbpqmqlvzwebliptj`
- Supabase prod: existing (will be wiped + reseeded clean in Phase 46)
- DNS: Cloudflare Free Tier on `nextlevelmock.com`

## Performance Metrics (shipped milestones)

- v1.0: 7 phases, 22 reqs, ~26h
- v1.1: 8 phases, 14 reqs, ~24h, 131 commits
- v1.2: 10 phases, 30 reqs, ~16h, 205 commits, 470 tests
- v1.3: 11 phases (incl. decimal 28.1), 18 plans, 27 reqs, ~2 days, 524 passing tests
- v1.4: 9 phases (36-44), 28 plans, 44 reqs, 963 passing tests

## Accumulated Context

### Decisions (v1.5)

- Supabase: two separate free-tier projects (staging = `lzuqbpqmqlvzwebliptj`, prod = existing wiped project). Free tier has no branching.
- Terraform state: GCS bucket `nlm-tfstate` (versioned). No local state files.
- CI auth: Workload Identity Federation (OIDC). No long-lived service-account JSON keys anywhere.
- Docker image strategy: signed images pushed by digest; Cloud Run never pulls `:latest`.
- Cloud Run baseline: `min-instances=0` (accept cold starts in v1.5), `max-instances=10`, `cpu=1`, `memory=512Mi`, `timeout=300s`.
- Judge0 flag: `CODING_CHALLENGES_ENABLED=false` on prod until v1.6.
- DNS rollback: `legacy.nextlevelmock.com` → v0.1 GCE stays warm 30 days post-cutover.

### Open Blockers Carried Forward

- HARD-01 / HARD-02 / HARD-03 — live load test, live abuse test, live security review. All require deployed stack. Scheduled for Phase 49.
- v1.4 reflect + maintain deferred — scheduled for Phase 53.

### Todos

- At Phase 45 execute start: run `gcloud auth login` + `gcloud config set project nlm-staging-493715` to give Claude GCP access.
- At Phase 46: confirm Supabase prod backup is taken before wipe (DATA-02 gate).
- At Phase 47: benchmark cold-start latency; decide if `min-instances=1` is worth the cost before prod goes live.
- Pitch demo data question (from discover seeds): does champion walkthrough need seeded demo users on prod, or is staging URL acceptable? Decide before Phase 52 cutover.

## Session Continuity

To resume: `/gsd-plan-phase 45`

Dependency order: 45 → 46 → 47 → 48 → 49 (parallel: 50 can run after 45) → 51 → 52 → 53
