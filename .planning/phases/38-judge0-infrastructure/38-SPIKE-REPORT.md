---
gate: JUDGE-06
status: DEFERRED — docker daemon unavailable on executor host
blocks: Phase 39
last_updated: 2026-04-18
---

# Phase 38 Spike Report — JUDGE-06 Gate

> **Status: DEFERRED.** This report is a placeholder. The spike run requires a live Docker daemon and Judge0 stack. Executor host (colima) was not running at Phase 38 execution time. See `SPIKE-VERIFICATION.md` in this directory for the manual run protocol.

## Environment

_(To be filled in at live-run time.)_

- VM class: _TBD — verify current GCE instance (`gcloud compute instances describe`) or record local docker host specs_
- Docker version: _TBD_
- Judge0 image digest: _TBD — populated from `docker image inspect judge0/judge0:1.13.1`_
- Date: _TBD_

## Methodology

- Harness: `scripts/judge0-spike.ts` (committed 66fdc36)
- Fixtures: 10 in `scripts/judge0-spike-fixtures/` (2 python, 2 javascript, 2 typescript, 2 java, 1 sql, 1 csharp)
- Runs: 3 iterations, 10-sec rest between runs, `docker stats` sampled every ~1 sec

## Results per Run

_(To be filled in.)_

| Run | Wall Clock (s) | All Correct | Peak CPU server | Peak CPU workers | Peak RAM server | Peak RAM workers |
|-----|----------------|-------------|-----------------|-------------------|------------------|-------------------|
| 1   | _TBD_          | _TBD_       | _TBD_           | _TBD_             | _TBD_            | _TBD_             |
| 2   | _TBD_          | _TBD_       | _TBD_           | _TBD_             | _TBD_            | _TBD_             |
| 3   | _TBD_          | _TBD_       | _TBD_           | _TBD_             | _TBD_            | _TBD_             |

## Latency p50/p95 per Language

_(To be filled in.)_

| Language   | p50 (s) | p95 (s) |
|------------|---------|---------|
| python     | _TBD_   | _TBD_   |
| javascript | _TBD_   | _TBD_   |
| typescript | _TBD_   | _TBD_   |
| java       | _TBD_   | _TBD_   |
| sql        | _TBD_   | _TBD_   |
| csharp     | _TBD_   | _TBD_   |

## Peak Resource Utilization per Container

_(To be filled in across all 3 runs.)_

| Container       | Peak CPU % | Peak Mem (MiB) | Peak Mem % of limit |
|-----------------|------------|----------------|---------------------|
| judge0-server   | _TBD_      | _TBD_          | _TBD_               |
| judge0-workers  | _TBD_      | _TBD_          | _TBD_               |
| judge0-db       | _TBD_      | _TBD_          | _TBD_               |
| judge0-redis    | _TBD_      | _TBD_          | _TBD_               |

## Gate Verdict

**DEFERRED** — cannot evaluate without spike run.

Gate criteria (D-19) for reference:
- [ ] All 30 submissions across 3 runs correct
- [ ] Each run's wall clock ≤ 30 sec
- [ ] Peak CPU per container ≤ 80% of limit (≥ 20% headroom)
- [ ] Peak RAM per container ≤ 80% of limit (≥ 20% headroom)

## Committed Resource Limits

_(To be filled in after PASS. Current `docker-compose.yml` carries placeholders.)_

Placeholders (from Plan 38-01 pending spike commit):
- judge0-server: 2 cpu / 2G
- judge0-workers: 2 cpu / 2G
- judge0-db: 1 cpu / 1G
- judge0-redis: 0.5 cpu / 512M

## Follow-ups

- `JUDGE0_LANGUAGE_MAP` verification against live `/languages` (D-14)
- Phase 43 Terraform module seed values
- Phase 44 load test baseline (50 concurrent)
- Consider `/api/health/app` if app container restart loops during Judge0 cold start

## Remediation path (if spike FAILS)

1. If RAM-bound: raise container memory limit and rerun; OR upsize GCE VM class → Phase 43 Terraform adjustment
2. If CPU-bound: tune `COUNT_WORKERS` down to reduce contention
3. If language-specific timeout: raise `MAX_CPU_TIME_LIMIT` for that language or exclude from v1.4 scope
4. Document all decisions in this report before approving
