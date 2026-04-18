---
phase: 38-judge0-infrastructure
reviewed: 2026-04-18T00:00:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - docker-compose.yml
  - .env.judge0.example
  - .gitignore
  - src/lib/judge0Client.ts
  - src/lib/judge0Errors.ts
  - src/lib/__tests__/judge0Client.test.ts
  - src/app/api/health/route.ts
  - src/app/api/health/__tests__/route.test.ts
  - scripts/judge0-spike.ts
  - scripts/judge0-spike-fixtures/*.json
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
status: issues_found
---

# Phase 38: Code Review Report

**Reviewed:** 2026-04-18
**Depth:** standard
**Status:** issues_found

## Summary

Judge0 infrastructure is cleanly implemented. Version pin on 1.13.1 is correct (GHSA-q7vg-26pg-v5hr patched). `.env.judge0.example` contains only placeholders; `.gitignore` correctly excludes `.env*` and whitelists `.env*.example`. Client omits `wait=true` (D-07 enforced by construction), uses `AbortSignal.timeout`, retries only on 5xx/network/abort (no 4xx retry), and maps all 6 languages. Health route runs probes in parallel with 2s timeout and leaks no internal detail on failure. Spike harness loads 10 fixtures whose languages match the allowlist. Two warnings and three info items below.

## Warnings

### WR-01: `JUDGE0_EXPOSE_LOCAL` flag documented but not wired

**File:** `docker-compose.yml:84-85`
**Issue:** D-09 specifies port 2358 should be bound behind `JUDGE0_EXPOSE_LOCAL=true` (default true local, false in production). The current compose unconditionally binds `127.0.0.1:2358:2358`. Production deploys via this file would still expose loopback to any user on the host.
**Fix:** Gate with a compose profile or use `${JUDGE0_EXPOSE_LOCAL:+127.0.0.1:2358:2358}`, or remove the `ports:` block in a prod overlay file and document.

### WR-02: Auth token may leak via 4xx error body in thrown message

**File:** `src/lib/judge0Client.ts:152-153, 172-173`
**Issue:** `safeText(res)` reads the raw response body into the `Judge0UnavailableError` message on 4xx. If Judge0 ever echoes back the submitted `X-Auth-Token` or request body in an error response (some misconfigs do), that string propagates into logs. The message also has no length cap — a large error body bloats logs.
**Fix:** Truncate to ~500 chars and redact known-sensitive substrings, e.g. `body.slice(0, 500).replaceAll(token, '[REDACTED]')`.

## Info

### IN-01: `name` on Error subclasses is a readonly instance property

**File:** `src/lib/judge0Errors.ts:8, 15, 24`
**Issue:** `readonly name = 'UnsupportedLanguageError'` shadows `Error.prototype.name` as an own enumerable property. Works, but differs from idiomatic `this.name = ...` in the constructor and affects serialization.
**Fix:** Optional — set in constructor, or accept as-is.

### IN-02: `getSubmission` encodes token but uses raw token in URL template string

**File:** `src/lib/judge0Client.ts:165`
**Issue:** `encodeURIComponent(submissionToken)` is correct defense; just noting Phase 39 callers must not concatenate tokens into URLs themselves.
**Fix:** None required; add a doc comment.

### IN-03: Spike `runOnce` uses `latencySec` as wall time incl. 500ms poll granularity

**File:** `scripts/judge0-spike.ts:183, 88`
**Issue:** Polling interval of 500ms adds up to ~0.5s noise to every latency measurement, inflating p50/p95 slightly. Acceptable for sizing decisions; flag so SPIKE-REPORT notes the measurement floor.
**Fix:** Document in report or poll at 200ms.

---

_Reviewed: 2026-04-18_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
