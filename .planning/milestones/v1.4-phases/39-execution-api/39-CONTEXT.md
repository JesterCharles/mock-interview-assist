# Phase 39: Execution API (Server-Side) - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning
**Mode:** `--auto`

<domain>
## Phase Boundary

Ship auth-gated async submit + poll endpoints that normalize Judge0 verdicts, inject hidden tests server-side, enforce a per-user rate limit, and expose a cohort-filtered challenge list. No `wait=true`. No hidden test leakage. Judge0 never reachable from browser.

**In scope:**
- `POST /api/coding/submit` — Zod-validated body, auth (trainer or matching associate), rate-limit, server-injects hidden tests, submits to Judge0, persists `CodingAttempt` + `judge0Token`, returns `{ attemptId }`
- `GET /api/coding/attempts/[id]` — polling; returns normalized verdict + visible test details + hidden pass count (NEVER hidden inputs/outputs)
- `GET /api/coding/challenges` — lists challenges authorized for caller (cohort + curriculum week filter); paginated
- Verdict normalization layer mapping Judge0 status codes → `pass | fail | timeout | mle | runtime_error | compile_error`
- Rate limits via `rateLimitService.ts` pattern: per-user 30/hour, 200/day (env-tunable)
- Language allowlist enforcement server-side
- `CodingSkillSignal` row written fire-and-forget when verdict resolves

**Out of scope (other phases):**
- UI `/coding/*` routes → Phase 40
- GapScore integration → Phase 41
- SQL-specific handling (schema injection, dialect label) → Phase 42
- Deployment → Phase 43

</domain>

<decisions>
## Implementation Decisions

### Auth & Identity (locked)
- **D-01:** `/api/coding/submit` + `/api/coding/attempts/[id]` call `getCallerIdentity()`. Accept: trainer role OR associate role where `attempt.associateId === caller.associateId`. 401 on anonymous, 403 on mismatched associate.
- **D-02:** `/api/coding/challenges` same identity gate. Associates see challenges where `challenge.cohortId IS NULL OR challenge.cohortId === caller.cohortId` AND (if associate has curriculum assignment) `challenge.skillSlug` appears in cohort's curriculum weeks. Trainers see all. Anonymous = 401.

### Async Submit Pattern (locked — codex hard requirement)
- **D-03:** NEVER call Judge0 with `wait=true`. Submit returns `{ attemptId }` immediately; client polls `/attempts/[id]`.
- **D-04:** Submit flow:
  1. Zod-parse body: `{ challengeId, language, code }`
  2. Load challenge via `coding-challenge-service.ts` — 404 if missing
  3. Check authorization (D-02 scope)
  4. Check rate limit (D-07)
  5. Verify `language` in challenge.languages allowlist
  6. `loadHiddenTests(slug)` — server-only
  7. Create `CodingAttempt` row with `verdict='pending'`
  8. Submit to Judge0 (one submission per test case — batched via Judge0 `/submissions/batch`), storing Judge0 token(s)
  9. Return `{ attemptId: codingAttempt.id }`
- **D-05:** Judge0 submission body includes: `source_code`, `language_id` (from D-14 of Phase 38 map), `stdin`, `expected_output`. Judge0 runs and compares internally — we rely on Judge0's match for each test but ALSO recompute verdict server-side for canonical enum.

### Poll Endpoint (locked — hidden test shield)
- **D-06:** `GET /api/coding/attempts/[id]` returns:
  ```json
  {
    "attemptId": "cuid",
    "verdict": "pass|fail|timeout|...|pending",
    "score": 0-100|null,
    "visibleTestResults": [{caseId, passed, stdout, durationMs}],
    "hiddenTestResults": {passed: N, total: M},
    "submittedAt": "ISO",
    "completedAt": "ISO|null"
  }
  ```
  Hidden tests: ONLY `passed/total` count. NEVER `stdin`, `expectedStdout`, `stdout`, or `caseId`.
