# Phase 43: MSA Deployment — Discussion Log

> Audit trail only. Decisions captured in CONTEXT.md.

**Date:** 2026-04-18
**Mode:** `--auto`
**Areas:** Terraform topology, module structure, CI/CD shape, monitoring, runbook

---

## Topology

| Option | Selected |
|--------|----------|
| Two-VM separation (app + dedicated Judge0) | ✓ (recommended — MSA-from-day-1) |
| Single VM | Rejected — scale bottleneck |
| GKE | Rejected — over-engineering |

## State Backend

| Option | Selected |
|--------|----------|
| GCS bucket with versioning | ✓ (recommended) |
| Local state | Foot-gun |
| Terraform Cloud | Added dependency |

## CI/CD

| Option | Selected |
|--------|----------|
| Two tag-triggered workflows (app-v* / judge0-v*) | ✓ (recommended — independent cadence) |
| Single mega workflow | Couples deploys |
| Manual-only | Rejected — IAC-02 demands automation |

## Health + Rollback

| Option | Selected |
|--------|----------|
| Post-deploy `/api/health` probe + SSH rollback on fail | ✓ (IAC-03) |
| No rollback | Rejected |

## Monitoring

| Option | Selected |
|--------|----------|
| Cron-pushed metrics to GCE Logs Explorer | ✓ (recommended — no new infra) |
| Prometheus stack | v1.5+ |
| Nothing | Rejected — IAC-04 |

## Runbook

| Option | Selected |
|--------|----------|
| Single `docs/runbooks/coding-stack.md` | ✓ (IAC-05) |

## Staging Split

| Option | Selected |
|--------|----------|
| Defer to v1.5 (backlog 999.1) | ✓ (per existing backlog) |
