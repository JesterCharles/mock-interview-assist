# Phase 49: k6 Load Test + Hardening (HARD-01..03) - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning
**Mode:** `--auto`

<domain>
## Phase Boundary

Phase 49 **stress-tests + security-hardens the live staging deployment**. Produces three committed artifacts: `loadtest-baseline-v1.5.md` (quantitative baseline), `SECURITY-v1.5.md` (abuse-test + STRIDE triage), and a k6 scenario + report pipeline wired into `load-test.yml` (shell from Phase 48, body from Phase 49).

**In scope:** `loadtest/baseline.js` (k6 scenario), fill `load-test.yml` body, abuse-test expansion across **every `/api/*` route** (existing `scripts/abuse-test-coding.ts` covers only coding routes), STRIDE threat model authoring + `codex adversarial-review` sign-off, GCP cost extrapolation from load-test metrics, quantitative baseline doc.

**Out of scope:** Prod load testing (Phase 49 targets staging only), WAF / Cloud Armor deployment (deferred), fixing bugs found (if any — log as follow-up phases).

</domain>

<decisions>
## Implementation Decisions

### k6 Scenario Design (LOAD-01, LOAD-02, LOAD-03)
- **D-01:** `loadtest/baseline.js` — ramp 0→10 VUs in 1 min → steady 50 VUs for 3 min → spike 100 VUs for 2 min → ramp-down 0 VUs in 1 min. Total ~10 min. Uses `k6@latest` Docker image in CI.
- **D-02:** Traffic mix (weighted):
  - 40% `GET /` (public homepage)
  - 30% `GET /api/health`
  - 15% `POST /api/public/interview/start` (public automated interview)
  - 10% `POST /api/public/interview/agent` (public interview tick)
  - 5% `GET /api/question-banks` (question bank manifest)
  - **0% `/api/coding/*`** — CODING_CHALLENGES_ENABLED=false during v1.5 staging load test (HARD-01)
- **D-03:** VU think-time 1-3s between requests (`sleep(Math.random() * 2 + 1)`) to approximate human usage.
- **D-04:** Thresholds (declared in k6 options):
  - `http_req_failed < 1%` — fail test if > 1% 5xx
  - `http_req_duration{kind:static} p(95) < 500` — p95 < 500ms on static routes
  - `http_req_duration{kind:api} p(95) < 1000` — p95 < 1s on dynamic routes
  - `checks > 99%` — all `check()` calls must pass 99%+
- **D-05:** k6 output: JSON summary (`--out json=/tmp/loadtest-result.json`) + text stdout; CI uploads both as artifacts. Report generator script `loadtest/generate-report.ts` converts JSON → markdown.
- **D-06:** GH Actions `load-test.yml` triggers: manual `workflow_dispatch` + pre-tag (on `v*` tag). Runs k6 via `grafana/k6-action@v0.3` against `https://staging.nextlevelmock.com`. Artifact retention: 30 days.

### Cost Extrapolation (LOAD-03)
- **D-07:** After the load-test, pull Cloud Run metrics via `gcloud monitoring metrics list` for `request_count`, `cpu_utilization`, `memory_utilization` during the test window. Script `loadtest/extrapolate-cost.ts` reads these + uses Cloud Run pricing constants (billed vCPU-seconds + GB-seconds + requests) to project $/1000 requests. Output feeds into `loadtest-baseline-v1.5.md`.
- **D-08:** Supabase query count per user session: instrument the k6 scenario to include a header `X-Session-ID: <uuid>` per VU iteration; query Cloud Logging post-run with a filter on the session ID to count Prisma queries. Report the 50th/95th percentile per simulated user session.

### Abuse Test (HARD-02)
- **D-09:** Expand `scripts/abuse-test-coding.ts` into a general `scripts/abuse-test-all.ts` that iterates **every `/api/*` route** discovered via `src/app/api/**/route.ts` glob. For each route, attempts: unauthenticated GET, unauthenticated POST with empty body, unauthenticated POST with fake user ID, expired-token POST, wrong-role POST (trainer token against associate route, vice versa). Records response status + body.
- **D-10:** Success criterion: no route returns 200/secret-data to an unauthenticated request; every protected route returns 401 or 403; error bodies contain no PII, no stack traces, no internal paths (grep output against a denylist: `/app/`, `/src/`, `at /`, PII patterns, `prisma/`).
- **D-11:** Output: `.planning/SECURITY-v1.5-abuse-test.json` (structured) + summary in `.planning/SECURITY-v1.5.md` under `## Abuse Test Results`. Running against `https://staging.nextlevelmock.com`.

