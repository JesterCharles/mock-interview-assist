---
gsd_state_version: 1.0
milestone: v1.5
milestone_name: "Production Migration: Cloud Run + Supabase Hybrid"
status: executing
last_updated: "2026-04-18T23:41:00.000Z"
last_activity: 2026-04-18 -- Phase 48 executed (1/4 plans fully complete [48-03], 3/4 code-complete with operator checkpoints pending)
progress:
  total_phases: 9
  completed_phases: 1
  total_plans: 36
  completed_plans: 13
  percent: 36
---

# Project State — v1.5 Production Migration

## Current Position

Phase: 48 (executed — 1/4 fully complete [48-03 TDD autonomous], 3/4 code-complete HALT on operator apply/live-run gates)
Plan: Next → 49 (k6 Load Test + Hardening) after operator executes Phase 46 + 47 + 48 apply/activation sequences
Status: Phase 48 workflow YAML + app logger/metrics + monitoring HCL + phase-gate script all shipped; operator must push commits + `gh variable set` + `gh api` branch protection + first merge to main + `terraform apply -target=` monitoring resources + click 2 email verification links + run `bash iac/cloudrun/scripts/verify-phase-48.sh`
Last activity: 2026-04-18 -- Phase 48 code ship complete (12 per-task commits, ~9min wall, 18 new app-code tests [11 logger + 7 metrics all green], 5 new workflows/skeletons [wif-smoke.yml deleted], 2 new runbooks, 1 new HCL file + dashboard JSON + phase-gate script, terraform fmt+validate green). 48-03 fully complete autonomously; 48-01, 48-02, 48-04 halted on operator gates.

## Progress Bar

```
v1.5: [██████████████░░░░░░░░░░░░░░░░░░░░░░░░░░] 36% (1/9 phases, 13/36 plans)
```

## Project Reference

See: `.planning/PROJECT.md`

**Core value:** Associates get consistent, feedback-rich practice reps that adapt to their weaknesses — replacing snapshot audits with continuous improvement trajectories.

**Current focus:** v1.5 — migrate v1.0-v1.4 codebase from legacy v0.1 GCE to Cloud Run + Supabase hybrid; ship staging + CI/CD + k6 load-test baseline; cut DNS from v0.1 to new prod without breaking existing public-interview users.

## v1.5 Phase Map

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 45 | Terraform Skeleton + Artifact Registry + Secret Manager | INFRA-01..03, INFRA-06..07 | Complete (docker smoke deferred) |
| 46 | Supabase Staging + Env Hygiene + Prisma Migrate Baseline | DATA-01..06 | Code complete (3 operator checkpoints pending) |
| 47 | Staging Cloud Run Service + Load Balancer + Domains | INFRA-04..05, CI-04 | Code complete (4 operator checkpoints pending) |
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
- v1.5 Phase 46 (2026-04-18): 4 plans, 11 per-task commits, ~35min wall, 30+ new tests, 1005 passing total; 1 plan autonomous, 3 halted on operator checkpoints
- v1.5 Phase 47 (2026-04-18): 4 plans, 7 per-task commits, ~32min wall, 0 new tests (pure IaC). All 4 plans halted on operator apply + live mutation gates. Shipped: 5 new HCL files (cloudrun-staging.tf + loadbalancer-staging.tf + dns-staging.tf + wif.tf + iam.tf extensions), 1 GH workflow (wif-smoke.yml), 2 scripts (coldstart-probe + verify-phase-47 phase-gate), ~130 README runbook lines. terraform validate + plan both green (16 resources to add staging, 6 to add prod).
- v1.5 Phase 48 (2026-04-18): 4 plans, 12 per-task commits, ~9min wall, 18 new tests (11 logger + 7 metrics; all green). 1 plan fully autonomous (48-03 TDD), 3 code-complete halted on operator apply/live-run gates (48-01 branch protection, 48-02 first deploy + rollback rehearsal, 48-04 terraform apply + email verification). Shipped: 3 new GH workflows (deploy-staging.yml + rollback-prod.yml + load-test.yml skeleton) + pr-checks.yml rewrite (4 parallel jobs) + wif-smoke.yml deletion; 2 runbooks (RUNBOOK-BRANCH-PROTECTION.md + RUNBOOK-WORKFLOW-VARS.md); new src/lib/logger.ts + src/app/api/metrics/route.ts; logger wired into middleware + 5 high-traffic routes (zero PII); new iac/cloudrun/monitoring.tf + dashboard-nlm-production.json (6 widgets) + verify-phase-48.sh phase-gate (12 checks). `terraform fmt` + `validate` green; `tsc --noEmit` + `lint` zero errors; P48 test scope 18/18.

## Accumulated Context

### Decisions (v1.5)

