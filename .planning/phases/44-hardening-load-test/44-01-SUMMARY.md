---
phase: 44-hardening-load-test
plan: 01
subsystem: load-test + abuse-test harnesses
tags: [hardening, load-test, abuse-test, judge0, deployed]
status: PARTIAL — harnesses shipped; execution deferred to human
dependency_graph:
  requires: [Phase 38 sandbox caps, Phase 39 submit/poll routes, Phase 43 deployed stack]
  provides: [scripts/load-test-coding.ts, scripts/abuse-test-coding.ts, 16 fixtures]
  affects: [package.json]
key_files:
  created:
    - scripts/load-test-coding.ts
    - scripts/load-test-fixtures/python-1.json
    - scripts/load-test-fixtures/python-2.json
    - scripts/load-test-fixtures/javascript-1.json
    - scripts/load-test-fixtures/javascript-2.json
    - scripts/load-test-fixtures/typescript-1.json
    - scripts/load-test-fixtures/typescript-2.json
    - scripts/load-test-fixtures/java-1.json
    - scripts/load-test-fixtures/java-2.json
    - scripts/load-test-fixtures/sql-1.json
    - scripts/load-test-fixtures/csharp-1.json
    - scripts/abuse-test-coding.ts
    - scripts/abuse-test-fixtures/fork-bomb.json
    - scripts/abuse-test-fixtures/infinite-loop.json
    - scripts/abuse-test-fixtures/network-egress.json
    - scripts/abuse-test-fixtures/stdout-flood.json
    - scripts/abuse-test-fixtures/memory-bomb.json
    - scripts/abuse-test-fixtures/fd-bomb.json
  modified:
    - package.json
decisions:
  - Used p-limit (already in node_modules) for concurrency gating rather than adding autocannon
  - Fixtures reference "test-load-*" + "test-abuse-*" challengeId slugs that the trainer must seed in the test cohort before harness runs (documented in LOAD-TEST-CHECKPOINT.md)
  - Docker stats sampler via SSH uses 500ms interval; unavailable without JUDGE0_VM_SSH_KEY_PATH + JUDGE0_VM_SSH_TARGET env
  - Harnesses exit 1 on any D-03 threshold breach (load) or containment mismatch (abuse)
metrics:
  duration: 1h
  completed: 2026-04-18
---

# Phase 44 Plan 01: Load + Abuse Test Harnesses Summary

**Summary:** Two production-readiness harnesses shipped — 50-concurrent load
test against `/api/coding/submit` (p-limit + Supabase auth + per-lang
latency + metrics sampler + D-03 assertions) and 6-payload-class abuse test
(fork-bomb / infinite-loop / network-egress / stdout-flood / memory-bomb /
fd-bomb) with SSH-based docker-stats cgroup-escape check. Execution on the
deployed Phase 43 stack is deferred per human checkpoint.

## Delivered

- Load test harness — 50 concurrent submissions, per-language
  p50/p95/max latency, D-03 threshold assertions, report writer.
- Abuse test harness — 6 payload classes × up to 5 languages each,
  `expectedContainment` allowlist per fixture, docker-stats sampler,
  `SAFE`/`UNSAFE` verdict.
- 10 load-test fixtures (2 python / 2 js / 2 ts / 2 java / 1 sql / 1 csharp).
- 6 abuse-test fixtures (one per payload class, with per-language payload
  code).
- `npm run load-test-coding` + `npm run abuse-test-coding` wired.

## Deviations from Plan

None — harnesses match plan D-01..D-06 exactly. Plan 44-01 Task 3 (running
them against deployed stack) is deliberately deferred per autonomous
execution mandate; see `LOAD-TEST-CHECKPOINT.md`.

## Deferred Tasks

- **44-01 Task 3 (HARD-01/02 empirical gate):** Run both harnesses
  against the Phase 43-deployed stack in a trainer-coordinated maintenance
  window, commit the reports.

## Self-Check: PASSED

- `scripts/load-test-coding.ts` — FOUND, typechecks
- `scripts/abuse-test-coding.ts` — FOUND, typechecks
- 10 load-test fixtures — FOUND, all parse
- 6 abuse-test fixtures — FOUND, all parse
- `package.json` scripts — FOUND (`load-test-coding`, `abuse-test-coding`)
- Commit `222906b` — FOUND in git log
