---
phase: 38-judge0-infrastructure
plan: 02
subsystem: client-contract
tags: [judge0, http-client, health-probe, tdd]
dependency_graph:
  requires: [Plan 38-01 env contract]
  provides: [judge0Client contract for Phase 39, /api/health judge0 probe]
  affects: [Phase 39 submit/poll routes, docker-compose app healthcheck semantics]
tech_stack:
  added: []
  patterns: [lazy-env-read, withRetry+backoff, AbortSignal.timeout, typed-errors]
key_files:
  created:
    - src/lib/judge0Client.ts
    - src/lib/judge0Errors.ts
    - src/lib/__tests__/judge0Client.test.ts
    - src/app/api/health/__tests__/route.test.ts
  modified:
    - src/app/api/health/route.ts
decisions:
  - D-11 honored: pure HTTP client, no business logic
  - D-12 honored: 1 retry on 5xx/AbortError/TypeError, 1s backoff, no retry on 4xx
  - D-13 compromised: lazy env read (throw on first call) instead of import-time — enables unit tests without live env
  - D-14 honored: JUDGE0_LANGUAGE_MAP frozen with 6 entries; spike verifies IDs
  - D-15 honored: UnsupportedLanguageError for bad language
  - D-16 honored: 2-sec timeout, parallel db+judge0 checks, 503 on either fail
  - No blocking-wait param — async submit + poll only (D-11 by omission)
tests:
  client: 13/13 pass
  health: 6/6 pass
  suite_total: 625 passing (1 pre-existing failure in coding-challenge-service unrelated)
metrics:
  duration: ~20m
  completed: 2026-04-18
---

# Phase 38 Plan 02: judge0Client + Health Probe Summary

Shipped the locked Phase 39-facing contract: pure HTTP client + 3 typed errors + extended /api/health with judge0 reachability.

## Client contract (frozen for Phase 39)

```typescript
type Judge0Language = 'python' | 'javascript' | 'typescript' | 'java' | 'sql' | 'csharp';
const JUDGE0_LANGUAGE_MAP: Record<Judge0Language, number>;

interface SubmitOptions { sourceCode; language; stdin?; expectedStdout?; cpuTimeLimit?; memoryLimit? }
interface Judge0Submission { token; stdout; stderr; compile_output; message; status; time; memory; exit_code }
interface Judge0SystemInfo { version?; homepage?; [k: string]: unknown }

submit(opts): Promise<{ token: string }>
getSubmission(token): Promise<Judge0Submission>
systemInfo(timeoutMs = 2000): Promise<Judge0SystemInfo>
```

Errors: `UnsupportedLanguageError`, `Judge0UnavailableError` (with `http4xx` flag), `Judge0ConfigError`.

## Language map (may update after Plan 38-03 spike verifies /languages)

python=71, javascript=93, typescript=94, java=62, sql=82, csharp=51

## Health response shape

```
200 OK  → { status: 'ok',    checks: { db: 'connected',    judge0: 'ok' },          judge0Version?: '1.13.x' }
503     → { status: 'error', checks: { db: 'disconnected', judge0: 'ok' } }
503     → { status: 'error', checks: { db: 'connected',    judge0: 'unreachable' } }
503     → { status: 'error', checks: { db: 'disconnected', judge0: 'unreachable' } }
```

Checks run in parallel (Promise.all); 2-sec timeout on systemInfo.

## Known follow-up

- docker-compose `interview-assistant` healthcheck now amber when Judge0 down — may cause restart loops during Judge0 cold start. Defer to Phase 39 or Plan 38-03 resolution: either add `/api/health/app` variant or relax healthcheck retries. Not a Phase 38 blocker — tests/production behavior correct.

## Requirements satisfied

- JUDGE-04 (env-driven client, identical local/remote code path)
- JUDGE-05 (health probe returns 200 ok / 503 unreachable with structured response)

## Self-Check: PASSED

- FOUND: src/lib/judge0Client.ts
- FOUND: src/lib/judge0Errors.ts
- FOUND: src/lib/__tests__/judge0Client.test.ts (13 tests passing)
- FOUND: src/app/api/health/__tests__/route.test.ts (6 tests passing)
- FOUND: src/app/api/health/route.ts (extended with judge0 probe)
- FOUND commits: af2113d (test RED client), e69ff96 (feat client), ca8f14f (test RED health), d20a5a3 (feat health)