- **D-06b:** When attempt is still running, poll fetches each Judge0 submission token status, aggregates, and updates `CodingAttempt.verdict` if resolved. Verdict persistence is idempotent (safe on repeat polls).

### Rate Limits (locked per CODING-API-04)
- **D-07:** Per-user keyed on `associateId` (or trainer `auth_user_id`). Defaults: 30 submissions/hour, 200/day. Override via env: `CODING_SUBMIT_RATE_HOURLY`, `CODING_SUBMIT_RATE_DAILY`. 429 response with `Retry-After` header.
- **D-08:** Reuse `rateLimitService.ts` — add new limiter scope `coding-submit`. Don't duplicate logic.

### Verdict Normalization (locked per CODING-API-07)
- **D-09:** New pure function `normalizeJudge0Verdict(judge0Status)` in `src/lib/judge0Verdict.ts`:
  - Judge0 status 3 (Accepted) → `pass`
  - Judge0 status 4 (Wrong Answer) → `fail`
  - Judge0 status 5 (Time Limit Exceeded) → `timeout`
  - Judge0 status 6 (Compilation Error) → `compile_error`
  - Judge0 status 7-12 (Runtime Error variants) → `runtime_error`
  - Judge0 status 13 (Internal Error) → `runtime_error` + log-for-ops
  - Judge0 status 14 (Exec Format Error) → `runtime_error`
  - Judge0 status in-queue (1, 2) → `pending`
  - MLE detection: `stderr` pattern match OR explicit Judge0 code if present → `mle`
- **D-10:** `verdict` on CodingAttempt updates to normalized value when ALL per-test submissions resolve. If ANY hidden test fails, verdict = `fail`. Score = (passed_count × weight_sum) / total_weight_sum × 100 (server-computed, never client-trusted).

### Signal Writeback (locked)
- **D-11:** On verdict resolution (not in submit flow, but in the poll handler when it detects completion), write `CodingSkillSignal` row using `codingSignalService.mapSignalToScore()` from Phase 36. Fire-and-forget — wrap in try/catch + log on failure; do NOT block the poll response.
- **D-12:** Signal shape: `{ attemptId, skillSlug: challenge.skillSlug, signalType, weight, mappedScore }`. `signalType` derived from verdict: `pass → pass`, `fail → fail` (except when some hidden tests passed, then `partial`), `compile_error → compile_error`, `timeout → timeout`.

### Shape of `/api/coding/challenges` (locked)
- **D-13:** Pagination: cursor-based via `?cursor=<cuid>&limit=20` (default 20, max 100). Response: `{ items: [...], nextCursor: string|null }`. Item shape: `{ id, slug, title, language, difficulty, skillSlug, cohortId, submittedAt? (latest attempt), verdict? (latest) }` — latest attempt is a LEFT JOIN convenience for UI.
- **D-14:** Filter query params: `?language=python`, `?difficulty=easy`, `?status=unstarted|attempted|passed`, `?week=N`. All optional. Server applies filter after auth scope.

### Error Surfaces (locked)
- **D-15:** Standard error envelope: `{ error: { code: string, message: string, details?: unknown } }`. Codes: `AUTH_REQUIRED`, `FORBIDDEN`, `NOT_FOUND`, `RATE_LIMITED`, `LANGUAGE_NOT_SUPPORTED`, `VALIDATION_ERROR`, `JUDGE0_UNAVAILABLE`, `INTERNAL`. No stack traces in prod responses.

### Claude's Discretion
- Whether to batch per-test submissions via Judge0 `/submissions/batch` or sequential. Recommend batch for reduced latency; fallback to sequential if batch rate-limited
- Error log destination — console + existing log infra; no new infra
- TTL on `CodingAttempt` rows (none in v1.4 — retention policy is v1.5 concern)

### Folded Todos
None.

</decisions>

<canonical_refs>
## Canonical References

