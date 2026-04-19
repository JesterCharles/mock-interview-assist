# Phase 48 Execute Log — GitHub Actions CI + Deploy-Staging + Observability

**Executed:** 2026-04-18 (unattended mode)
**Duration:** ~9 minutes wall time
**Mode:** Unattended — ship code + HCL + runbooks; HALT on live WIF/infra/GH-branch-protection/terraform-apply gates
**Outcome:** 0/4 plans fully complete, 4/4 plans **code-complete** with operator checkpoints pending

## Plans Executed

| Plan | Name | Status | Commits | Tasks Auto / Halted |
|------|------|--------|---------|--------------------|
| 48-01 | PR Checks workflow + branch-protection runbook | Code-complete, checkpoint HALT | 2 | 2 / 1 |
| 48-02 | Deploy-Staging + Rollback + Load-Test skeleton | Code-complete, checkpoint HALT | 3 | 3 / 1 |
| 48-03 | Structured logger + metrics endpoint (TDD) | **Fully complete** | 5 | 3 / 0 |
| 48-04 | Monitoring dashboard + uptime + alert + phase gate | Code-complete, checkpoint HALT | 2 | 2 / 1 |

Total: **12 atomic per-task commits**; ~9 min wall time.

## Commits (oldest first)

```
d0ab4b5 feat(48-01): pr-checks.yml with 4 parallel gate jobs
1c1769b docs(48-01): branch protection runbook for required checks
89b21f2 feat(48-02): deploy-staging.yml — merge-to-main Cloud Run deploy via WIF
4ed5e30 feat(48-02): rollback-prod.yml + load-test.yml skeleton; drop wif-smoke.yml
e24e9af docs(48-02): runbook for STAGING/PROD_PROJECT_NUMBER repo variables
ab9cb50 test(48-03): add failing logger tests (RED)
58ffcfa feat(48-03): structured JSON logger (GREEN)
4c379a2 feat(48-03): wire structured logger into middleware + 5 high-traffic routes
bceb976 test(48-03): add metrics endpoint tests (RED)
99ece67 feat(48-03): prometheus-compatible /api/metrics route (GREEN)
af8298e feat(48-04): monitoring.tf + dashboard JSON (OBS-02 + OBS-04)
73d9484 feat(48-04): verify-phase-48.sh phase gate + README Phase 48 section
```

## What Shipped — Aggregate

### New GitHub Actions Workflows (under `.github/workflows/`)
- `pr-checks.yml` — **replaced** v1.4 single-job with 4 parallel gate jobs (typecheck/lint/test/prisma-format)
- `deploy-staging.yml` — **new** merge-to-main WIF + Docker buildx + Secret-Manager + migrate + Cloud Run deploy + health smoke
- `rollback-prod.yml` — **new** manual-dispatch env-parameterized traffic pin to a previous revision
- `load-test.yml` — **new** Phase 49 skeleton with `workflow_dispatch` + labeled-PR trigger
- `wif-smoke.yml` — **DELETED** (P47 artifact no longer needed; WIF is now proven by real workflows)

### App Code (`src/`)
- `src/lib/logger.ts` — **new** 52-line Cloud-Logging-compatible JSON emitter; edge-runtime safe; 11 unit tests
- `src/app/api/metrics/route.ts` — **new** 47-line Prometheus text 0.0.4 endpoint; feature-flagged default-off; 7 unit tests
- `src/middleware.ts` — wired logger with `emitLog(decision)` helper at every exit path; no auth logic changed
- `src/app/api/health/route.ts` — logger wired (info/warn based on 200/503); `latency_ms` emitted
- `src/app/api/public/interview/{start,agent,complete}/route.ts` — 3 routes wired with info/warn/error paths
- `src/app/api/associate/interview/complete/route.ts` — replaced `LOG_PREFIX` console.error with structured logger

**Test count delta:** +18 new tests (11 logger + 7 metrics); all 18 passing. Full suite regression: 1012 → 1026 on P48-affected paths (15 unrelated `codingAttemptPoll.test.ts` failures caused by concurrent commit `2e8d9e5` from P50-02; logged to `deferred-items.md`; out-of-scope per P48 boundary).

### Terraform (`iac/cloudrun/`)
- `monitoring.tf` — **new** 118 lines (dashboard + notification channel + uptime + alert policy + secret-version data source)
- `monitoring/dashboard-nlm-production.json` — **new** 119 lines, 6 widgets (request count, p50/p95/p99 latency, error rate, instance count, CPU, memory)
- `variables.tf` — 3 new vars (uptime_host_staging, uptime_host_prod, alert_notification_email_secret)
- `staging.tfvars` / `prod.tfvars` — explicit uptime-host values per env
- `scripts/verify-phase-48.sh` — **new** 146-line 12-check phase-gate aggregator
- `README.md` — Phase 48 apply-sequence + verify-script pointer section

**Terraform validation:** `terraform fmt` clean; `terraform validate` → **Success**. No live `terraform apply` attempted (unattended rule).

### Runbooks (`.github/`)
- `RUNBOOK-BRANCH-PROTECTION.md` — `gh api -X PUT .../branches/main/protection` command
- `RUNBOOK-WORKFLOW-VARS.md` — `gh variable set STAGING_PROJECT_NUMBER` + `PROD_PROJECT_NUMBER` commands

## Deviations from Plans

- **None inside Phase 48's scope.** All 4 plans executed exactly as written.
- **Scope-boundary finding:** during `npm run test` full-suite run, 15 failures in `src/lib/codingAttemptPoll.test.ts` surfaced — caused by commit `2e8d9e5` (`feat(50-02): …`) landing concurrent with this execution and adding `isCodingEnabled()` guard without updating test harness. Logged to `48-github-actions-ci-deploy-staging-observability/deferred-items.md`. Not fixed (P50 territory, pre-existing to P48 touch-points).

