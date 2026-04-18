# Phase 38: Judge0 Infrastructure (Local + Remote-Ready) — SPIKE GATE - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning
**Mode:** `--auto` (recommended defaults captured inline)
**Gate:** This phase CONTAINS the mandatory spike gate (JUDGE-06) that blocks Phase 39.

<domain>
## Phase Boundary

Stand up a pinned, hardened, env-driven Judge0 stack inside the existing `docker-compose.yml` for local development, wire env-driven client config so the same code runs against local Docker or remote GCE, extend `/api/health` with Judge0 reachability probe, and run the real-VM-sized spike (10 concurrent mixed-language submissions) to commit resource caps before Phase 39.

**In scope:**
- `docker-compose.yml` additions: `judge0-server`, `judge0-workers`, `judge0-db` (Postgres), `judge0-redis` — all on internal network, `127.0.0.1` bindings only, pinned to Judge0 1.13.1 (GHSA-q7vg-26pg-v5hr)
- Sandbox config: `enable_network=false`, CPU + memory caps, `max_processes`, `max_file_size`, worker count override env var
- `JUDGE0_URL` + `JUDGE0_AUTH_TOKEN` env vars consumed by a thin `src/lib/judge0Client.ts` (no business logic — pure HTTP client + retry + timeout)
- `/api/health` extension: pings `${JUDGE0_URL}/system_info` with 2-sec timeout; returns `judge0: ok | unreachable | degraded` field
- Spike script (`scripts/judge0-spike.ts` or `scripts/judge0-spike.sh`): submits 10 concurrent mixed-language challenges, captures p50/p95, CPU/RAM utilization on the VM
- Spike report committed to `.planning/phases/38-judge0-infrastructure/38-SPIKE-REPORT.md` with resource sizing + committed caps folded into PROJECT.md

**Out of scope (other phases):**
- Server submit/poll API → Phase 39
- Hidden test injection → Phase 39
- Terraform GCE host provisioning → Phase 43
- Load test at 50 concurrent → Phase 44

</domain>

<decisions>
## Implementation Decisions

### Image Pin + Hardening (locked per discovery + codex)
- **D-01:** `judge0/judge0:1.13.1` (or the first stable 1.13.x tag — pin EXACT). Image digest captured in docker-compose comment for reproducibility.
- **D-02:** Judge0 Postgres: `postgres:15-alpine` (match existing Supabase major version). Judge0 Redis: `redis:7-alpine`. Pinned to specific minor tags.
- **D-03:** Resource limits declared per service via `deploy.resources.limits` (cpus, memory). Initial values: server/workers 2 cpu / 2G each, db 1 cpu / 1G, redis 0.5 cpu / 512M. **These are placeholders** — Phase 38 spike outputs the committed values.

### Sandbox Config (locked — hard security requirement)
- **D-04:** `enable_network=false` in Judge0 sandbox config. Non-negotiable.
- **D-05:** `enable_per_process_and_thread_time_limit=true`, `enable_per_process_and_thread_memory_limit=true` — enforces per-submission isolation.
- **D-06:** `max_cpu_time_limit=10` (seconds), `max_wall_time_limit=15`, `max_memory_limit=256000` (KB), `max_processes=60`, `max_file_size=8192` (KB), `max_number_of_runs=1`. Tunable via env.
- **D-07:** Worker count defaults to `2 × vCPU` (Judge0 default) but overridable via `COUNT_WORKERS` env var — critical knob for the spike.

### Network Isolation (locked)
- **D-08:** New Docker network `judge0-net` (bridge, internal). Judge0 services attached ONLY to `judge0-net` — never published to host. App container attached to BOTH `default` network AND `judge0-net` so it can reach judge0-server by service name.
- **D-09:** Judge0 server port 2358 exposed to host ONLY on `127.0.0.1:2358` for local debugging (NOT 0.0.0.0). Behind `JUDGE0_EXPOSE_LOCAL=true` default; set false in production compose.
- **D-10:** Judge0 auth token: generated once, stored in `.env.docker`, passed via `JUDGE0_AUTH_TOKEN`. Server rejects requests without matching `X-Auth-Token` header — belt for the network-layer suspender.

### Client Library Scope (locked — thin wrapper)
- **D-11:** `src/lib/judge0Client.ts` is a pure HTTP client. Functions: `submit(sourceCode, language, stdin, expectedStdout?)`, `getSubmission(token)`, `systemInfo()`. NO hidden-test logic, NO auth logic, NO rate limits — all that is Phase 39.
- **D-12:** Timeouts: 5-sec connect, 30-sec read. Retry once on 5xx/timeout with 1-sec backoff; no retry on 4xx.
- **D-13:** Client reads `JUDGE0_URL` + `JUDGE0_AUTH_TOKEN` from env; throws at import if either missing in non-test context. Test setup overrides with a stub URL (no live Judge0 required for unit tests).

### Language Map (locked)
- **D-14:** Judge0 language IDs are version-specific. Pin a `JUDGE0_LANGUAGE_MAP` constant in `judge0Client.ts`: `{ python: 71, javascript: 93, typescript: 94, java: 62, sql: 82, csharp: 51 }` (values sourced from Judge0 1.13.x `/languages` endpoint — verify during spike, update constant with actual IDs from live API before merging).
- **D-15:** Bad `language` inputs raise typed `UnsupportedLanguageError` — lets Phase 39 translate to 400 cleanly.

### Health Probe
- **D-16:** `/api/health` extended (existing route at `src/app/api/health/route.ts`): add `judge0` field. Call `systemInfo()` with 2-sec timeout. Status: `ok` (200, version returned) / `unreachable` (timeout/connection refused) / `degraded` (responds but queue depth > threshold — future-proof, log-only in v1.4). Overall health returns 200 when DB + judge0 both ok, 503 when either fails.