- **Phase 48 (2026-04-18):** Phase 48 shipped as workflow YAML + app code + monitoring HCL + runbooks under unattended rules. Plan 48-03 (logger + metrics TDD) fully autonomous; 48-01/02/04 halted on live-run gates (branch protection toggle, first deploy via WIF, terraform apply monitoring). `deploy-staging.yml` deploys by digest via WIF (no SA JSON keys) — pulls `DIRECT_URL` from Secret Manager at runtime for `prisma migrate deploy` BEFORE `gcloud run deploy`. `rollback-prod.yml` is env-parameterized (staging|prod choice) so same workflow serves both envs. `wif-smoke.yml` (P47 artifact) deleted per D-15 — WIF now proven by real deploy/rollback. Logger emits Cloud Logging canonical severities (WARNING not WARN) via `console.log` (edge-runtime safe); wired into middleware + 5 routes with zero PII in payloads. `/api/metrics` feature-flagged strict equality on `'true'` (default-off 404 per D-11/T-48-06); Prometheus text 0.0.4 with 4 zero-valued stubs (instrumentation deferred to P49). Monitoring dashboard JSON shared across staging + prod via templatefile (D-12); alert policy pulls email from ADMIN_EMAILS Secret Manager secret (D-14); 2-consecutive-60s-window failure threshold (D-13 + T-48-05).
- **Phase 48 (2026-04-18):** Scope-boundary finding logged to `.planning/phases/48-*/deferred-items.md`: 15 pre-existing failures in `src/lib/codingAttemptPoll.test.ts` caused by concurrent commit `2e8d9e5` (P50-02) adding `isCodingEnabled()` guard without updating test harness. Out of P48 scope; P50 to resolve.
- **Phase 47 (2026-04-18):** Phase 47 shipped as HCL + workflow + scripts + runbook under unattended rules. All 4 plans halted on operator apply — nothing mutated against live GCP or Cloudflare. `terraform fmt` + `terraform validate` + `terraform plan -var-file=staging.tfvars` all green; plan shows 16 resources to add against staging (+ 6 against prod for WIF). `cloudflare/cloudflare v4.52.7` locked in `.terraform.lock.hcl`. Project numbers captured live: staging=`168540542629`, prod=`609812564722`. Full operator runbook in `iac/cloudrun/README.md` "## Phase 47 apply sequence" + `.planning/phases/47-staging-cloud-run-service-load-balancer-domains/47-EXECUTE-LOG.md` "Next Actions for Human Operator".
- **Phase 47 (2026-04-18):** `initial_image_digest` + `cf_zone_id` intentionally set to placeholder strings in `staging.tfvars` so `terraform apply` cannot run accidentally. Operator overwrites with real values (from AR digest + Cloudflare zone lookup) before apply.
- **Phase 47 (2026-04-18):** P45-02 Docker smoke halt (supabase-admin eager init vs D-15 / Dockerfile-frozen) resurfaces as a Phase 47 gate — the first real image push needs either Option A (lazy-init `supabaseAdmin`) or deferring to Phase 48 CI and bootstrapping Cloud Run with a throwaway image. Recommended: Option A at operator time since we're past the Phase 45 scope lock.
- **Phase 46 (2026-04-18):** Phase 46 shipped as code + runbook + phase-gate under unattended rules. Plan 46-01 fully autonomous (guard + faker seeder + 24 green tests); Plans 46-02/03/04 code-complete with operator checkpoints gated behind live prod wipe, Supabase dashboard key rotation, Supabase Management API PATCH — all require human-held credentials. Operator runbook at `docs/runbooks/phase-46-supabase-wipe.md` (Phases A–J, ~700 lines). Phase-gate aggregator at `scripts/verify-phase-46.sh`.
- **Phase 46 (2026-04-18):** `@faker-js/faker@^10.4.0` added as devDependency. `scripts/lib/assert-staging-env.ts` exports `STAGING_REF = 'lzuqbpqmqlvzwebliptj'`, `assertStagingDatabase`, `assertProdDatabase`, `maskUrl` — reusable guard for any future mutating script.
- **Phase 46 (2026-04-18):** Seed payload locked at 3 cohorts / 30 associates / 36 curriculum weeks / 15 sessions / 1 settings singleton. CodingChallenges deferred (`TODO 46-03` in source) — bank-slug selection is downstream.
- **Phase 45 (2026-04-18):** Upgraded terraform 1.5.7 → 1.14.8 via `hashicorp/tap` (default brew formula is BSL-capped at 1.5.7). Provider `hashicorp/google ~> 7.0` now pinned at v7.28.0 via committed `.terraform.lock.hcl`.
- **Phase 45 (2026-04-18):** ADC refresh requires browser interaction — used `GOOGLE_OAUTH_ACCESS_TOKEN=$(gcloud auth print-access-token)` as a non-interactive fallback for all terraform invocations. Future phases should follow the same pattern until human reruns `gcloud auth application-default login`.
- **Phase 45 (2026-04-18):** Docker smoke image (D-16) HALTED — `src/lib/supabase/admin.ts` eagerly instantiates `createClient(...)` at module load, crashing `npm run build` during Next.js page-data collection when `NEXT_PUBLIC_SUPABASE_URL` is absent from the build env. D-15 (no Dockerfile changes) + phase scope (no app-code changes) prevent an in-phase fix. Chose Option D (defer smoke to Phase 47 real Cloud Run deploy via CI). Full analysis in `.planning/phases/45-*/DOCKER-NOTES.md`.
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
- **Phase 45 docker smoke (DOCKER-NOTES.md)** — Dockerfile build fails due to supabase-admin eager init. Options: (A) lazy-init supabaseAdmin in code [Phase 47 scope], (B)/(C) Dockerfile build-arg injection [violates D-15], (D) defer to Phase 47/48 CI [chosen]. Human decision can reopen A if desired before Phase 47.
- **Phase 46 operator checkpoints (3 open):** Plan 46-02 Task 3 (prod wipe A–F), Plan 46-03 Task 4 (key rotation + migrate deploy G–I), Plan 46-04 Task 5 (Auth redirect PATCH J + phase-gate). All require human-held credentials and live production mutations. Runbook is ready; `bash scripts/verify-phase-46.sh` is the single-command exit criterion.
- **Phase 47 operator checkpoints (4 open):** Plan 47-01 Task 3 (Wave 1 — `terraform apply` Cloud Run service), Plan 47-02 Task 3 (Wave 2 — apply LB+DNS, 10-60 min SSL wait), Plan 47-03 Task 2+3 (apply WIF in both projects + `gh variable set` + `gh workflow run wif-smoke.yml`), Plan 47-04 Task 1+2+3 (populate `NEXT_PUBLIC_SITE_URL` secret + invoke coldstart-probe + phase-gate). Exit criterion: `bash iac/cloudrun/scripts/verify-phase-47.sh` exits 0 with "All Phase 47 assertions PASSED." Prerequisites: (a) first image in AR (either lazy-init supabaseAdmin then docker push, or defer to P48 CI), (b) `CLOUDFLARE_API_TOKEN` exported with Zone.DNS.Edit scope, (c) Phase 46 secrets populated.
- **Phase 48 operator checkpoints (3 open):** Plan 48-01 Task 3 (first `gh workflow run pr-checks.yml` run + `.github/RUNBOOK-BRANCH-PROTECTION.md` gh-api PUT), Plan 48-02 Task 4 (`gh variable set` per `.github/RUNBOOK-WORKFLOW-VARS.md` + first merge to main to trigger `deploy-staging.yml` + `gh workflow run rollback-prod.yml -f env=staging` rehearsal — requires Phase 47 Cloud Run service + WIF live and first image in AR), Plan 48-04 Task 3 (`terraform apply -target=google_monitoring_*` on both staging + prod tfvars + click 2 Google Cloud Monitoring email verification links + `bash iac/cloudrun/scripts/verify-phase-48.sh`). Exit criterion: verify-phase-48.sh returns "Phase 48 gate: ALL 12 CHECKS PASS".
- **Phase 48 deferred (P50-02 scope):** 15 failures in `src/lib/codingAttemptPoll.test.ts` from commit `2e8d9e5` — fix is to stub `isCodingEnabled()` in that test harness beforeEach. Tracked in `.planning/phases/48-github-actions-ci-deploy-staging-observability/deferred-items.md`.

