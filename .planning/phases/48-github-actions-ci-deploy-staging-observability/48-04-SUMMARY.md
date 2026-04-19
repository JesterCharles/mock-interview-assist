---
phase: 48
plan: 04
subsystem: observability-infra
tags: [observability, cloud-monitoring, terraform, uptime-check, alert-policy, phase-gate]
dependency-graph:
  requires: [48-01, 48-02, 48-03, 45-secret-manager]
  provides: [nlm-production-dashboard, uptime-checks, email-alert-policy, phase-gate-script]
  affects: [nlm-staging-493715, nlm-prod, ADMIN_EMAILS-secret-read-path]
tech-stack:
  added: []
  patterns: [templatefile-dashboard-json, data-secret-manager-secret-version, alert-policy-2-consecutive-window]
key-files:
  created:
    - iac/cloudrun/monitoring.tf
    - iac/cloudrun/monitoring/dashboard-nlm-production.json
    - iac/cloudrun/scripts/verify-phase-48.sh
  modified:
    - iac/cloudrun/variables.tf
    - iac/cloudrun/staging.tfvars
    - iac/cloudrun/prod.tfvars
    - iac/cloudrun/README.md
decisions:
  - Same dashboard JSON in both projects via per-env `terraform apply -var-file=<env>.tfvars` (D-12)
  - Alert policy uses 2-consecutive-60s-windows (120s duration + ALIGN_FRACTION_TRUE < 1) — canonical Cloud Monitoring pattern for uptime alerts
  - Email channel recipient pulled from Secret Manager ADMIN_EMAILS via `data.google_secret_manager_secret_version` + split + first entry (D-14)
  - Uptime check accepts 2xx + 503 per D-13 + D-24 (staging Prisma transient failures must not page)
  - `auto_close = 1800s` to prevent brief recoveries between failures from hiding recurring issues
  - No Slack/PagerDuty per CONTEXT.md Deferred Ideas — single email channel (T-48-05 alert-fatigue mitigation)
metrics:
  completed-date: 2026-04-18
  duration-min: 2
  tasks-total: 3
  tasks-autonomous-completed: 2
  tasks-halted: 1
  commits: 2
---

# Phase 48 Plan 04: Cloud Monitoring Dashboard + Uptime + Alert Policy Summary

**One-liner:** Shipped `monitoring.tf` (NLM Production dashboard + uptime check + email alert policy sourced from ADMIN_EMAILS Secret Manager secret) and `verify-phase-48.sh` phase-gate aggregator covering all 12 must-haves; `terraform fmt` + `terraform validate` both green.

## What Shipped

### `iac/cloudrun/monitoring.tf` (118 lines)
- **`google_monitoring_dashboard.nlm_production`** — `templatefile()` reads `dashboard-nlm-production.json` and injects `env` + `project_id`; one dashboard per env (D-12)
- **`data.google_secret_manager_secret_version.admin_emails`** — pulls ADMIN_EMAILS (version=latest) at apply time; `trimspace(split(",", …)[0])` extracts first entry
- **`google_monitoring_notification_channel.email`** — `type=email`, `labels.email_address = local.admin_email_first`
- **`google_monitoring_uptime_check_config.health`** — 60s period, 10s timeout, path `/api/health`, port 443, `validate_ssl=true`, accepts `STATUS_CLASS_2XX` + explicit `503`, `monitored_resource.type=uptime_url` with per-env host from `local.uptime_host`
- **`google_monitoring_alert_policy.uptime`** — `combiner=OR`; condition `metric.type="monitoring.googleapis.com/uptime_check/check_passed"` filtered by the uptime check's `check_id`; `duration=120s` + `ALIGN_FRACTION_TRUE` + `REDUCE_COUNT_FALSE` over 60s windows = 2 consecutive failures before firing; `auto_close=1800s`; markdown documentation content with console link

### `iac/cloudrun/monitoring/dashboard-nlm-production.json` (119 lines)
6-widget mosaic (12-col grid):
- Request count (LINE, REDUCE_SUM grouped by service_name)
- Request latency p50/p95/p99 (3 LINE series on same chart)
- Error rate 5xx / total (LINE using `timeSeriesFilterRatio`)
- Instance count (LINE, REDUCE_SUM grouped by service_name)
- CPU utilization p95 (LINE)
- Memory utilization p95 (LINE)

All widgets templated with `${env}` and `${project_id}` — same JSON, both projects, per D-12.

### `iac/cloudrun/variables.tf`
Added 3 vars: `uptime_host_staging` (default `staging.nextlevelmock.com`), `uptime_host_prod` (default `nextlevelmock.com`), `alert_notification_email_secret` (default `ADMIN_EMAILS`).

### `iac/cloudrun/staging.tfvars` + `prod.tfvars`
Explicit `uptime_host_staging` / `uptime_host_prod` per env for audit clarity (defaults already correct).

