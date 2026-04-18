---
phase: 44-hardening-load-test
reviewed: 2026-04-18T00:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - scripts/load-test-coding.ts
  - scripts/abuse-test-coding.ts
  - scripts/validate-challenge.ts
  - scripts/load-test-fixtures/*.json
  - scripts/abuse-test-fixtures/*.json
  - ARCHITECTURE.md
  - docs/trainer-authoring.md
  - .planning/phases/44-hardening-load-test/SECURITY-AUDIT.md
findings:
  critical: 1
  warning: 2
  info: 3
  total: 6
status: issues_found
---

# Phase 44 Code Review — Autonomous Pass

## Summary

Harnesses are well-structured and the STRIDE/adversarial drafts are thoughtful. One P0 ships-broken issue (missing npm deps), two P1 robustness gaps in the abuse harness, and cleanup nits. No committed malicious payloads, no secrets, no hidden-test disclosure paths. `validate-challenge` correctly shares schemas with the server loader (T-44-05 mitigation holds).

## P0 — Critical

### CR-01: `p-limit` and `tsx` missing from package.json

**File:** `package.json` (vs `scripts/load-test-coding.ts:33`)
**Issue:** `load-test-coding.ts` imports `pLimit from 'p-limit'`, but `p-limit` is not in dependencies/devDependencies. All three new npm scripts invoke `tsx`, also absent. `npm run load-test-coding` will fail on a clean install with `Cannot find module 'p-limit'`; `npm run abuse-test-coding` and `validate-challenge` fail with `tsx: command not found`.
**Fix:** `npm i -D p-limit tsx` and commit the lockfile. Verify all three scripts run from a fresh clone.

## P1 — Warning

### WR-01: docker stats sampler leaks child processes on slow SSH

**File:** `scripts/abuse-test-coding.ts:152-169`
**Issue:** `setInterval(..., 500)` spawns a new `ssh` child every 500ms with no timeout and no in-flight guard. If an ssh call takes >500ms (network blip, MaxStartups throttle), children pile up unbounded. `stop()` clears the interval but does not kill outstanding children — they race with the report write.
**Fix:** Gate on a `let inflight = false` before `spawn`, skip the tick if still in flight; add `spawn(..., { timeout: 400 })` or kill on `stop()`. Await all outstanding children in `stop()` before returning.

### WR-02: load-test aborts submission on any transient poll error

**File:** `scripts/load-test-coding.ts:173-176`
**Issue:** Any non-OK poll response (e.g. 502 during app VM restart, 429 rate-limit on poll) sets `result.error` and returns immediately — the 50-concurrent run loses attempts it could have recovered by retrying. Compare `abuse-test-coding.ts:131` which `continue`s on `!r.ok`. This can turn a real passing stack into a false FAIL verdict.
**Fix:** Treat non-OK poll as retryable within the `deadline`; only set `error` if the deadline expires or `submit` itself fails. Log transient pollErrors to the report as a separate column.

## P2 / P3 — Info

### IN-01: SECURITY-AUDIT.md STRIDE matrix omits Repudiation

**File:** `.planning/phases/44-hardening-load-test/SECURITY-AUDIT.md:46-50`
**Issue:** Matrix covers Tampering/Elevation/Spoofing/Info Disclosure/DoS but not Repudiation. v1.4 attempts persist to gap scores with associate-identity impact — attempt provenance (who submitted, from which session) is worth an INFO-level call-out so `/cso` can verify audit logging.
**Fix:** Add a Repudiation row citing `Session.associateId` + `CodingAttempt` timestamps as mitigation; note `AuthEvent` table for auth-related repudiation.

### IN-02: `JUDGE0_METRICS_CMD` passes operator input through `sh -c`

**File:** `scripts/load-test-coding.ts:210`
**Issue:** `execFileSync('sh', ['-c', cmd])` runs an operator-controlled env var in a shell. Not exploitable in the intended operator-runs-own-harness model, but worth an INFO note alongside F-09 in SECURITY-AUDIT.md so it isn't mistaken for an intentional injection surface in future audits.
**Fix:** Prefer `execFileSync(parts[0], parts.slice(1))` with a parsed arg vector, or document the trust boundary explicitly.

### IN-03: trainer-authoring memory cap stated as 250 MB, actual 244 MB (256000 KB)

**File:** `docs/trainer-authoring.md:92`
**Issue:** Docs say "Phase 38 caps at 250 MB"; SECURITY-AUDIT F-01 and Phase 38 config use `max_memory_limit=256000 KB` ≈ 244 MB. Trainers sizing test inputs may tune against the wrong number.
**Fix:** "Phase 38 caps at 256000 KB (~244 MB)" and link to `docker-compose.yml`.

---

_Reviewed: 2026-04-18_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