### Todos

- At Phase 45 execute start: run `gcloud auth login` + `gcloud config set project nlm-staging-493715` to give Claude GCP access.
- At Phase 46: confirm Supabase prod backup is taken before wipe (DATA-02 gate) — **runbook ready, awaiting operator execution**.
- At Phase 47: benchmark cold-start latency; decide if `min-instances=1` is worth the cost before prod goes live.
- Pitch demo data question (from discover seeds): does champion walkthrough need seeded demo users on prod, or is staging URL acceptable? Decide before Phase 52 cutover.

## Session Continuity

To resume: operator executes (1) `docs/runbooks/phase-46-supabase-wipe.md` Phases A–J + `bash scripts/verify-phase-46.sh`, (2) Phase 47 apply sequence per `iac/cloudrun/README.md` "## Phase 47 apply sequence" + `bash iac/cloudrun/scripts/verify-phase-47.sh`, (3) Phase 48 live sequence per `iac/cloudrun/README.md` "## Phase 48 — Observability + CI/CD" (gh variable set → first merge to main → terraform apply monitoring → email verification click × 2 → `bash iac/cloudrun/scripts/verify-phase-48.sh`), then `/gsd-execute-phase 49 --unattended`.

Dependency order: ~~45~~ → 46 → 47 → 48 → 49 (parallel: 50 can run after 45) → 51 → 52 → 53

**Phase 45 artifacts live at:**
- `iac/cloudrun/` — Terraform module root (providers, variables, apis, registry, secrets, iam, state stub, outputs, tfvars, README, lock file, scripts/)
- `gs://nlm-tfstate` — versioned TF state bucket in nlm-prod (prefixes: cloudrun/staging, cloudrun/prod)
- Both GCP projects provisioned: 11 APIs + 1 AR + 13 secret shells + 2 SAs + 13 per-secret bindings = 40 resources each (80 total)
