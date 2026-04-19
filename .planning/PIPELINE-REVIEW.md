# Pipeline Review — 2026-04-19

**PR:** #11 — `chore: archive v1.4 milestone + prep v1.5 planning`
**Branch:** `chore/v1.5-archive-v1.4` → `main`
**Scope:** v1.5 Cloud Run + Supabase hybrid migration (9 phases, 36 plans, 457 files, +40,395 / -14,989)
**Reviewer:** Claude Opus 4.7 orchestration + Codex gpt-5.4 (standard + adversarial) + manual verification
**Prior review:** `.planning/PIPELINE-REVIEW-v1.3.md.bak` (v1.3 gap closure — unrelated to this PR)

---

## BLOCKING ISSUES

> **Ship gate: BLOCK** — 1 × P0, 3 × P1 findings (verified). Merge-ready after fixes or explicit acknowledgement.

| ID | Sev | Area | One-liner |
|----|-----|------|-----------|
| F-01 | **P0** | `scripts/wipe-prod.ts` | `assertProdDatabase` validates `DATABASE_URL` but pool connects via `DIRECT_URL` — wrong-DB wipe possible |
| F-02 | **P1** | `.github/workflows/deploy-{staging,prod}.yml` | Docker build step does not pass `NEXT_PUBLIC_*` build-args — client bundle ships with empty Supabase URL/key |
| F-03 | **P1** | `.github/workflows/deploy-prod.yml` | Tag trigger `v*` accepts any string starting with `v` — no SemVer gate |
| F-04 | **P1** | `.github/workflows/deploy-prod.yml` + migrations | `prisma migrate deploy` runs before `gcloud run deploy`; if deploy fails, DB schema is ahead of running code |

P0 **F-01** is exploitable under realistic operator error. P1 **F-02** will silently ship a non-functional client bundle the moment the workflow runs its first real Docker build. The others are risk controls missing on prod-facing surfaces.

All 4 CI checks (Typecheck, Lint, Unit Tests, Prisma Schema Format) are **green**. Local re-run confirmed: `tsc --noEmit` clean, `vitest` 1085 pass / 4 skip, lint 0 errors / 183 warnings.

---

## Summary

| Lane | Result | Notes |
|------|--------|-------|
| Codex standard review | **FAIL** — 4 findings (1×P1, 3×P2) | Ran via `codex review --base main` |
| Codex adversarial review | **FAIL** — 12 findings (1×P0, 3×P1, 6×P2, 2×P3) | Ran via `codex exec` with hostile prompt |
| /cso (security audit) | **NOT RUN** — Skill tool unavailable in this session | STRIDE register in `.planning/SECURITY-v1.5.md` is the existing baseline; live /cso + abuse-test still PENDING per that doc |
| /health (code quality) | **PASS** | typecheck clean, 1085 tests pass, lint 0 errors |
| /gsd-audit-uat | **NOT RUN** — Skill tool unavailable | Outstanding UAT items tracked in `.planning/SECURITY-v1.5.md` (HARD-02 abuse-test PENDING) |
| /gsd-secure-phase | **PARTIAL** — manually cross-checked SECURITY-v1.5.md | 5/18 STRIDE entries still PENDING live-run artifacts |
| Auto-fix | **NOT RUN** — human decides |  |

**Constraint:** This session did not have access to the `Task`/`Agent` tool, so the 6 parallel review agents specified by the pipeline-review skill could not all be dispatched as independent subagents. Codex (the sole code reviewer per CLAUDE.md) ran to completion in both modes. /cso and /gsd-* lanes were deferred — see "Gaps" below.

**Merge readiness:** **BLOCKED on F-01 (P0)**; F-02 (P1) must ship before any real staging deploy or client auth breaks; F-03 / F-04 are recommended before the first prod tag push.

---

## Findings

### [P0] F-01 — `wipe-prod.ts` asserts one env var, uses another

