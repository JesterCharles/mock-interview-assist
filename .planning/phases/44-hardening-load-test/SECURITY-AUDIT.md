# Phase 44 Manual Security Audit — Phases 38 + 39 + 43

**Status:** MANUAL DRAFT (executor-authored; produced without `/cso` or
`codex adversarial-review` tooling access).
**Scope:** Phase 38 (Judge0 infrastructure), Phase 39 (Execution API),
Phase 43 (MSA deployment).
**Purpose:** Pre-drafted STRIDE + adversarial lens over the v1.4 coding
surface. Intended as a **baseline that the human operator upgrades** by
running `gstack /cso` → `.planning/phases/44-hardening-load-test/44-CSO-REPORT.md`
and `codex adversarial-review` →
`.planning/phases/44-hardening-load-test/44-CODEX-ADVERSARIAL-REPORT.md`
before Phase 44 merge (per Plan 44-02 D-07 / D-08).

Because both gating tools are interactive, this file is informational — it
does NOT satisfy HARD-03 on its own. HARD-03 is satisfied only when both
`44-CSO-REPORT.md` and `44-CODEX-ADVERSARIAL-REPORT.md` exist with explicit
`VERDICT: PASS` lines and zero `SEVERITY: HIGH` findings (Plan 44-02
verify block).

---

## Diff Scope

Files reviewed (v1.4 surface through Phase 43):

- `src/lib/judge0Client.ts` — Judge0 HTTP client (Phase 38 D-11)
- `src/lib/judge0Errors.ts` — typed error surface (Phase 38)
- `src/lib/coding-challenge-service.ts` — two-repo loader (Phase 37; used by
  Phase 39)
- `src/lib/coding-bank-schemas.ts` — Zod schemas (Phase 37)
- `src/app/api/coding/submit/route.ts` — POST submit (Phase 39)
- `src/app/api/coding/attempts/[id]/route.ts` — poll (Phase 39)
- `src/app/api/coding/challenges/route.ts` — manifest (Phase 39)
- `src/lib/codingSignalService.ts` — signal math (Phase 36 / 41)
- `src/lib/codingAttemptPoll.ts` — poll helper (Phase 39 / 41)
- `src/lib/gapPersistence.ts` — fire-and-forget gap writer (Phase 41)
- `docker-compose.yml` — Judge0 service definitions (Phase 38)
- `infra/terraform/*.tf` — GCE Judge0 VM + network (Phase 43)
- `.github/workflows/deploy-app.yml` / `deploy-judge0.yml` — CI/CD (Phase 43)
- `scripts/push-judge0-metrics.mjs` — metrics cron (Phase 43)

---

## STRIDE Coverage Matrix (D-09)

| Component        | Threats reviewed                    |
|------------------|-------------------------------------|
| Judge0 sandbox   | Tampering, Elevation                |
| Execution API    | Spoofing, Tampering, Info Disclosure, DoS |
| Terraform / CI   | Elevation, Tampering                |

---

## Findings

### Judge0 Sandbox

**F-01 | Judge0 sandbox caps authoritative**
SEVERITY: INFO
STRIDE: Tampering + Elevation
Evidence: `docker-compose.yml` pins Judge0 to `judge0/judge0:1.13.1` which
carries the GHSA-q7vg-26pg-v5hr patch. `enable_network=false`,
`max_processes=60`, `max_cpu_time_limit=10`, `max_memory_limit=256000 KB`,
`max_file_size=8192 KB` all set at image level. Port 2358 bound to
`127.0.0.1` only (`JUDGE0_EXPOSE_LOCAL`).
MITIGATION: Plan 44-01 Task 2 abuse test harness verifies empirically. On a
deployed run, each payload class must land in its allowed verdict set.

**F-02 | Auth token on Judge0 HTTP path**
SEVERITY: INFO
STRIDE: Spoofing + Tampering
Evidence: `src/lib/judge0Client.ts` sends `X-Auth-Token: JUDGE0_AUTH_TOKEN`
on every call; `AUTHN_HEADER`/`AUTHN_TOKEN` are set in `docker-compose.yml`
env block. Judge0 rejects unauthenticated requests.

### Execution API

**F-03 | Hidden tests server-only**
SEVERITY: INFO
STRIDE: Info Disclosure
Evidence: `src/lib/coding-challenge-service.ts` uses the `server-only`
import at module scope. `src/app/api/coding/submit/route.ts` (Phase 39)
never echoes hidden-test fixtures in the response body — only pass/fail
counts.
MITIGATION: Phase 39 `CODING-API-02` is the enforcement; Phase 42 added the
SQL `HIDDEN TEST SHIELD` for the SQL branch; no regression observed.

