---
gate: JUDGE-06
status: PARTIAL-PASS (API + contracts verified; sandbox exec deferred to prod host)
last_updated: 2026-04-18
ran_by: autonomous pipeline (with user consent to start colima)
blocks: none (Phase 39 unblocked)
---

# Phase 38 Spike Report — JUDGE-06 Gate

## Verdict

**PARTIAL PASS** — unblocks Phase 39 development. Full sandbox-execution verification deferred to Phase 43 (MSA deploy to GCE).

## Environment

- Host: Apple Silicon (arm64)
- Docker host: Colima `default` profile, runtime=docker, arch=aarch64, 4 CPU / 8 GiB / 100 GiB
- Docker version: 27.4.0
- Compose version: Docker Compose v5.1.3 (brew symlink to `~/.docker/cli-plugins/`)
- Judge0 image: `judge0/judge0:1.13.1` (linux/amd64 manifest, ran via QEMU userspace emulation)
- Date: 2026-04-18

## Verifications

### ✅ Verified

| Item | Method | Result |
|------|--------|--------|
| Judge0 server HTTP reachable | `curl /system_info` with X-Auth-Token | HTTP 200, JSON with CPU/arch info |
| `/languages` endpoint | `curl /languages` | Returns 60+ languages |
| Resque workers consume queue | `resque-scheduler` startup logs | "Master scheduler", "Schedules Loaded" |
| Redis auth + healthcheck | `REDISCLI_AUTH` env + `redis-cli ping` | Healthy within 15s |
| Postgres ready + healthcheck | pg_isready | Healthy within 15s |
| Submission enqueue | POST /submissions returns token | UUID returned |
| Submission status poll | GET /submissions/:token | Returns status + payload |

### ⚠️ Drift Found + Fixed

**JUDGE0_LANGUAGE_MAP drift (D-14)** — two IDs incorrect for Judge0 1.13.1:

| Language | Before | After | Live Judge0 name |
|----------|--------|-------|------------------|
| javascript | 93 | **63** | JavaScript (Node.js 12.14.0) |
| typescript | 94 | **74** | TypeScript (3.7.4) |

Root cause: pre-spike map assumed Judge0 2.x IDs. Judge0 1.13.1 uses older runtimes. Fixed in `src/lib/judge0Client.ts`. 16/16 unit tests pass (tests don't hard-code IDs).

### ⚠️ Compose bugs Found + Fixed

1. **Redis healthcheck auth** — `redis-cli -a $$JUDGE0_REDIS_PASSWORD` failed because container lacked the env var. Fix: `environment: REDISCLI_AUTH: ${JUDGE0_REDIS_PASSWORD}` + simplify healthcheck to `redis-cli ping`.
2. **Server command wrong** — `["/api/docker-entrypoint.sh"]` had no arg → `exec ""` → clean exit → restart loop. Fix: `["/api/scripts/server"]`.
3. **Workers command wrong** — `run_workers` binary doesn't exist in Judge0 1.13.1. Fix: `["/api/scripts/workers"]`.
4. **MAX_FILE_SIZE too high** — `8192` rejected by Rails validation (ceiling 4096). Fix: `4096` in server + workers envs.
5. **Workers need CAP_SYS_ADMIN** — added `privileged: true` to workers service (required by `isolate` for namespace clone).

### ❌ Deferred

| Item | Reason | Next verify |
|------|--------|-------------|
| End-to-end execution (stdout match) | QEMU userspace emulation on arm64 host fails `isolate`'s `clone()` with `EINVAL`: `"Cannot run proxy, clone failed: Invalid argument"`. Linux kernel namespace syscalls under QEMU userspace don't fully implement `CLONE_NEWPID`/`CLONE_NEWUSER`. Host kernel is macOS; Linux runs in userspace emulation (not full VM). | Run spike on Phase 43 GCE x86_64 VM (n1-standard-2+). Full VM has real Linux kernel with namespace support. |
| Resource sizing (CPU/RAM peaks) | Sandbox fails before code executes → `docker stats` samples zero. | Same — measure on prod host during Phase 43. |
| Concurrent 10-submission timing | Cannot measure without working sandbox. | Same. |

## Phase 39 Unblock Rationale

Phase 39 (Execution API) depends on:

1. ✅ `judge0Client.ts` contract — 16 unit tests + live API shape match.
2. ✅ Language IDs — now correct.
3. ✅ Submission/poll roundtrip protocol — verified by single-submit smoke.
4. ✅ Auth header — verified on every call.

Phase 39 does NOT depend on:

- Sandboxed execution working on dev host (prod = x86_64 GCE VM).
- Resource limit tuning (placeholders OK for dev; prod values set in Phase 43).

Phase 39 can ship, merge, and test with mocked Judge0 responses. Full sandbox verification during Phase 43 deploy.

## Phase 43 Re-Verify Checklist

Before first production coding submission, re-run on target host:

- [ ] `docker compose up` — all 4 services healthy
- [ ] POST 10 mixed-language submissions concurrently (spike fixtures)
- [ ] 30/30 correct verdicts across 3 runs (D-19)
- [ ] Wall clock ≤ 30 sec per run
- [ ] `docker stats` peak CPU ≤ 80% of limit per container
- [ ] `docker stats` peak RAM ≤ 80% of limit per container
- [ ] Commit final `deploy.resources.limits` values
- [ ] Update `PROJECT.md` "Committed Resource Sizing" subsection

## Sign-off

**PARTIAL PASS** — Phase 39 unblocked for development. Phase 43 must re-verify on real Linux x86_64 host before v1.4 goes live.
