# Phase 48: GitHub Actions CI + Deploy-Staging + Observability - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning
**Mode:** `--auto`

<domain>
## Phase Boundary

Phase 48 delivers the **CI/CD + observability plane**: PR gating (`pr-checks.yml`), auto-deploy-on-merge (`deploy-staging.yml`), rollback workflow (`rollback-prod.yml`), structured logging wired into the Next.js app, Cloud Monitoring dashboard + uptime check, and a `/api/metrics` endpoint. All workflows authenticate via WIF (Phase 47). Cache + parallelization tuned for <5min merge-to-live.

**In scope:** `.github/workflows/pr-checks.yml`, `.github/workflows/deploy-staging.yml`, `.github/workflows/rollback-prod.yml`, `.github/workflows/load-test.yml` (workflow file only — k6 scenarios in Phase 49), replacement of `.github/workflows/wif-smoke.yml` with production workflows, structured logging middleware, `/api/metrics` route, Cloud Monitoring dashboard + uptime check provisioned via terraform, ADMIN_EMAILS alert email bind.

**Out of scope:** Prod-specific `deploy-prod.yml` (Phase 51), k6 scenario scripts (Phase 49), Judge0 integration (Phase 50), DNS cutover (Phase 52), Supabase metrics (deferred).

</domain>

<decisions>
## Implementation Decisions

### CI Workflows (CI-01, CI-02, CI-05, CI-06)
- **D-01:** `pr-checks.yml` triggers: `pull_request` (all branches → main) + `push` (main only). Jobs: `typecheck` (`npx tsc --noEmit`), `lint` (`npm run lint`), `test` (`npm run test`), `prisma-format` (`npx prisma format && git diff --exit-code prisma/schema.prisma`). All jobs run in parallel; PR blocked if any fails.
- **D-02:** `deploy-staging.yml` triggers: `push` on `main`. Jobs (sequential):
  1. Build + push image (buildx + GH Actions cache; tag `:latest` + digest; digest emitted as step output)
  2. `prisma migrate deploy` against staging `DIRECT_URL` (pulled from Secret Manager)
  3. `gcloud run deploy nlm-staging --image=us-central1-docker.pkg.dev/.../nlm-app@<digest>` (digest from job 1)
  4. Post-deploy smoke: `curl -sf https://staging.nextlevelmock.com/api/health | head -1 | grep 200` (accepts 503 too per INFRA-07 relaxation — staging DB may be slow)
  5. On failure: post to Slack/email (ADMIN_EMAILS)