**F-04 | Payload size cap**
SEVERITY: INFO
STRIDE: DoS
Evidence: `SubmitBodySchema` caps `code` at 100 KB
(`z.string().min(1).max(100_000)`). Test fields capped at 64 KB per
`coding-bank-schemas.ts` (`TEST_FIELD_MAX`). Starter files capped at 50 KB.
`setup.sql` capped at 64 KB (Phase 42).

**F-05 | Rate limit gate**
SEVERITY: INFO
STRIDE: DoS
Evidence: `checkCodingSubmitRateLimit` / `incrementCodingSubmitCount` in
`src/lib/rateLimitService.ts` called before any Judge0 submission. 429 +
Retry-After emitted on breach.

**F-06 | Associate / cohort authorization**
SEVERITY: INFO
STRIDE: Tampering + Spoofing
Evidence: Submit route loads challenge, compares
`associate.cohortId === challenge.cohortId` (or `challenge.cohortId === null`);
403 FORBIDDEN on mismatch. Trainer identity cannot submit
(no `associateId`) — 403. Anonymous → 401.

**F-07 | Recommend — add abuse-pattern rate limit tier (v1.5 seed)**
SEVERITY: LOW
STRIDE: DoS
Evidence: Current rate limit is per-associate submit count; a compromised
associate session could still submit 6 payload classes × 5 langs = 30 large
allocations per minute without breaching the submit rate limit. The Phase 38
caps contain each individual payload, but the aggregate worker pressure is
not gated.
MITIGATION (proposed, not blocking): add a heavier cost-per-verdict-class
limiter post-v1.4. Accept-for-v1.4 because Phase 38's queue sizing
(validated by Plan 44-01 Task 1) already accommodates the worst-case
burst from a single associate.

### Terraform / CI

**F-08 | Service-account least privilege**
SEVERITY: INFO (to verify at deploy time)
STRIDE: Elevation
Evidence: `infra/terraform/*.tf` declares dedicated service accounts for
app VM and Judge0 VM (Phase 43 D-05). `/cso` should re-verify the SA scopes
don't grant unnecessary projectIAM or billing perms on the deployed stack.
MITIGATION: deferred to `/cso` deep-dive (Plan 44-02 Task 1).

**F-09 | Secret flow in CI**
SEVERITY: INFO (to verify)
STRIDE: Tampering
Evidence: `.github/workflows/deploy-app.yml` / `deploy-judge0.yml` read
secrets from GH Actions secrets; Terraform state stored in a GCS bucket with
uniform bucket-level access. Metrics cron uses a separate service-account
key.
MITIGATION: confirm during `/cso` run that no secret appears in logs or in
the Terraform plan output.

---

## Adversarial Lens (executor pass)

These are issues the executor would flag in `codex adversarial-review`; all
LOW/INFO — none currently HIGH.

**A-01** — Submit route deletes the pending attempt on Judge0 failure. If
the attempt write partially lands (N test cases tokenized before the N+1th
fails), the `delete` must be scoped to the in-progress attempt ID only, not
a broader cascade. Confirm via line-by-line read of the Phase 39 submit
route (the delete call path has a finally-block — safe).

**A-02** — Poll route must treat `verdict === 'pending'` as the only
non-terminal state. `judge0Verdict.ts` must not add new states without the
client-side polling code also learning them. Observed: the verdict enum is
closed (`pending | pass | fail | timeout | mle | runtime_error | compile_error`)
and matches Phase 42's SQL-path additions.

**A-03** — Metrics cron (`scripts/push-judge0-metrics.mjs`) — a compromised
scheduling job could flood Cloud Logging. Log writes are bounded by GCP
project quota; accept.

**A-04** — ETag-keyed GitHub cache — if a trainer force-pushes to the
public repo, ETag may stay the same while content differs. Phase 37's
loader uses content SHA where available. Confirm during `/cso`.

---

## Summary Counts (Executor Draft)

| Severity | Count |
|----------|-------|
| HIGH     | 0     |
| MEDIUM   | 0     |
| LOW      | 1 (F-07, accepted for v1.4) |
| INFO     | 11    |

**DRAFT VERDICT: PASS** (pending `/cso` + `codex adversarial-review`
confirmation per Plan 44-02 gate criteria).

---

## Next Actions for Operator

1. Run `gstack /cso --scope "phases 38, 39, 43"` and save output to
   `44-CSO-REPORT.md`. Use this file as a checklist; any findings here
   (F-01..F-09) should be represented in the /cso output either as the
   same call-out or as "verified clean."
2. Run `codex adversarial-review <base>..<head>` (SHA range per Plan 44-02
   D-08) and save output to `44-CODEX-ADVERSARIAL-REPORT.md`.
3. Both reports MUST include a `VERDICT: PASS` line and zero
   `SEVERITY: HIGH` occurrences to satisfy HARD-03.
4. If HIGH is found, remediate in follow-up PR against Phases 38 / 39 / 43
   before merging Phase 44.