**File:** `scripts/wipe-prod.ts:112-113, 117, 137`
**Source:** Codex adversarial + manually verified
**Evidence:**
```ts
// scripts/wipe-prod.ts:112-113
const prodRef = requireEnv('PROD_SUPABASE_REF');
assertProdDatabase(prodRef);             // ← reads DATABASE_URL per assert-staging-env.ts:50

// scripts/wipe-prod.ts:117, 137
const directUrl = requireEnv('DIRECT_URL');
const pool = poolFactory(directUrl);     // ← destructive pool connects to DIRECT_URL
```
```ts
// scripts/lib/assert-staging-env.ts:49-68 — reads DATABASE_URL only
export function assertProdDatabase(expectedProdRef: string): void {
  const url = process.env.DATABASE_URL ?? '';
  if (!url) { throw ... }
  if (url.includes(STAGING_REF)) { throw ... }
  if (!url.includes(expectedProdRef)) { throw ... }
}
```
**Exploit path:** Operator exports `DATABASE_URL=<prod-url>` (passes assertion) and `DIRECT_URL=<staging-or-other-url>` (used by pool). Running `npx tsx scripts/wipe-prod.ts --i-understand-this-wipes-prod` wipes the wrong database. The usage docstring (lines 17-25) tells operators to set both to `$PROD_DIRECT_URL`, but the code does not enforce that.
**Recommendation:** Either (a) have `assertProdDatabase` accept and check the actual string that will be used (`directUrl`), or (b) assert that `DATABASE_URL === DIRECT_URL` before trusting the `DATABASE_URL` check, or (c) remove `DATABASE_URL` from this script entirely and only read `DIRECT_URL`, updating `assertProdDatabase` to accept the URL string as input.
**Blocking:** Yes. Fix required before any human ever invokes this script against a real prod DB.

---

### [P1] F-02 — Docker build in deploy workflows omits `NEXT_PUBLIC_*` build-args

**Files:** `.github/workflows/deploy-staging.yml:55-66`, `.github/workflows/deploy-prod.yml:60-72`
**Source:** Codex standard review + manually verified against `Dockerfile:46-51`
**Evidence:** Commit `25a318c fix(docker): accept NEXT_PUBLIC_* as build ARGs` added:
```dockerfile
# Dockerfile:46-51
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
...
```
but neither deploy workflow uses `docker/build-push-action`'s `build-args:` input. The Secret Manager fetch step (`Fetch DIRECT_URL from Secret Manager`) happens AFTER the build, and only fetches DIRECT_URL + ADMIN_EMAILS — it doesn't fetch the NEXT_PUBLIC_* triplet at all.
**Consequence:** Client bundle ships with empty `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `NEXT_PUBLIC_SITE_URL`. Browser Supabase auth client will fail to initialize. Sign-in, magic link, /signin page, associate auth all break on the first CI-built revision.
**Recommendation:** Add a `Fetch NEXT_PUBLIC_* from Secret Manager` step before `docker/build-push-action`, then pass those values through `build-args:` on the build step. Mirror in `deploy-prod.yml`. Add a smoke check that a built image exposes non-empty `window.NEXT_PUBLIC_SUPABASE_URL`.
**Blocking:** Yes for any staging/prod deploy; merging without fixing is only safe if no deploy workflow runs before the fix.

---

### [P1] F-03 — Prod tag trigger `v*` is not SemVer-constrained

**File:** `.github/workflows/deploy-prod.yml:7-10`
**Source:** Codex adversarial
**Evidence:**
```yaml
on:
  push:
    tags:
      - 'v*'