### Spike Protocol (JUDGE-06 — the gate)
- **D-17:** Spike happens on the **actual GCE VM size** — currently `n1-standard-2` (verify before running). Spike script:
  1. Prepares 10 challenge payloads: 2 python, 2 javascript, 2 typescript, 2 java, 1 sql, 1 csharp — each with ~100ms expected runtime + known expected output
  2. Submits all 10 in parallel via `judge0Client.submit()`
  3. Polls each submission until done
  4. Records per-submission latency + overall wall clock + queue depth sampled each second + Docker `stats` CPU/RAM sampling
  5. Repeats 3 runs, reports p50, p95, max CPU, max RAM per container
- **D-18:** Spike report written to `.planning/phases/38-judge0-infrastructure/38-SPIKE-REPORT.md`. Must include: measured p50/p95 per language, worker count used, CPU/RAM peak per container, recommended resource limits for `docker-compose.yml` AND for Terraform Phase 43.
- **D-19:** Gate criterion: Spike PASSES if all 10 submissions return correct verdicts within 30 sec wall clock AND peak CPU+RAM fits inside VM capacity with ≥ 20% headroom. On fail — commit revised resource limits or upsize VM class (Terraform adjustment) before Phase 39 begins.

### PROJECT.md Update
- **D-20:** After spike, PROJECT.md v1.4 "MSA from day 1" section gets a "Committed resource sizing" subsection with the measured numbers. This is a hard requirement before Phase 39 planning starts.

### Claude's Discretion
- Spike script language: TypeScript (via `tsx`) vs bash — planner picks
- Metrics collection: `docker stats --format` vs `cAdvisor` lite vs manual sample loop — lightweight sample loop recommended for v1.4
- Where to add spike payloads (embedded in script vs fixture folder) — fixture folder under `scripts/judge0-spike-fixtures/` recommended

### Folded Todos
None.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone-level
- `.planning/REQUIREMENTS.md` §JUDGE-01..06 — authoritative req text; JUDGE-06 is the gate
- `.planning/ROADMAP.md` §Phase 38 — "spike gate" in title + success criteria
- `.planning/PIPELINE-DISCOVER.md` §Cross-Model Perspective §1 + §4 — resource sizing assumptions, `wait=true` prohibition, network-boundary posture; §Pipeline Decision Log "Phase 38 = Judge0 spike before commit"
- `.planning/PROJECT.md` v1.4 active — MSA-from-day-1 principles; Judge0 pin; GHSA advisory reference

### External
- [Judge0 docker-compose.yml reference](https://github.com/judge0/judge0/blob/master/docker-compose.yml) — canonical reference for service topology
- [Judge0 security advisory GHSA-q7vg-26pg-v5hr](https://github.com/judge0/judge0/security/advisories/GHSA-q7vg-26pg-v5hr) — sandbox escape in versions < 1.13.1
- Judge0 API: `/submissions`, `/submissions/:token`, `/system_info`, `/languages`

### Existing code
- `docker-compose.yml` — append Judge0 services; keep existing `interview-assistant` service untouched
- `src/app/api/health/route.ts` — extend with judge0 probe; preserve existing DB check
- `.env.docker` / `.env.example` — add `JUDGE0_URL`, `JUDGE0_AUTH_TOKEN`, `COUNT_WORKERS`, `JUDGE0_EXPOSE_LOCAL`

### Explicitly out-of-scope
- `/api/coding/*` routes — Phase 39
- Terraform files — Phase 43

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/api/health/route.ts` — existing health endpoint with Prisma connectivity check; add judge0 probe with identical shape (`{ status, checks: { db: 'ok', judge0: 'ok' } }`)
- `docker-compose.yml` — single-service today; Judge0 additions follow same `build`/`env_file`/`healthcheck` style

### Established Patterns
- Pinned image tags with digest in comments
- Healthcheck declaration on every service
- `env_file: .env.docker` pattern — Judge0 services use their own `.env.judge0` file for secrets isolation

### Integration Points
- `judge0Client.ts` will be consumed by Phase 39's `/api/coding/submit` and `/api/coding/attempts/[id]` routes — its contract is locked in Phase 38

### Known Constraints
- Current GCE VM is `n1-standard-2` (2 vCPU, 7.5 GB). Codex discovery: 2 vCPU / 4 GB = Python/JS only. Spike will likely commit to upsize recommendation → Phase 43 Terraform provisions the real host
- Docker Compose V2 syntax (`services:`, no `version:` key required)
- Port 2358 is Judge0 default — conflict check against existing app port 3000 (clear)

</code_context>

<specifics>
## Specific Ideas

- Discovery codex quote: "Pin Judge0 ≥ 1.13.1 — older versions had sandbox escape." Exact version pin goes in docker-compose comment + PROJECT.md decision log.
- Discovery: `wait=true` "doesn't scale" — judge0Client should NOT expose a `wait` param. Only async submit + poll.
- "Avoid `wait=true`" is a Phase 39 concern but the client built here enforces it by OMISSION.

</specifics>

<deferred>
## Deferred Ideas

- **Judge0 queue depth metric pushed to GCE Logs Explorer** — implemented in Phase 43 (IAC-04)
- **Judge0 auto-scaling / autoscaler config** — Phase 44 or v1.5
- **Multi-region Judge0** — v2.0
- **Judge0 in Kubernetes** — not planned (GCE VM is sufficient)

### Reviewed Todos (not folded)
None.

</deferred>

---

*Phase: 38-judge0-infrastructure*
*Context gathered: 2026-04-18 (auto)*
