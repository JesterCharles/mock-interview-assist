---
phase: 43-msa-deployment
plan: 03
subsystem: observability
tags: [metrics, logging, judge0, cron]
dependency-graph:
  requires: [plan 43-01 metrics SA (logWriter only)]
  provides: [queue-depth + p50/p95 signals in Logs Explorer]
  affects: [alert thresholds (D-12), runbook §2 + appendix B (plan 43-04)]
tech-stack:
  added: []
  patterns: [nearest-rank percentile, execFileSync for shell-free gcloud invocation, import-vs-direct-invocation guard for test reuse]
key-files:
  created:
    - scripts/push-judge0-metrics.mjs
    - scripts/push-judge0-metrics.test.mjs
  modified: []
decisions:
  - Nearest-rank percentile (not linear interpolation) — simpler and matches ops tool conventions
  - Queue depth approximated via status_id filter (1=queued, 2=processing) — Judge0 1.13.x doesn't expose a dedicated queue endpoint
  - Script exits 0 on Judge0 unreachable (still emits ERROR-severity log) so cron keeps running
  - Script exits 1 on gcloud failure so systemd surfaces the break
metrics:
  duration: ~8 min (RED + GREEN)
  completed: 2026-04-18
  tests: 6 passing
---

# Phase 43 Plan 03: Judge0 Metrics Pusher Summary

One-liner: 60-sec cron job fetches Judge0 queue depth + submission latency
p50/p95 and emits structured JSON to GCE Logs Explorer; 6 unit tests cover
percentile edge cases and payload shape.

## TDD Flow

- **RED** (commit 41806a3) — `scripts/push-judge0-metrics.test.mjs` with 6
  failing tests (module not found).
- **GREEN** (commit af1f120) — `scripts/push-judge0-metrics.mjs` implements
  `computePercentiles` + `buildLogPayload` + fetch/write main. 6/6 pass.
- **REFACTOR** — not needed; implementation was clean on first pass.

## Final Log Schema

OK entry:
```json
{
  "timestamp": "2026-04-18T12:34:56.789Z",
  "status": "ok",
  "queueDepth": 7,
  "p50Ms": 420,
  "p95Ms": 1830,
  "sampleSize": 42,
  "judge0Version": "1.13.1"
}
```

Unreachable entry (severity=ERROR):
```json
{
  "timestamp": "...",
  "status": "unreachable",
  "error": "ECONNREFUSED"
}
```

## Queue Depth Derivation

Chosen: count submissions with `status_id ∈ {1, 2}` in the sampled recent
submissions list (max 100). Judge0 1.13.x exposes no dedicated queue-depth
endpoint; this approximation is adequate for the D-12 alert threshold
(queueDepth > 50 sustained 5 min).

Future enhancement: if Judge0 2.x or a Prometheus exporter lands, swap in a
direct queue length query.

## Queue Depth / Latency Source Endpoints

| Endpoint | Fields consumed |
|----------|-----------------|
| `GET /system_info` | `version` (defensive: falls through several shapes) |
| `GET /submissions?fields=status_id,time&per_page=100` | `status_id` (queue count), `time` (latency in seconds → ms) |

Auth: `X-Auth-Token` header when `JUDGE0_AUTH_TOKEN` env var is set.

## GCE Logs Write

Command shape (no shell — `execFileSync` with args array):

```
gcloud logging write judge0-metrics '<json>' --payload-type=json --severity=(INFO|ERROR)
```

Auth on the VM: instance metadata picks up the `nlm-judge0-metrics` SA
attached via Plan 43-01 `judge0-vm.tf`. No key file required.

## Alert Threshold Queries (for Plan 43-04 runbook)

```
logName="projects/${PROJECT}/logs/judge0-metrics"
jsonPayload.queueDepth > 50        # sustained 5 min → page
jsonPayload.p95Ms > 15000          # sustained 5 min → page
jsonPayload.status = "unreachable" # sustained 2 min → page (catastrophic)
```

## systemd Snippet for Runbook

Documented in runbook Appendix B. Service is `Type=oneshot`, timer fires
`OnUnitActiveSec=60s` with `AccuracySec=5s`.

## Deviations from Plan

None — plan executed as written.

## Self-Check: PASSED

- `scripts/push-judge0-metrics.mjs`: FOUND
- `scripts/push-judge0-metrics.test.mjs`: FOUND
- 6/6 tests passing
- `node --check`: PASS
- Commits 41806a3 + af1f120: FOUND on main
