---
phase: 49-k6-load-test-hardening
plan: 02
subsystem: ci-loadtest
tags: [load-test, ci, LOAD-02, LOAD-03, HARD-01]
requires: [49-01]
provides:
  - .github/workflows/load-test.yml (filled body)
  - loadtest/scripts/fetch-cloud-run-metrics.sh
  - loadtest/scripts/fetch-supabase-query-count.sh
  - .planning/loadtest-baseline-v1.5.md (shell — awaits live data)
affects:
  - Phase 48 workflow shell (superseded)
tech-stack:
  added: [grafana/k6-action@v0.3, google-github-actions/auth@v2 (reused from Phase 47)]
  patterns: [WIF-only-auth, soft-fail-to-JSON-error, staging-guard-on-trigger]
key-files:
  created:
    - loadtest/scripts/fetch-cloud-run-metrics.sh
    - loadtest/scripts/fetch-supabase-query-count.sh
    - .planning/loadtest-baseline-v1.5.md (shell, live data pending)
  modified:
    - .github/workflows/load-test.yml (shell → filled body)
decisions:
  - UNATTENDED halt: staging not yet deployed, so checkpoint:human-verify (Task 2) cannot fire.
    Code artifacts all shipped; runbook embedded in the baseline shell.
  - Helper scripts soft-fail to { error } JSON so the workflow still publishes all other artifacts.
  - Supabase query count helper accepts "instrumentation pending" (D-08) and emits queries_per_session: null
    until Prisma is correlated to X-Session-ID headers in v1.6 observability polish.
metrics:
  duration: ~15min
  completed: 2026-04-18
---

# Phase 49 Plan 02: Load-Test Workflow + Metric Helpers Summary

Plan 02 filled in `.github/workflows/load-test.yml` (Phase 48 delivered only the shell), added the two post-run helper scripts, and seeded `.planning/loadtest-baseline-v1.5.md` with a PENDING shell + runbook. Actual live run is deferred to UNATTENDED-mode halt policy (staging not yet deployed).

## GH Actions workflow structure

- **Triggers:** `workflow_dispatch` (required `target` input), `push` tag `v*`, `pull_request` with label `run-load-test`.
- **Permissions:** `id-token: write` + `contents: read` (WIF only).
- **Auth:** `google-github-actions/auth@v2` with `GCP_WIF_PROVIDER_STAGING` + `GCP_SA_STAGING_DEPLOYER` secrets (Phase 47 fixture).
- **Guard step:** exits 3 if target does not start with `https://staging.` (T-49-01, T-49-05).
- **k6 step:** `grafana/k6-action@v0.3` with `filename: loadtest/baseline.js`, `fail_on_threshold_fail: true`, flags `--out json=/tmp/loadtest-result.json --summary-export=/tmp/loadtest-summary.json`.
- **Post-run:** fetch-cloud-run-metrics.sh + fetch-supabase-query-count.sh (always-run).
- **Artifact upload:** `actions/upload-artifact@v4`, name `loadtest-${run_id}`, retention 30 days, all four JSON files.

## Helper script behavior

**fetch-cloud-run-metrics.sh:**
- Reads `run.googleapis.com/container/cpu/utilizations` + `.../memory/utilizations` for the last 15 min via `gcloud monitoring time-series list`.
- Aggregates: `peak_cpu_pct`, `peak_mem_pct`, `total_vcpu_seconds`, `total_gb_seconds`.
- Soft-fails to `{ error, source }` JSON on missing gcloud / jq / samples.

**fetch-supabase-query-count.sh:**
- `gcloud logging read` groups by `jsonPayload.headers.x-session-id` for the last 15 min.
- Emits `{ sessions_observed, queries_per_session: { p50, p95, max, min } }`.
- Accepted caveat: if app does not yet instrument the header (current state), emits `queries_per_session: null` + TBD note.

## Observed metrics

PENDING — no live run executed (UNATTENDED mode). Populate via the runbook embedded in `.planning/loadtest-baseline-v1.5.md` once staging is deployed.

## Caveats surfaced to SECURITY-v1.5-followups.md

- PHASE-49-FOLLOWUP-04: Live abuse-test resume
- PHASE-49-FOLLOWUP-05: Live load-test resume to overwrite baseline shell
- PHASE-49-FOLLOWUP-01: Supabase query-count instrumentation (v1.6)

## Deviations from Plan

- **[UNATTENDED halt]** Task 2 (checkpoint:human-verify: live GH Actions run) cannot run because staging is not yet deployed. Task 3 (commit real baseline md) likewise deferred — committed a PENDING shell with the exact populate-runbook embedded so a human can resume in one shell invocation.
- **[Rule 3 - Blocking]** Renamed workflow display name from `Phase 49 placeholder` to `k6 Load Test` for clarity — trivial metadata fix.

## Next Step

Plan 04 wraps Phase 49 with STRIDE + codex; live-run resume deferred to the post-deploy gate.

## Self-Check: PASSED

- .github/workflows/load-test.yml — FOUND (contains grafana/k6-action@v0.3, fail_on_threshold_fail: true, staging guard)
- loadtest/scripts/fetch-cloud-run-metrics.sh — FOUND (executable)
- loadtest/scripts/fetch-supabase-query-count.sh — FOUND (executable)
- .planning/loadtest-baseline-v1.5.md — FOUND (4 required metric headings present)
- All commits present on branch `chore/v1.5-archive-v1.4`