### Milestone-level
- `.planning/REQUIREMENTS.md` §CODING-API-01..07 — authoritative
- `.planning/ROADMAP.md` §Phase 39
- `.planning/PIPELINE-DISCOVER.md` §Cross-Model Perspective §4 + §7 — async-only, hidden-test shield, language allowlist, rate-limit
- `.planning/phases/36-data-model-schema/36-CONTEXT.md` — CodingAttempt + CodingSkillSignal contracts
- `.planning/phases/37-challenge-bank-contract-loader/37-CONTEXT.md` — loader API (`listChallenges`, `loadChallenge`, `loadHiddenTests`)
- `.planning/phases/38-judge0-infrastructure/38-CONTEXT.md` — `judge0Client.ts` contract + JUDGE0_LANGUAGE_MAP + network posture
- `.planning/phases/38-judge0-infrastructure/38-SPIKE-REPORT.md` — resource sizing + timeout constants after spike

### Existing code to mirror
- `src/lib/identity.ts` — `getCallerIdentity()` returns `{ role, associateId?, cohortId? }`
- `src/lib/rateLimitService.ts` — extend for `coding-submit` scope; DO NOT duplicate logic
- `src/app/api/*/route.ts` — Zod request validation + error envelope pattern (see `src/app/api/settings/route.ts` for a canonical example of auth-gated Zod route)
- `src/lib/sessionPersistence.ts` — Prisma write pattern + fire-and-forget gap-score follow-up

### Explicitly out-of-scope
- UI routes — Phase 40
- GapScore persistence wiring — Phase 41
- SQL dialect handling — Phase 42
- Terraform / CI-CD — Phase 43

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `rateLimitService.ts` pattern (per-device rate limits) — extend for per-user coding-submit scope
- `getCallerIdentity()` — same identity model used by /trainer routes
- `sessionPersistence.ts` — fire-and-forget side-effect wrapping pattern for gap score writeback
- `src/lib/codingSignalService.ts` (Phase 36) — `mapSignalToScore` already tested

### Established Patterns
- Route handlers live at `src/app/api/*/route.ts`. Zod schemas inline or adjacent. Error envelope consistent across routes.
- Server-only env vars accessed via `process.env.*`; client never sees Judge0 token.

### Integration Points
- `/api/coding/submit` ⇒ coding-challenge-service.loadHiddenTests ⇒ judge0Client.submit ⇒ prisma.codingAttempt.create
- `/api/coding/attempts/[id]` ⇒ polls judge0Client.getSubmission ⇒ updates prisma.codingAttempt ⇒ fires codingSignalService on done
- `/api/coding/challenges` ⇒ prisma.codingChallenge.findMany with cohort filter

### Known Constraints
- Judge0 async-only submit path. Polling cadence recommended to UI in Phase 40: exponential backoff starting 500ms, max 5 sec interval, stop at 60 sec wall
- Associate JWT contains cohortId claim — fetch from Supabase metadata on every request (cheap) or cached in `getCallerIdentity()`

</code_context>

<specifics>
## Specific Ideas

- Discovery: "Submit async, poll through Next.js" — D-03 hard rule
- Discovery: "proxy via Next.js: authenticate via Supabase session, enforce language allowlist, per-user rate limits, challenge authorization, server-side hidden test injection" — D-01..D-08 map 1:1
- Phase 36 codex consult: "compile_error should weight lower than wrong-answer failures" — reflected in D-12 via codingSignalService weight table

</specifics>

<deferred>
## Deferred Ideas

- **Webhook callback from Judge0** — avoids polling. Requires Judge0 config + public callback URL. v1.5 once infra hardened
- **Per-challenge rate limits** (e.g., can only resubmit same challenge every 60 sec) — v1.5
- **Attempt retention policy** (auto-delete after N days) — v1.5
- **Judge0 queue overflow handling / UI backpressure** — Phase 44 hardening

### Reviewed Todos (not folded)
None.

</deferred>

---

*Phase: 39-execution-api*
*Context gathered: 2026-04-18 (auto)*