## Auth Gates / Halts — Next Actions for Human Operator

Phase 48 stops at 4 checkpoint gates. **Nothing in Phase 48 mutated live GCP or GitHub settings.** Operator runbook (after all prior phases are live):

### Prerequisite: Phase 47 live
- Staging Cloud Run service `nlm-staging` exists (from Phase 47 apply)
- WIF pool + providers exist in both projects
- First image in Artifact Registry (resolves Phase 47's halted image-push gate — lazy-init `supabaseAdmin` or equivalent)
- Phase 46 Supabase staging DB seeded and DIRECT_URL populated in Secret Manager

### Plan 48-01 live steps
1. Push commits to `main` (merge feature branch)
2. `gh workflow run pr-checks.yml` — expect 4 parallel jobs green in ≤3 min
3. Open scratch PR with deliberate TS error — expect Typecheck job red, merge blocked
4. Run `.github/RUNBOOK-BRANCH-PROTECTION.md` gh command
5. `gh api repos/JesterCharles/mock-interview-assist/branches/main/protection --jq '.required_status_checks.contexts | length'` → expect `4`

### Plan 48-02 live steps
1. Run `.github/RUNBOOK-WORKFLOW-VARS.md` commands (one-time `gh variable set`)
2. Push to `main` → watch `deploy-staging.yml`. Expect: WIF auth OK, digest non-empty, migrate deploy "already up to date", `gcloud run deploy` green, smoke 200/503, total ≤5 min cache-warm
3. Capture previous revision: `gcloud run revisions list --service=nlm-staging --project=nlm-staging-493715 --region=us-central1 --limit=2 --format='value(name)'`
4. `gh workflow run rollback-prod.yml -f env=staging -f revision=<prev>` — expect traffic pin verify match
5. `gh workflow list` shows deploy-staging + rollback-prod + load-test; wif-smoke absent

### Plan 48-04 live steps
1. `cd iac/cloudrun && terraform apply -var-file=staging.tfvars -target=google_monitoring_dashboard.nlm_production -target=google_monitoring_notification_channel.email -target=google_monitoring_uptime_check_config.health -target=google_monitoring_alert_policy.uptime`
2. Same with `prod.tfvars`
3. Click 2 Google Cloud Monitoring verification emails in `jestercharles@gmail.com` inbox
4. `bash iac/cloudrun/scripts/verify-phase-48.sh` → expect "Phase 48 gate: ALL 12 CHECKS PASS" (check 10 may need `NEXT_PUBLIC_METRICS_ENABLED=true` toggle + redeploy for full green)

## Requirements Status

| ID | Code-level | Live-verified |
|----|-----------|--------------|
| CI-01 | ✅ workflow exists | ⏸ blocked on `gh` push + branch protection |
| CI-02 | ✅ workflow exists | ⏸ blocked on first merge + WIF + AR image |
| CI-05 | ✅ workflow exists | ⏸ blocked on first successful deploy (needs previous revision) |
| CI-06 | ✅ cache infra in place | ⏸ blocked on live-run measurement |
| OBS-01 | ✅ logger + 6 wired files | ⏸ blocked on `jsonPayload.env="staging"` Cloud Logging query |
| OBS-02 | ✅ HCL + JSON shipped | ⏸ blocked on `terraform apply` |
| OBS-03 | ✅ route + 404/200 flag behavior covered by unit tests | ⏸ blocked on live `/api/metrics` probe |
| OBS-04 | ✅ HCL shipped | ⏸ blocked on `terraform apply` + email channel verification |

## Commit Range

- First: `d0ab4b5` (feat(48-01): pr-checks.yml)
- Last (code): `73d9484` (feat(48-04): verify-phase-48.sh + README)
- Plus final metadata commit (STATE.md + ROADMAP.md + 4 SUMMARY.md + this log) — to come

## Files Changed Summary

```
New files:
  .github/RUNBOOK-BRANCH-PROTECTION.md
  .github/RUNBOOK-WORKFLOW-VARS.md
  .github/workflows/deploy-staging.yml
  .github/workflows/load-test.yml
  .github/workflows/rollback-prod.yml
  iac/cloudrun/monitoring.tf
  iac/cloudrun/monitoring/dashboard-nlm-production.json
  iac/cloudrun/scripts/verify-phase-48.sh
  src/app/api/metrics/__tests__/route.test.ts
  src/app/api/metrics/route.ts
  src/lib/__tests__/logger.test.ts
  src/lib/logger.ts

Modified files:
  .github/workflows/pr-checks.yml (rewrite)
  iac/cloudrun/README.md
  iac/cloudrun/prod.tfvars
  iac/cloudrun/staging.tfvars
  iac/cloudrun/variables.tf
  src/app/api/associate/interview/complete/route.ts
  src/app/api/health/route.ts
  src/app/api/public/interview/agent/route.ts
  src/app/api/public/interview/complete/route.ts
  src/app/api/public/interview/start/route.ts
  src/middleware.ts

Deleted files:
  .github/workflows/wif-smoke.yml
```

## Health Stack Signals (post-Phase 48)

- `npx tsc --noEmit` → **0 errors**
- `npm run lint` → **0 errors**, 178 warnings (pre-existing, unchanged)
- `npm run test` (P48 tests only) → **18/18 passing** (logger + metrics)
- `npm run test` (full suite) → 1026 passing + 15 pre-existing failures in `codingAttemptPoll.test.ts` (P50-02 scope; documented in `deferred-items.md`)
- `terraform fmt` → clean
- `terraform validate` → Success
