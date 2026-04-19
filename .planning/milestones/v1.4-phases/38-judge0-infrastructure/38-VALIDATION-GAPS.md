# Phase 38 Validation Gaps

**Audited:** 2026-04-18
**Suite after fills:** 668 passing, 2 unrelated failures (coding-bank-schemas — Phase 37 scope)

## Requirement coverage map

| Req | Nature | Automated coverage | Status |
|-----|--------|---------------------|--------|
| JUDGE-01 | Image pin (1.13.1) | grep assertions on `docker-compose.yml` (2 hits) | config-only |
| JUDGE-02 | No public exposure | grep: `127.0.0.1:2358`=1, `0.0.0.0:2358`=0, `judge0-net`=9 | config-only |
| JUDGE-03 | Sandbox hardening | grep: `ENABLE_NETWORK`=3, `COUNT_WORKERS`=1 | config-only |
| JUDGE-04 | Env-driven client | `src/lib/__tests__/judge0Client.test.ts` (13 tests) | GREEN |
| JUDGE-05 | Health probe | `src/app/api/health/__tests__/route.test.ts` (6 tests) | GREEN |
| JUDGE-06 | Spike gate | Harness + fixtures (shipped); live run DEFERRED | MANUAL-ONLY |

## Trivial fill added

**`scripts/__tests__/judge0SpikeFixtures.test.ts`** (5 tests, all pass) — validates the 10 spike fixtures conform to harness contract, cover required language distribution (2/2/2/2/1/1), use only allowlisted languages, and have unique names. This is the testable slice of JUDGE-06 that does not require a docker daemon.

Command: `npx vitest run scripts/__tests__/judge0SpikeFixtures.test.ts`

## Non-trivial gaps (manual-only — cannot be filled in this audit)

### JUDGE-01 / JUDGE-02 / JUDGE-03 — docker-compose integrity
Grep-based audit of `docker-compose.yml` is the verification the plan prescribes; there is no meaningful unit test for "docker compose actually boots the stack" without a docker daemon. `docker compose config --quiet` is a smoke assertion, not a behavioral test. Current grep counts match plan expectations exactly — treat as structurally verified.

### JUDGE-06 — live spike gate (BLOCKING for Phase 39)
Deferred by design. Requires:
- Running docker daemon (colima or GCE VM) — unavailable on executor host per `SPIKE-VERIFICATION.md`
- 3 spike runs with all 30 submissions returning `correct: true`
- docker stats sampling for CPU/RAM peaks
- `/languages` ID verification against `JUDGE0_LANGUAGE_MAP`
- Commit of final `deploy.resources.limits` to `docker-compose.yml` + `PROJECT.md` "Committed Resource Sizing" subsection

Manual protocol is documented in `SPIKE-VERIFICATION.md`. No automation possible in this environment.

### Judge0 client — integration-with-live-server
All client tests mock `fetch`. A live integration test against a running Judge0 container would verify:
- Real 5xx retry behavior end-to-end
- Actual X-Auth-Token authentication against Judge0's auth filter
- `/system_info` response shape against Judge0 1.13.x

These belong inside the JUDGE-06 live spike run (harness already exercises `submit` + `getSubmission` against a live server). Tracked under JUDGE-06 manual gate.

## Files for commit

- `scripts/__tests__/judge0SpikeFixtures.test.ts` (new)
- `.planning/phases/38-judge0-infrastructure/38-VALIDATION-GAPS.md` (this file)