```
**Exploit path:** Anyone with tag-push privileges on the repo (including via compromised developer token) can push `vX`, `v-malicious`, `v.`, etc. and trigger a prod build + migration + deploy from an attacker-controlled commit. No SemVer validation, no check that the tag points at a commit reachable from protected `main`.
**Recommendation:** Keep the `v*` filter for trigger discovery, but add a first step that validates the tag matches `^v[0-9]+\.[0-9]+\.[0-9]+(-rc[0-9]+)?$` and that `git merge-base --is-ancestor $GITHUB_SHA origin/main` succeeds. Enforce tag-protection rules in GitHub settings so only specific principals can create `v*` tags.
**Blocking:** Recommended before first prod tag push. Current mitigations: branch protection on `main`, WIF-scoped deploy SA, per-env attribute-condition on `attribute.repository`.

---

### [P1] F-04 — Prisma migrate runs before Cloud Run deploy

**File:** `.github/workflows/deploy-prod.yml:102-115`
**Source:** Codex adversarial
**Evidence:** Step 4 (`Prisma migrate deploy against prod DIRECT_URL`) runs at line 102-105, Step 5 (`Deploy to Cloud Run`) at 108-116. If Step 5 or the post-deploy smoke (Step 6) fails, DB schema is ahead of the running container's ORM expectations.
**Consequence:** Rollback via `rollback-prod.yml` pins to a previous revision, but the DB schema still reflects the failed-deploy attempt's migrations. If those migrations are additive (columns added) this is fine. If they rename/drop columns, the previous revision starts hitting runtime errors against data shapes it doesn't recognize.
**Recommendation:** Enforce expand/contract migration discipline (never drop/rename in the same deploy as code using the old shape). Add a `verify-backward-compat` step that runs the new schema against the *previous* revision's container before declaring the deploy green. Or split destructive migrations into a manual-approval post-deploy job.
**Blocking:** Recommended before first prod deploy. Current v1.5 migrations are all additive (Phase 43 Plan 01 is expand-only per PROJECT.md), so near-term risk is low.

---

### [P2] F-05 — `/api/health` returns 503 permanently in prod (Judge0 flag-dark)

**Files:** `src/lib/judge0Client.ts:202-205`, `src/app/api/health/route.ts:20-49`
**Source:** Codex standard review + manually verified
**Evidence:**
```ts
// judge0Client.ts:202-205
export async function systemInfo(timeoutMs = 2000): Promise<Judge0SystemInfo> {
  if (!isCodingEnabled()) { throw new CodingFeatureDisabledError(); }
  ...
}
```
```ts
// api/health/route.ts — catches any throw as status:'unreachable'
// and returns 503 unless both db + judge0 are 'ok'
```
In prod `CODING_CHALLENGES_ENABLED=false` per Phase 50 D-01 → `systemInfo` always throws → health always 503. The deploy workflows and Cloud Monitoring uptime checks both accept 503 as "healthy-enough", so the pipeline still works — but `/api/health` is effectively a lie signal in prod.
**Recommendation:** When the flag is off, branch `checkJudge0` to return `{ status: 'disabled' }` and treat it as OK for the `allOk` computation. Include `'disabled'` in the `Judge0Status` union and the response body.
**Blocking:** No (monitoring tolerates 503). Fix to restore health-check honesty.

---

### [P2] F-06 — `/api/coding/status` missing from abuse-test PUBLIC_ALLOWLIST

**File:** `scripts/lib/route-discovery.ts:28-44`
**Source:** Codex standard review
**Evidence:** Route `/api/coding/status` is intentionally unauthenticated (returns `{enabled: true}` publicly) per Phase 50 plan, but is not listed in `PUBLIC_ALLOWLIST`. When `abuse-test-all.ts` runs, its unauthenticated GET returns 200 → `computePassFail` flags as `unauth-200-on-protected` → whole run fails.
**Recommendation:** Add `'/api/coding/status'` to the allowlist. Consider extracting the list into a shared module with `src/middleware.ts` so they cannot drift.
**Blocking:** No (only breaks CI abuse-test when that runs). Quick fix.

---

### [P2] F-07 — `PUBLIC_ALLOWLIST` marks `/api/question-banks` as public despite unauthenticated POST/DELETE

**File:** `scripts/lib/route-discovery.ts:34`, `src/app/api/question-banks/route.ts:51-116`
**Source:** Codex adversarial + manually verified
**Evidence:** `/api/question-banks` exports GET (lists files), POST (uploads markdown files), DELETE (removes files). None check `getCallerIdentity`. `PUBLIC_ALLOWLIST` includes this path, so abuse-test's "200 on unauth" classifier blesses the writes.
**Exploit path:** Any anonymous internet caller can POST a file to `/api/question-banks`. In Cloud Run this writes to ephemeral container disk — visible only to that revision, wiped on restart. Real impact is limited, but it's a pre-existing auth gap shipped to prod.
**Recommendation:** Either (a) add `getCallerIdentity` + trainer-role check to POST/DELETE, or (b) gate the whole route behind a trainer-only middleware matcher. In v1.5 the question-bank UI has moved to GitHub-hosted banks — consider deleting this route entirely.
**Blocking:** No (impact limited by ephemeral Cloud Run storage). Worth cleaning up.

---

### [P2] F-08 — Route-discovery method parser misses non-`export function` signatures

**File:** `scripts/lib/route-discovery.ts:46-47`
**Source:** Codex adversarial
**Evidence:** The regex `/export\s+(?:async\s+)?function\s+(GET|POST|...)\b/` only matches `export async function GET(...)`. A future route written as `export const GET = NextResponse.json(...)` or `const GET = ...; export { GET }` gets `methods=[]`, which makes `abuse-test-all.ts:224` fall back to probing only default GET.
**Verified scope:** I grepped the current codebase — today every route uses `export async function METHOD` style, so no current handler is missed. The finding is a **staleness risk**, not an active miss.
**Recommendation:** Parse with a TypeScript AST (e.g. `typescript` compiler API or `@typescript-eslint/parser`), or fail-closed when `methods` is empty. The test at `scripts/__tests__/route-discovery.test.ts` should add a case with `export const GET = ...` and assert it is detected.
**Blocking:** No (no active miss in this PR).

---

### [P2] F-09 — `src/lib/supabase/admin.ts` lazy Proxy defers env failure to first request

**File:** `src/lib/supabase/admin.ts:6-20`
**Source:** Codex adversarial
**Evidence:** `getSupabaseAdmin` reads `process.env.NEXT_PUBLIC_SUPABASE_URL!` + `SUPABASE_SECRET_KEY!` only on first property access via the Proxy. The non-null assertions hide the miss — `createClient(undefined!, undefined!, ...)` succeeds silently, and the first actual auth.admin.* call throws from inside the Supabase client.
**Related to Phase 48 fix** `b2cb699 fix(supabase-admin): lazy-init client so next build works without env` — that commit made this lazy on purpose (so `next build` during Docker build didn't crash when env is unset). The trade-off is deferred failure mode.
**Recommendation:** Validate env at first access explicitly and throw a typed `SupabaseConfigError` with a clear message. Pairs with F-02 — once build-args are passed correctly, this stops being a silent failure.
**Blocking:** No. Mitigated by `src/instrumentation.ts` doing a boot probe in production (codex adversarial notes this).

---

### [P2] F-10 — `scripts/kill-switch.sh` has no optimistic concurrency guard

**File:** `scripts/kill-switch.sh:75-88`
**Source:** Codex adversarial
**Evidence:** `set_apex_value` reads the record ID, then PATCHes the new content. Two operators running `revert` + `restore` concurrently will both succeed against Cloudflare's API; the final DNS target is last-writer-wins (nondeterministic across retries).
**Recommendation:** Add an `--expect-current-ip=<ip>` flag that re-reads before patching and aborts if the record changed. Or serialize through a single incident workflow. For the 30-day SUNSET window this is low-probability, but worth hardening.
**Blocking:** No.

---

### [P2] F-11 — Middleware matcher misses legacy pages

**File:** `src/middleware.ts:143-153`
**Source:** Codex adversarial + manually verified
**Evidence:** Matcher covers `/dashboard`, `/interview`, `/review`, `/trainer`, `/associate`, `/coding`, `/profile`, `/auth/set-password`. It excludes: `/history`, `/question-banks`, `/pdf`, `/login`, `/auth/update-password`, and all `/api/*`. API protection is per-route (good). Page-level: `/history/page.tsx`, `/question-banks/page.tsx`, `/pdf/page.tsx` use client-side `useAuth()` only. Anyone with JS disabled sees the rendered shell. Those pages call protected APIs so functionality still fails — but the pages render.
**Recommendation:** Either (a) add `/history`, `/pdf`, `/question-banks` to matcher with trainer-role check, or (b) delete those pages in v1.5 (they're legacy and orphaned from v0.x flow). Option (b) is cleaner — v1.5 already removed their primary entry points.
**Blocking:** No (information disclosure only; no state mutation from page render).

---

### [P2] F-12 — Restore `npm run build` to required PR checks

**File:** `.github/workflows/pr-checks.yml:44-56`
**Source:** Codex standard review
**Evidence:** PR required checks today: Typecheck, Lint, Unit Tests, Prisma Format. No `npm run build`. Next.js prerender / route segment / font-loader / standalone-bundler failures are production-only and would pass this PR but fail in `deploy-staging.yml`.
**Recommendation:** Add a `build` job to `pr-checks.yml` running `npm run build` with minimal env. Does not need DB or secrets — build is offline. Keeps prod-build regressions out of `main`.
**Blocking:** No (current deploy workflows do build, so failures surface there — but after-merge).

---

### [P3] F-13 — Dynamic-segment substitution only handles 3 param names

**File:** `scripts/abuse-test-all.ts:68-72`
**Source:** Codex adversarial + manually verified
**Evidence:** Only substitutes `[weekId]`, `[slug]`, `[id]`. I grepped the current `src/app/api` tree — all 7 dynamic segments are `[slug]`, `[id]`, or `[weekId]`, so no current handler is missed. Staleness risk for future `[challengeId]`, `[cohortId]`, or catch-all `[[...slug]]` params.
**Recommendation:** Replace with a generic regex `substituteDynamicSegments(p) => p.replace(/\[\[?\.{0,3}\w+\]?\]/g, 'abuse-test-placeholder')`. Add a unit test in `route-discovery.test.ts` that asserts every discovered pattern has all `[...]` segments substituted.
**Blocking:** No.

---

### [P3] F-14 — Staging Cloud Run deploys vs. manual Terraform apply race

**Files:** `.github/workflows/deploy-staging.yml:8-10`, `iac/cloudrun/cloudrun-staging.tf:73-79`
**Source:** Codex adversarial
**Evidence:** Concurrency group `deploy-staging` only serializes against *itself*, not against a developer running `terraform apply -var-file=staging.tfvars` manually. `lifecycle.ignore_changes = [template[0].containers[0].image, ...]` covers the image field but not e.g. `scaling.max_instance_count`, secrets list, or ingress changes.
**Recommendation:** Document a terraform apply freeze (or wrap TF apply in a workflow that shares the concurrency group). Current solo-dev risk is low.
**Blocking:** No.

---

## Cross-check against existing SECURITY-v1.5.md

Reviewed `.planning/SECURITY-v1.5.md` (authored 2026-04-18, 147 lines). STRIDE register lists 18 threats across Cloud Run / DNS / App surfaces.

**Still PENDING live run (per that doc):**
- `/cso` findings section — "Task 2 human-action checkpoint" — unresolved
- Codex review section — "Task 3 live codex CLI" — **This review now closes that gate (see above)**
- Codex adversarial review section — "Task 3 live codex CLI" — **This review now closes that gate (see above)**
- T-49-APP-02 (protected route 200 to unauth) — HARD-02 abuse-test PENDING; requires live staging deploy
- T-49-APP-03 (wrong-role elevation) — same
- T-49-APP-06 (stack trace leak) — same

**New threats identified by this review not in SECURITY-v1.5.md:**
- F-01 — Production-wipe script env mismatch → not in STRIDE register; add as `T-46-APP-01` (T=Tampering, severity=critical, scope=wipe-prod.ts)
- F-02 — Client bundle missing NEXT_PUBLIC config → add as `T-48-CR-09` (T=Tampering, severity=high, scope=deploy workflows)
- F-03 — Unvalidated prod tag trigger → partial overlap with T-49-CR-02 but different gap; add as `T-51-CR-10`
- F-07 — Anon POST/DELETE on /api/question-banks → preexisting; add as `T-APP-10`

Recommend updating SECURITY-v1.5.md after the P0/P1 fixes land, closing out the PENDING codex sections with links to `/tmp/codex-review-v1.5.txt` + `/tmp/codex-adversarial-v1.5.txt` (or committed copies thereof).

---

## Gaps in this review

Full `/pipeline-review` skill requires 6 parallel review agents; this session did not have access to the generic `Task`/`Agent` dispatch tool. I ran:
- Codex standard review (diff against `main`) — **PASS** (ran to completion, 4 findings)
- Codex adversarial review (focused hostile prompt via `codex exec`) — **PASS** (ran to completion, 12 findings)
- Local health checks (typecheck / lint / tests) — **PASS**
- Manual cross-check of 5 high-risk code paths (wipe-prod, abuse-test, deploy workflows, supabase admin, middleware) — **PASS** (findings verified against source)

Deferred (would need fresh session with skill access):
- `/cso` live infra + OWASP + STRIDE + LLM security audit
- `/gsd-audit-uat` cross-phase UAT-item sweep
- `/gsd-secure-phase` per-phase threat-mitigation verification

Impact: The security-audit and UAT-completeness lanes are not run. `SECURITY-v1.5.md` STRIDE register and `.planning/SECURITY-v1.5-followups.md` provide partial coverage. Full /cso should be run before the v0.1 → v1.5 DNS cutover (Phase 52), not necessarily before merging PR #11.

---

## Artifacts

- `/tmp/codex-review-v1.5.txt` — 32,363 lines — standard codex review full transcript
- `/tmp/codex-adversarial-v1.5.txt` — 5,385 lines — adversarial codex review full transcript
- `.planning/PIPELINE-REVIEW-v1.3.md.bak` — previous review (v1.3, unrelated)
- `.planning/SECURITY-v1.5.md` — existing STRIDE register (still PENDING sections tracked above)

---

## Auto-decisions log

- Not unattended — no auto-fixes applied.
- P0 F-01 classified blocking because it enables silent wrong-DB wipe with realistic operator env mistake.
- P1 F-02 classified blocking because the moment staging deploy runs, client Supabase auth ships empty config.
- P1 F-03 + F-04 classified blocking-recommended (not hard-blocking) because v1.5 hasn't yet pushed its first prod tag and v1.5 migrations are additive; flaggable for explicit operator acknowledgement.
- P2/P3 findings flagged for follow-up; none require hot-fix before merge.
- Did not flag: WIF attribute-condition restriction (T-49-CR-01 — correctly restricts to `JesterCharles/mock-interview-assist`), digest-pin deploy (T-49-CR-02 — `docker/build-push-action` digest output used correctly), Secret Manager per-secret IAM binding (T-49-CR-05 — least-priv verified in `iam.tf`), k6 staging-only guard (`loadtest/baseline.js:92-95`), `assertStagingDatabase` in seed-staging (`scripts/seed-staging.ts:34` fires first), env hygiene script (`scripts/verify-env-hygiene.ts` — tight loop, no false positives).

---

## Overall: BLOCKED (1 × P0, 3 × P1)

**Recommendation:** Fix F-01 before merge (30-minute change). Fix F-02 before first deploy-workflow run (45-minute change). Acknowledge F-03 + F-04 explicitly (either fix now or file follow-up issues tagged for pre-cutover). P2/P3 as follow-up backlog.

After fixes, PR #11 is merge-ready from a review perspective. No functional regressions found. All 4 CI checks green. 1085 unit tests pass.