### `iac/cloudrun/scripts/verify-phase-48.sh` (146 lines, executable, bash-syntax-valid)
12-check aggregator:
1. `pr-checks.yml` workflow registered (`gh workflow list`)
2. Branch protection has 4 required checks (`gh api`)
3. `deploy-staging.yml` workflow registered
4. Last `deploy-staging.yml` run conclusion = `success`
5. `https://staging.nextlevelmock.com/api/health` returns 200
6. `rollback-prod.yml` present + last run succeeded
7. Cloud Logging has `jsonPayload.env="staging"` entries (proves OBS-01)
8. Dashboards in both projects (`gcloud monitoring dashboards list`)
9. Uptime checks in both projects (`gcloud monitoring uptime list-configs`)
10. `/api/metrics` returns Prometheus text (flag on)
11. `/api/metrics` returns 404 (flag off default)
12. Alert policy → email channel → `jestercharles@gmail.com`

`set -u` only (not `set -e`) so all checks run and failures aggregate; exit code = failure count.

### `iac/cloudrun/README.md`
Appended Phase 48 section with targeted-apply commands (`terraform apply -var-file=<env>.tfvars -target=<resource>`), email-verification note (one-time click for each channel), and pointer to `verify-phase-48.sh`.

## Commits

| # | Hash | Message |
|---|------|---------|
| 1 | `af8298e` | feat(48-04): monitoring.tf + dashboard JSON (OBS-02 + OBS-04) |
| 2 | `73d9484` | feat(48-04): verify-phase-48.sh phase gate + README Phase 48 section |

## Validation

- `terraform fmt monitoring.tf` → clean (no changes)
- `terraform validate` → **Success! The configuration is valid.**
- `python3 -c "import json; json.load(open('monitoring/dashboard-nlm-production.json'))"` → no errors
- `bash -n iac/cloudrun/scripts/verify-phase-48.sh` → no syntax errors
- `test -x iac/cloudrun/scripts/verify-phase-48.sh` → executable bit set

## Deviations from Plan

None. Plan executed exactly as written.

## Auth Gates / Human Checkpoints

**Task 3 (Apply monitoring TF + run verify-phase-48.sh) — HALTED per unattended mode rules.**

Per executor prompt: "For monitoring.tf (48-04): write HCL, `terraform fmt + validate`, HALT before apply." HCL shipped + validated; deferred human steps:

1. `cd iac/cloudrun && terraform apply -var-file=staging.tfvars -target=google_monitoring_dashboard.nlm_production -target=google_monitoring_notification_channel.email -target=google_monitoring_uptime_check_config.health -target=google_monitoring_alert_policy.uptime`
2. Same for `prod.tfvars`
3. Check `jestercharles@gmail.com` inbox for 2 Google Cloud Monitoring verification emails (one per channel, one per project) — click both links
4. Open `https://console.cloud.google.com/monitoring/dashboards?project=nlm-staging-493715` and `...?project=nlm-prod`; confirm `NLM Production` dashboard is listed in both with all 6 widgets rendering
5. `bash iac/cloudrun/scripts/verify-phase-48.sh` → expect "Phase 48 gate: ALL 12 CHECKS PASS" once everything is live

Checks 10 + 11 depend on the staging Cloud Run service existing and `NEXT_PUBLIC_METRICS_ENABLED=true` being temporarily set for rehearsal (runbook documents the toggle).

## Requirements Satisfied (code-level)

- **OBS-02** — NLM Production dashboard provisioned terraform-side with identical schema across staging + prod via templatefile.
- **OBS-04** — uptime check + email alert policy provisioned; recipient pulled from Secret Manager (no hardcoded emails).

## Threat Mitigations Verified

| Threat | Mitigation |
|--------|-----------|
| T-48-05 (Alert fatigue) | 2-consecutive-60s-window threshold = 120s minimum latency-to-alert; single email channel (no Slack/PagerDuty multiplication); `auto_close=1800s` batches recurring failures |
| T-48-05a (Email channel tampering) | Recipient sourced from Secret Manager ADMIN_EMAILS; changing it requires `roles/secretmanager.secretVersionAdder` on the secret |

## Self-Check: PASSED

- Files exist:
  - `iac/cloudrun/monitoring.tf` — FOUND (118 lines)
  - `iac/cloudrun/monitoring/dashboard-nlm-production.json` — FOUND (119 lines, 6 widgets)
  - `iac/cloudrun/scripts/verify-phase-48.sh` — FOUND (executable, bash-valid)
  - Variable additions in `variables.tf` + per-env tfvars — FOUND
  - README Phase 48 section — FOUND
- Commits exist: `af8298e`, `73d9484` — both FOUND
- Resource types in monitoring.tf: `google_monitoring_dashboard`, `google_monitoring_uptime_check_config`, `google_monitoring_alert_policy`, `google_monitoring_notification_channel`, `data.google_secret_manager_secret_version` — all present
- `terraform validate` → Success
- `python3 json.load` dashboard JSON → parses