### STRIDE Threat Model (HARD-03)
- **D-12:** Document at `.planning/SECURITY-v1.5.md`. Sections: STRIDE table (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege) covering:
  - Cloud Run deployment surface (ingress, WIF, SA permissions, secret binding, image supply chain)
  - DNS cutover surface (Cloudflare DNS-over-HTTPS, A-record hijack, cert transparency, Cloudflare account auth)
  - App-layer (existing auth, PII handling, rate limiting)
- **D-13:** Each finding has: threat, mitigation (action OR explicit accept), owner, status. Uses the same template as `.planning/phases/45-*/45-RESEARCH.md` security domain section.
- **D-14:** `codex adversarial-review` runs against `SECURITY-v1.5.md` once final; Codex's verdict + sign-off hash committed into the doc. Per CLAUDE.md "Security audits use gstack /cso; codex reviews after" — both run.
- **D-15:** Findings severity: `critical|high|medium|low|info`. Blocking threshold: NO critical, NO high (per project Unified Workflow security_block_on=high). Medium+ go into `.planning/SECURITY-v1.5-followups.md` with ticket owner + target phase.

### Artifact Locations
- **D-16:** `loadtest/baseline.js` (scenario), `loadtest/generate-report.ts` (JSON → MD), `loadtest/extrapolate-cost.ts` (cost), `loadtest/run-baseline.sh` (local wrapper).
- **D-17:** `.planning/loadtest-baseline-v1.5.md` (quantitative baseline doc — committed).
- **D-18:** `.planning/SECURITY-v1.5.md` (STRIDE + abuse — committed).
- **D-19:** `.planning/SECURITY-v1.5-followups.md` (medium/low findings — committed if any exist).
- **D-20:** `scripts/abuse-test-all.ts` + `scripts/lib/route-discovery.ts` (helper that globs `src/app/api/**`).

### Claude's Discretion
- Exact k6 scenario names and stage durations (minor variations OK).
- Markdown template layout for `loadtest-baseline-v1.5.md`.
- Whether to cache k6 docker image in CI for speed.
- Whether to split SECURITY doc into multiple files (STRIDE + abuse) or one. Default: single file.

### Folded Todos
None.

</decisions>

<canonical_refs>
## Canonical References

- `.planning/REQUIREMENTS.md` §LOAD (LOAD-01..03), §HARD (HARD-01..03)
- `.planning/ROADMAP.md` §Phase 49
- `.planning/phases/47-*/47-CONTEXT.md` (D-23 cold-start probe — complementary to load test)
- `.planning/phases/48-*/48-CONTEXT.md` (D-05 load-test.yml shell, D-12 dashboard supports load-test observation)
- CLAUDE.md — Security Rules (`/cso` then `codex review` then `codex adversarial-review`)
- scripts/abuse-test-coding.ts (existing — reference pattern)
- scripts/load-test-coding.ts (existing — reference pattern)
- src/app/api/** (abuse test target)
- External: [k6 docs](https://k6.io/docs/), [Cloud Run pricing](https://cloud.google.com/run/pricing)

</canonical_refs>

<code_context>
## Existing Code Insights

- `scripts/abuse-test-coding.ts` — existing coding-routes abuse test. Phase 49 generalizes (`abuse-test-all.ts`).
- `scripts/load-test-coding.ts` — existing coding-routes load test. Phase 49 replaces with k6 (different tool).
- `src/app/api/` — 20+ route files; glob discovery required.

</code_context>

<specifics>
## Specific Ideas

- Load test runs against **staging only**. Prod is still v0.1 GCE until Phase 52 — no load testing against live public users.
- STRIDE review is the **gate for Phase 52 DNS cutover**. No cutover without signed SECURITY-v1.5.md.
- Codex adversarial-review is mandatory per CLAUDE.md.

</specifics>

<deferred>
## Deferred Ideas

- **Cloud Armor / WAF** — out of scope v1.5; revisit after SECURITY-v1.5 findings.
- **Continuous load testing in CI** — Phase 49 is one-time baseline; continuous deferred.
- **SLO burn-rate alerts** — deferred; Phase 48 uptime alert + dashboard is baseline.
- **Judge0-enabled load test** — deferred to v1.6 (JUDGE-INTEG-01..04 keeps flag off in v1.5).

### Reviewed Todos (not folded)
None.

</deferred>

---

*Phase: 49-k6-load-test-hardening*
*Context gathered: 2026-04-18 (auto mode)*
