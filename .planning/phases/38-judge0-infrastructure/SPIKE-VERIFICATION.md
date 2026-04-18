# Phase 38 Spike Verification — JUDGE-06 Gate Status

**Date attempted:** 2026-04-18
**Status:** DEFERRED — docker daemon unavailable on executor host
**Phase 39 gate:** BLOCKED until spike runs with real Judge0 stack

## What was attempted

Running in `--auto` unattended mode per coordinator instructions:

1. Checked for Docker CLI presence: **FOUND** (`/opt/homebrew/bin/docker`, client v24.0.7)
2. Checked for Docker Compose V2 plugin: **NOT FOUND** (only legacy `docker-compose`; `docker compose` subcommand unavailable)
3. Checked Docker daemon connectivity: **FAILED**
   - `docker ps` → `Cannot connect to the Docker daemon at unix:///Users/jestercharles/.colima/default/docker.sock. Is the docker daemon running?`
   - `colima status` → `colima is not running`

## Consequence

The JUDGE-06 spike gate (Plan 38-03 Task 2) REQUIRES a live Judge0 stack to:

- Submit 10 concurrent mixed-language payloads via `judge0Client.submit()`
- Sample `docker stats` for CPU/RAM peaks per container
- Verify language IDs against live `/languages` endpoint
- Commit final `deploy.resources.limits` values to `docker-compose.yml`
- Update `PROJECT.md` "Committed Resource Sizing" subsection (D-20)

None of these can be simulated without a running docker daemon and the Judge0 image pull. Attempting the spike with `NO_STATS=1` against a non-existent Judge0 server would produce connection-refused errors and no useful data.

## Artifacts ready for human-run spike

Everything except the live run is done:

| Artifact | Status |
|----------|--------|
| `docker-compose.yml` Judge0 services | COMMITTED (c6a3379) |
| `.env.judge0.example`, `.env.example` Judge0 section | COMMITTED (1ebc69c) |
| `src/lib/judge0Client.ts` (locked contract) | COMMITTED (e69ff96) — 13/13 unit tests pass |
| `src/lib/judge0Errors.ts` | COMMITTED (e69ff96) |
| `/api/health` extension with judge0 probe | COMMITTED (d20a5a3) — 6/6 tests pass |
| `scripts/judge0-spike.ts` harness | COMMITTED (66fdc36) — typechecks clean |
| 10 spike fixtures in `scripts/judge0-spike-fixtures/` | COMMITTED (66fdc36) |
| `docker-compose.yml` final resource limits | **DEFERRED** — placeholders in place |
| `.planning/phases/38-judge0-infrastructure/38-SPIKE-REPORT.md` | **DEFERRED** — awaits live run |
| `PROJECT.md` "Committed Resource Sizing" subsection | **DEFERRED** (D-20) |
| `JUDGE0_LANGUAGE_MAP` live-verification | **DEFERRED** (D-14) |

## Steps to run the spike manually

1. **Start docker host:** `colima start` (or boot the GCE n1-standard-2 VM)
2. **Install compose V2 plugin** if missing:
   `mkdir -p ~/.docker/cli-plugins && curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-darwin-arm64 -o ~/.docker/cli-plugins/docker-compose && chmod +x ~/.docker/cli-plugins/docker-compose`
3. **Create `.env.judge0`** from template:
   ```bash
   cp .env.judge0.example .env.judge0
   # edit JUDGE0_AUTH_TOKEN, JUDGE0_DB_PASSWORD, JUDGE0_REDIS_PASSWORD with `openssl rand`
   ```
4. **Bring Judge0 up:** `docker compose up -d judge0-db judge0-redis judge0-server judge0-workers`
   Wait ~60s for workers to register.
5. **Smoke health:**
   ```bash
   curl -H "X-Auth-Token: $JUDGE0_AUTH_TOKEN" http://localhost:2358/system_info
   curl -H "X-Auth-Token: $JUDGE0_AUTH_TOKEN" http://localhost:2358/languages
   ```
6. **Install tsx** (dev dep) if not present: `npm install -D tsx`
7. **Run spike:**
   ```bash
   export JUDGE0_URL=http://localhost:2358
   export JUDGE0_AUTH_TOKEN=<same value>
   RUNS=3 npx tsx scripts/judge0-spike.ts
   ```
8. **Evaluate gate** per D-19 against `scripts/judge0-spike-output.json`:
   - [ ] 30/30 submissions correct across 3 runs
   - [ ] Each run's wall clock ≤ 30 sec
   - [ ] Peak CPU per container ≤ 80% of limit
   - [ ] Peak RAM per container ≤ 80% of limit
9. **Verify language IDs:** compare `curl /languages` IDs to `JUDGE0_LANGUAGE_MAP` in `src/lib/judge0Client.ts`. If drift, update the constant + re-run `npm run test -- judge0Client`.
10. **Write 38-SPIKE-REPORT.md**, update `docker-compose.yml` resource limits, update `PROJECT.md` "Committed Resource Sizing" subsection.

## Coordinator notification

Coordinator should notify the human operator that:

- Phase 38 code shipped — 5 commits, all tests green, typechecks clean.
- Phase 39 is **BLOCKED** by unfinished JUDGE-06 gate.
- Human must run spike on a host with a live docker daemon (local colima start OR GCE VM).
- Expected time: ~30-45 min (image pull + 3×90s spike runs + report drafting).

## Sign-off

When spike PASSES:
- Record "approved — spike PASS, resource numbers committed" in this file under a new `## Verification Complete` section
- Delete this file OR leave as audit trail; either is acceptable
- Phase 39 unblocks