- **D-03:** Auth: WIF via `google-github-actions/auth@v2` + `id-token: write` permission. No SA JSON keys. Staging and prod each use their own WIF pool per Phase 47 D-14.
- **D-04:** `rollback-prod.yml`: manual `workflow_dispatch` with input `revision` (string, defaults to "previous"). Job: `gcloud run services update-traffic nlm-<env> --to-revisions=<revision>=100` — parameterized by env input (`staging` or `prod`). Rehearsed against staging in Phase 48 (prod wiring also provisioned but only fires in Phase 52 when prod is live).
- **D-05:** `load-test.yml`: `workflow_dispatch` only (+ `pull_request` if `labels` contains `run-load-test`). Job: run k6 scenario (scenario file is Phase 49's Plan 01 — Phase 48 creates the workflow shell only, which `echo "Phase 49 fills this in"`).
- **D-06:** Cache: Docker layer cache via `type=gha` in `docker/build-push-action@v5`; npm cache via `actions/setup-node@v4` with `cache: 'npm'`; Prisma client generation cached by Docker layer already. Target: total `deploy-staging.yml` runtime ≤ 5 min.

### Observability (OBS-01..04)
- **D-07:** Structured logging: use existing `console.log` pattern but wrap via `src/lib/logger.ts` (new). Emits JSON with fields `{severity, message, trace_id, env, route, ...extra}`. Cloud Logging auto-parses JSON to structured logs.
- **D-08:** `severity` follows Cloud Logging levels: `DEBUG|INFO|WARNING|ERROR|CRITICAL`.
- **D-09:** Route-level logging added only in middleware and the 3 highest-traffic routes: `/api/health`, `/api/public/interview/*`, `/api/associate/interview/complete`. Everything else keeps existing stdout behavior (Cloud Run auto-captures). Minimize diff blast radius.
- **D-10:** `/api/metrics` route in `src/app/api/metrics/route.ts`: Prometheus text exposition format 0.0.4. Zero-valued gauges for `nlm_http_requests_total`, `nlm_http_request_duration_seconds`, `nlm_active_sessions`, `nlm_session_completions_total`. Phase-48 lands the endpoint with static zeros; actual metric instrumentation = Phase 49+.
- **D-11:** `/api/metrics` is **feature-flagged** via `NEXT_PUBLIC_METRICS_ENABLED=true` (default false). When disabled, route returns 404. Avoids accidental info leak before hardening.
- **D-12:** Cloud Monitoring dashboard `NLM Production` provisioned via terraform `google_monitoring_dashboard` (JSON config in `iac/cloudrun/monitoring/dashboard-nlm-production.json`). 6 widgets: request count, p50/p95/p99 latency, error rate, instance count, CPU util, memory util. **Same dashboard definition in both staging and prod projects** (per OBS-02 "same schema deployed").
- **D-13:** Uptime check provisioned via terraform `google_monitoring_uptime_check_config` on `https://nextlevelmock.com/api/health` + `https://staging.nextlevelmock.com/api/health`. Alert policy emails `jestercharles@gmail.com` (from ADMIN_EMAILS secret) on consecutive-failure. **Note: prod uptime check is configured in Phase 48 but targets `nextlevelmock.com` which is still v0.1 GCE until Phase 52 cutover** — the check will pass against v0.1 until then. Alert policy thresholds: 2 consecutive failures = email.
- **D-14:** Alert policy terraform resource: `google_monitoring_alert_policy`. Channel type `email`; channel recipient = `ADMIN_EMAILS` secret value (fetched at apply time via `data.google_secret_manager_secret_version`).

### File Layout
- **D-15:** New workflows under `.github/workflows/` (new dir if repo has no prior workflows — it doesn't). Delete `.github/workflows/wif-smoke.yml` (Phase 47 artifact; no longer needed).
- **D-16:** New HCL: `iac/cloudrun/monitoring.tf` (dashboard + uptime + alert), with `iac/cloudrun/monitoring/dashboard-nlm-production.json` config. Reuses `env` variable from Phase 45.
- **D-17:** `src/lib/logger.ts` new file; adopted in 4 call sites (middleware + 3 routes per D-09).
- **D-18:** `src/app/api/metrics/route.ts` new route.

### Deployment Discipline
- **D-19:** `deploy-staging.yml` pulls DATABASE_URL / DIRECT_URL / etc. via `google-github-actions/get-secretmanager-secrets@v2` rather than making them workflow-level secrets. This keeps Secret Manager as single source of truth.
- **D-20:** `prisma migrate deploy` runs **before** `gcloud run deploy` — schema-first. Fails deploy if migration fails.
- **D-21:** Digest pinning: deploy uses the digest emitted by the build step, never `:latest`. Runbook shows how to re-deploy an older digest manually (the rollback workflow automates this).

### Claude's Discretion
- Exact GitHub Actions versions (`@v4` vs `@v5`) — planner picks latest stable at time of plan.
- Whether to combine `pr-checks.yml` jobs into one multi-step or keep them as 4 parallel jobs — lean toward parallel (faster feedback).
- Dashboard JSON widget details — copy GCP official "Cloud Run service overview" dashboard template as base.
- How many consecutive failures trigger alert (2-3 range; planner picks 2 per D-13).
- Whether `/api/metrics` lives in `src/app/api/metrics/route.ts` (App Router) or elsewhere — stick with App Router.

### Folded Todos
None.

</decisions>

<canonical_refs>
## Canonical References

### Milestone anchor
- `.planning/REQUIREMENTS.md` §CI (CI-01, CI-02, CI-05, CI-06), §OBS (OBS-01..04)
- `.planning/ROADMAP.md` §Phase 48 success criteria 1-6
- `.planning/phases/47-*/47-CONTEXT.md` (D-13..19 WIF pool + SA bindings — consumed by workflows)
- `.planning/phases/47-*/47-RESEARCH.md` (operational scripts, SA role matrix)
- `.planning/phases/45-*/45-CONTEXT.md` (D-07 Registry, D-09 secret names, D-11 SAs)
- `.planning/phases/46-*/46-CONTEXT.md` (D-12: Phase 46 proved `migrate deploy` locally; Phase 48 wires into CI)

### Existing code
- `package.json` — `npm run test` uses vitest; `lint` uses ESLint; `build` runs Next 16.
- `src/middleware.ts` — auth middleware; adding logger in middleware needs care (edge runtime constraints).
- `src/app/api/health/route.ts`, `src/app/api/public/interview/*`, `src/app/api/associate/interview/complete/route.ts` — loggable routes.
- `next.config.ts` — already sets `outputFileTracingRoot` + `transpilePackages`.

### External specs
- GitHub Actions: `google-github-actions/auth@v2`, `google-github-actions/setup-gcloud@v2`, `google-github-actions/get-secretmanager-secrets@v2`, `docker/setup-buildx-action@v3`, `docker/build-push-action@v5`, `actions/setup-node@v4`.
- Cloud Logging structured JSON: [LogEntry jsonPayload](https://cloud.google.com/logging/docs/structured-logging).
- Prometheus exposition 0.0.4: [text format spec](https://prometheus.io/docs/instrumenting/exposition_formats/).
- Cloud Monitoring: `google_monitoring_dashboard`, `google_monitoring_uptime_check_config`, `google_monitoring_alert_policy`.
- Cloud Run deploy action: [`google-github-actions/deploy-cloudrun@v2`](https://github.com/google-github-actions/deploy-cloudrun).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/rateLimitService.ts` and `src/lib/readinessSweep.ts` — existing backend patterns for logger integration.
- `src/middleware.ts` — target for request logging (edge-safe `console.log` JSON).
- `vitest.config.ts` — test runner already present; CI reuses.
- `next.config.ts` — no changes needed.

### Established Patterns
- No existing `src/lib/logger.ts` — new file.
- No existing `.github/workflows/` (aside from `wif-smoke.yml` created in Phase 47).
- CI has no prior state to honor.

### Integration Points
- Phase 49 k6 scenarios slot into `load-test.yml` (workflow shell lands in Phase 48).
- Phase 51 `deploy-prod.yml` clones staging workflow structure.
- Phase 52 cutover: uptime check target stays the same (`nextlevelmock.com/api/health`); only the DNS backend changes. No Phase 48 change needed.

</code_context>

<specifics>
## Specific Ideas

- User wants **merge-to-staging in under 5 min** (CI-06). Achievable with Docker layer cache + npm cache + skipping playwright/e2e on PR (only unit tests on PR).
- **Rollback must be 1-command** — Phase 48 wires `rollback-prod.yml` now even though prod goes live in Phase 52.
- **Email alerts to jestercharles@gmail.com** (ADMIN_EMAILS secret). Note: Google Cloud email notification channels need UI confirmation once — runbook step.
- **No Slack / PagerDuty** in v1.5 — email only.
- **Metrics endpoint is a stub** — just proves the path exists. Real metrics instrumentation deferred.

</specifics>

<deferred>
## Deferred Ideas

- **E2E tests in CI** (Playwright) — deferred; currently vitest-only.
- **Canary / blue-green deploys** — deferred; Cloud Run revisions + traffic shift is enough.
- **Slack / PagerDuty integration** — deferred.
- **Error budget tracking / SLO burn alerts** — deferred to v1.6 observability polish.
- **Request tracing (OpenTelemetry)** — deferred; Cloud Trace auto-captures Cloud Run spans already.
- **Log-based metrics** (e.g., 5xx rate derived from logs) — deferred; dashboard uses built-in Cloud Run metrics.
- **Audit trail for who-triggered-rollback** — GH Actions logs cover it; no additional wiring.

### Reviewed Todos (not folded)
None.

</deferred>

---

*Phase: 48-github-actions-ci-deploy-staging-observability*
*Context gathered: 2026-04-18 (auto mode)*
