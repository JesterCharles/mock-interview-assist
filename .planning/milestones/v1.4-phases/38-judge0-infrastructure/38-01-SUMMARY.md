---
phase: 38-judge0-infrastructure
plan: 01
subsystem: infrastructure
tags: [docker, judge0, security, sandbox]
dependency_graph:
  requires: [Phase 36 complete]
  provides: [docker-compose judge0 stack, env contract JUDGE0_URL/JUDGE0_AUTH_TOKEN/JUDGE0_EXPOSE_LOCAL/COUNT_WORKERS]
  affects: [interview-assistant networks, Plan 38-02 judge0Client env consumption, Plan 38-03 spike target]
tech_stack:
  added: [judge0/judge0:1.13.1, postgres:15-alpine, redis:7-alpine]
  patterns: [pinned-image-tags, internal-bridge-network, env-file-isolation]
key_files:
  created:
    - .env.judge0.example
    - .env.docker.example
  modified:
    - docker-compose.yml
    - .env.example
    - .gitignore
decisions:
  - D-01 honored: judge0 1.13.1 pinned (GHSA-q7vg-26pg-v5hr patch)
  - D-02 honored: postgres:15-alpine, redis:7-alpine
  - D-03 placeholders: server/workers 2cpu/2G, db 1cpu/1G, redis 0.5cpu/512M (spike commits finals)
  - D-04..D-06 honored: ENABLE_NETWORK=false, per-process caps locked
  - D-07 honored: COUNT_WORKERS env knob
  - D-08 honored: app bridges to judge0-net by service name
  - D-09 honored: 2358 bound to 127.0.0.1 only
  - D-10 honored: X-Auth-Token via .env.judge0
metrics:
  duration: ~15m
  completed: 2026-04-18
---

# Phase 38 Plan 01: Judge0 Docker Stack + Env Contract Summary

Appended four Judge0 services (server, workers, postgres, redis) to docker-compose.yml on an internal `judge0-net` bridge network with hard security posture, and created env templates so the app container consumes Judge0 identically in local-compose and remote-MSA deploys.

## What was added to docker-compose.yml

- `judge0-server` (`judge0/judge0:1.13.1`, port 2358 bound to 127.0.0.1 only, auth via X-Auth-Token, 2cpu/2G placeholder)
- `judge0-workers` (same image, `run_workers` command, COUNT_WORKERS env knob, 2cpu/2G placeholder)
- `judge0-db` (`postgres:15-alpine`, dedicated Judge0 DB, 1cpu/1G placeholder)
- `judge0-redis` (`redis:7-alpine`, password-protected, 0.5cpu/512M placeholder)
- `judge0-net` bridge network; `interview-assistant` bridged to `default + judge0-net`
- Named volumes `judge0-db-data`, `judge0-redis-data`

## Env contract

- `JUDGE0_URL` — app → Judge0 server URL (compose: `http://judge0-server:2358`; remote: private host URL)
- `JUDGE0_AUTH_TOKEN` — shared secret (X-Auth-Token header)
- `JUDGE0_EXPOSE_LOCAL` — gates 127.0.0.1 binding (documentation variable; current compose hard-binds)
- `COUNT_WORKERS` — worker count override (empty = Judge0 default `2 × vCPU`)
- `JUDGE0_DB_PASSWORD`, `JUDGE0_REDIS_PASSWORD` — Judge0-internal service secrets

## Hardening decisions honored

D-01 (1.13.1 pin), D-02 (pg15/redis7 pins), D-04 (ENABLE_NETWORK=false), D-05/D-06 (per-process CPU/mem/process caps), D-07 (COUNT_WORKERS knob), D-08 (internal network bridging), D-09 (127.0.0.1-only port binding), D-10 (AUTHN_TOKEN via env_file).

## Deferred to Plan 38-03

- Image digest pinning (requires first `docker pull` at spike time)
- Final `deploy.resources.limits` values (placeholder → measured)
- Verification of live `/languages` IDs (D-14)

## Verification

- YAML validates via js-yaml
- `grep` checks pass: `image: judge0/judge0:1.13` ≥ 2, `0.0.0.0:2358` = 0, `127.0.0.1:2358` = 1, `ENABLE_NETWORK` = 3, `judge0-net` = 9
- `.env.judge0` gitignored; `.env.judge0.example` tracked via `!.env*.example` whitelist
- `docker compose config` NOT run: compose V2 plugin absent on exec host; validated by YAML parse + structural inspection

## Self-Check: PASSED

- FOUND: docker-compose.yml
- FOUND: .env.judge0.example
- FOUND: .env.example (judge0 section appended)
- FOUND: .env.docker.example
- FOUND: .gitignore (whitelist rule present)
- FOUND commits: c6a3379 (compose), 1ebc69c (env templates)
