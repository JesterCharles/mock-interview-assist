# Discovery Brief — v1.4 Coding Challenges + Multi-Language Sandbox

**Date:** 2026-04-18
**Mode:** Interactive (office-hours forcing questions + codex consult)
**Routing decision:** New milestone (v1.4) on existing project NLM
**Approved approach:** MSA-from-day-1 (Alternative B), 8-10 weeks

---

## Product Summary

Add coding challenges as a new continuous-practice rep type alongside existing mock interviews. Build a Judge0-based multi-language sandbox (Python, JS/TS, Java, SQL, .NET) loaded from GitHub challenge banks (public prompts, private hidden tests). Coding attempts feed the existing GapScore system via an explicit `CodingSkillSignal` mapping, giving trainers continuous traceability between the current 3 front-loaded coding assessments per 11-week cohort. Architecture deploys MSA-style from day 1 (dedicated Judge0 host + Terraform IaC + CI/CD) to support multi-cohort scale.

---

## Forcing Questions (Office Hours)

### Q1: Demand Reality
**Answer (verbatim):** *"Associates want practice, but we also NEED traceability on their technical skills and coding implementations. We've recently worked with a client where we missed a massive python coding skill gap, we got racked over the coals for this. We currently run 3 coding challenges for the ENTIRE 11 week duration in the very beginning and we only assess at one point in time. Turns out they failed earlier, but they never get more opportunity to practice."*

**Diagnosis:** Real client incident, named consequence (lost trust). Status quo is structurally broken: 3 challenges over 11 weeks, single assessment point, zero remediation path. This is genuine demand evidence — behavior, not interest.

### Q2: Status Quo
3 front-loaded coding challenges per 11-week cohort, manually administered. No continuous data. No remediation. No skill-currency tracking between assessment and end of cohort.

### Q4: Narrowest Wedge
User's first instinct: full sandbox + IDE + multi-lang.
Pushback: traceability-first wedge could ship in 3 wk vs 8 wk full system.
**User held the line:** time before next batch is available; wants to ship a full working system. Repo-loaded challenge bank (mirroring existing `github-service.ts` pattern for question banks) reduces architecture risk by reusing a proven loader.

### Q5: Observation
Skipped — user has direct lived experience from the client incident.

### Q6: Future-Fit
Coding challenges + multi-language is a category move that positions NLM as multi-modal practice platform (interview + code + future: design, system design). Long-term moat is continuous skill telemetry across rep types, not snapshot audits.

---

## Premises (User-Approved)

1. ✅ Coding challenges need their own data model (separate from `Session`) — otherwise readiness math becomes unexplainable
2. ✅ Hidden tests must NOT live in a public GitHub repo — leak risk via `/api/github` proxy
3. ✅ Stdin/stdout matching is sufficient for v1.4 pedagogy across the 5 named languages
4. ✅ SQL = SQLite-only for v1.4; real Postgres SQL is a v1.5+ separate hardened service
5. ✅ Judge0 must be proxied through Next.js — never exposed directly to associate browsers
6. ✅ MSA-from-day-1 deployment (dedicated Judge0 host + Terraform + CI/CD) is in scope for v1.4
7. ✅ Architecture must be env-driven (`JUDGE0_URL`) so it deploys local-mono OR remote-MSA without code changes

---

## Cross-Model Perspective (Codex Consult)

**Verdict:** Do NOT ship as "Judge0 + coding challenges plugged into Session." Ship as a separate `CodingAttempt`/`CodingChallenge` surface that contributes explicit, typed signals into `GapScore`.

### Key findings (paraphrased)

1. **Same-VM Judge0 risk is high but manageable.** Current `docker-compose.yml` has no resource limits. Judge0 default workers = `2 × nproc`. On 2 vCPU / 4GB → Python/JS only, queued UX, Java/.NET will starve. 4 vCPU / 8GB = MVP floor. 8 vCPU / 16GB = real concurrent feel for 10 users. **Pin Judge0 ≥ 1.13.1** — older versions had sandbox escape advisory ([GHSA-q7vg-26pg-v5hr](https://github.com/judge0/judge0/security/advisories/GHSA-q7vg-26pg-v5hr)).

2. **Stdin/stdout is sufficient if scope is honest.** Trains algorithms / control flow / hash maps / basic SQL. Loses Python `pytest` mastery, JS/TS Jest signal, Java OO design, and proper .NET SDK fluency (Judge0 ships C# Mono, NOT .NET 8+).

3. **SQL: SQLite only via Judge0's built-in language.** Trainer reporting must explicitly call out `SQL fundamentals (SQLite dialect)`. Real Postgres SQL = future hardened service with prewarmed isolated schemas, role-locked, `statement_timeout`, no extensions, no network, full teardown per attempt. NOT v1.4 scope.

4. **Auth boundary: never expose Judge0 to browsers.** Judge0 supports `X-Auth-Token` headers but browser exposure leaks tokens, allows submission enumeration, queue abuse. Proxy via Next.js: authenticate via Supabase session, enforce language allowlist, per-user rate limits, challenge authorization, server-side hidden test injection. Bind Judge0 to internal Docker network or localhost only. **Avoid `wait=true`** — Judge0 docs explicitly say it doesn't scale. Submit async, poll through Next.js.

5. **Hidden test storage:** `/api/github` proxy returns raw content by path. Public repo + hidden tests = associates fetch via DevTools and hardcode answers. → **Private GitHub repo (token-scoped, server-only fetch).**

6. **Critical week-6 risks:**
   - .NET turning into old C# console support
   - Hidden tests leaking through GitHub/proxy design
   - Associates hardcoding visible samples
   - Exact output matching causing whitespace/floating-point/order disputes
   - SQL dialect mismatch eroding trust
   - Judge0 queue states not surfaced in UI ("looks broken")
   - Resource limits tuned too late
   - Readiness gameable by easy attempts unless signal source + difficulty are weighted
   - Security posture depends on `enable_network=false` + patched Judge0 + no public port + firewall

7. **Codex's required action item BEFORE commit:** 1-day Judge0 spike on actual GCE VM size with 10 mixed submissions. Measure CPU/RAM/latency. Then commit. *(Folded into Phase 0 of the milestone.)*

---

## Approaches Considered

### Approach A: Mono-service v1.4 (~5-6 weeks)
Add Judge0 to existing docker-compose, single VM. MSA-ready architecture but not MSA deployment. Scale ceiling ~5 concurrent on current VM. Document upgrade path for v1.5.

### Approach B: MSA-from-day-1 (~8-10 weeks) ⭐ APPROVED
Same code as A but deploy phase included: Terraform/IaC + dedicated Judge0 host + CI/CD. Future-proofs the deployment. Adds 3-4 weeks of infra work but unblocks multi-cohort scale.

### Approach C: Backend-only v1.4 + UI in v1.5 (~4 weeks)
Ship data model + Judge0 + execution API + GapScore mapping. No UI. Trainer seeds challenges via DB script. Validates the loop with minimal surface. v1.5 = full UI + polish + deployment hardening.

---

## Recommended Approach (User-Selected)

**Approach B — MSA-from-day-1, 8-10 weeks.**

Rationale:
- User has time before next batch — no shipping pressure to truncate
- Coding challenges generate sustained CPU load patterns unique to the workload (not a casual addition)
- Dedicated Judge0 host + IaC = no rework when client demand grows
- Establishes deploy automation (carryover from DEPLOY-01/02/03 backlog) as part of meaningful product work, not chore work

---

## Phase Breakdown (Codex's 7-Phase Split + IaC Phase)

1. **Phase 36 — Data Model & Schema** (1 wk)
   - `CodingChallenge`, `CodingAttempt`, `CodingTestCase`, `CodingSkillSignal` Prisma models
   - Migrations + Supabase apply
   - Type generation
   - Unit tests for signal-to-GapScore mapping function

2. **Phase 37 — Challenge Bank Contract & Loader** (1 wk)
   - Public GitHub repo schema (markdown prompts + starter code per language)
   - Private GitHub repo schema (test cases per challenge, token-scoped fetch)
   - `coding-challenge-service.ts` loader + cache (mirrors `github-service.ts` pattern)
   - Validation pipeline (schema check, language whitelist, test-case sanity)

3. **Phase 38 — Judge0 Infrastructure (Local + Remote-Ready)** (1.5 wk)
   - Pin Judge0 ≥ 1.13.1
   - Add to `docker-compose.yml` for local dev (judge0-server, workers, Postgres, Redis)
   - Health endpoint
   - CPU/memory caps, worker count tuning
   - `enable_network=false` in sandbox config
   - Internal-network-only binding
   - Auth token generation
   - **Spike:** 10 concurrent mixed-language submissions, measure baseline

4. **Phase 39 — Execution API (Server-Side)** (1 wk)
   - `POST /api/coding/submit` (auth-gated, async, queue + immediate ID return)
   - `GET /api/coding/attempts/[id]` (poll for status/result)
   - `GET /api/coding/challenges` (list authorized for current associate)
   - Server-side hidden test injection from private repo
   - Language allowlist enforcement
   - Per-user rate limits (reuse `rateLimitService.ts` pattern)
   - Verdict normalization (pass/fail/timeout/MLE/runtime error)

5. **Phase 40 — UI MVP** (1.5 wk)
   - `/coding` route: challenge list (filter by language, week, difficulty)
   - `/coding/[challengeId]` route: prompt + Monaco editor + Run + Submit
   - Attempt history sidebar (visible test results, hidden test verdicts)
   - Queue/running/error states surfaced clearly

6. **Phase 41 — GapScore Integration & Trainer Visibility** (1 wk)
   - `CodingSkillSignal` → `GapScore` mapping with explicit weights (e.g., compile error = different signal than wrong-answer)
   - Trainer dashboard: per-associate coding attempt history with skill bars
   - Document readiness math impact in `DESIGN.md` and `PROJECT.md`
   - Migration: backfill existing 3-challenge cohort data into new schema (optional)

7. **Phase 42 — SQL MVP (SQLite Only)** (0.5 wk)
   - Judge0 SQLite language wired
   - Schema + seed data injection per challenge (server-side)
   - Result normalization (column order, whitespace, type coercion)
   - Trainer reporting label: `SQL fundamentals (SQLite dialect)`
   - Document Postgres SQL deferred to v1.5

8. **Phase 43 — MSA Deployment (Terraform + CI/CD)** (1.5 wk)
   - Terraform module: dedicated Judge0 host (GCE n1-standard-4 or equivalent)
   - GitHub Actions: build, test, deploy app + judge0 separately
   - Health checks, rollback path
   - Monitoring: Judge0 queue depth, submission latency p50/p95
   - Runbook: Judge0 patching, scale-up procedure, abuse response

9. **Phase 44 — Hardening + Load Test** (1 wk)
   - Load test: 50 concurrent submissions across all 5 languages
   - Abuse test: malicious payloads (fork bombs, infinite loops, network attempts)
   - Security review: STRIDE per Phase 38 + 39 + 43
   - Final docs: ARCHITECTURE.md update, README quickstart for coding feature

**Total: 9 phases, ~10 weeks.** Phases 38 + 43 carry the MSA tax (~3 weeks combined) over Approach A.

---

## Open Questions

1. **GCE VM current spec** — needs verification before Phase 38 spike. Check `gce-deployment-guide.md` or GCE console.
2. **.NET version** — Judge0 ships old C# Mono. If client demand is .NET 8+ (modern ASP.NET, async/await, LINQ), need separate runtime — likely defer .NET to v1.5. Confirm with stakeholder.
3. **Trainer authoring workflow** — markdown editor in app, GitHub PR, or both? (likely PR for v1.4, in-app editor v1.5)
4. **Cohort assignment of challenges** — by week (existing CurriculumWeek pattern) or freeform? Likely week-aligned to mirror existing curriculum filter behavior.
5. **Backfill** — do the 3 existing per-cohort challenges get retroactively imported as `CodingAttempt` rows? Decide in Phase 41.

---

## Success Criteria (Measurable)

1. Trainer can author a Python coding challenge in the private repo and have it appear in associate UI within 5 min (cache invalidation works)
2. Associate can submit Python solution and see verdict (pass/fail with test details visible/hidden as configured) within 10 sec p95
3. CodingAttempt scores feed GapScore.weightedScore for the relevant skill within 5 sec of completion
4. Trainer dashboard shows continuous coding skill traceability across all 11 weeks of a cohort (vs current 3 data points)
5. Load test: 50 concurrent submissions complete without queue death or app degradation
6. Zero security findings in adversarial codex review (Phases 38 + 39 + 43 in particular)

---

## Distribution Plan

- App + Judge0 deploy via GitHub Actions on tag push
- Terraform-managed GCE infrastructure (replaces manual SSH-and-docker-compose pattern from current deploy)
- Health checks + rollback automated
- Monitoring via existing GCE logging + new Judge0 queue depth metric (push to Logs Explorer)

---

## Seeds Planted (for v1.5+)

1. **Function-level test harness** — wrap user code in per-language drivers (LeetCode-style). Triggered when associates push back on stdin/stdout pedagogy.
2. **Real Postgres SQL runner** — separate hardened service with isolated schemas, role-locked, statement_timeout. Triggered when SQLite dialect creates client-facing false positives/negatives.
3. **In-app challenge authoring** — markdown editor + test runner UI for trainers. Triggered when PR-based authoring becomes a bottleneck.
4. **.NET 8+ runtime** — separate sandbox if Judge0's C# Mono insufficient. Triggered by client demand for modern .NET.
5. **Multi-modal practice platform** — design challenges, system design, behavioral simulations. v2.0 vision.
6. **Anti-cheat heuristics** — detect AI-generated submissions, sample memorization. Triggered when client trust signals require it.

---

## Next Step

→ `/gsd-new-milestone v1.4` to create REQUIREMENTS.md + populate ROADMAP.md v1.4 phases (36-44)
→ Then `/pipeline-coordinator --resume` to advance through plan + execute stages

---

## Pipeline Decision Log

| Decision | Owner | Rationale |
|----------|-------|-----------|
| New milestone (not backlog/decimal phase) | User | Coding challenges = category move, not a fix |
| MSA-from-day-1 (Approach B) | User | Time before next batch + dedicated infra wanted |
| Separate CodingChallenge/Attempt/TestCase/SkillSignal | Codex challenge → user accepted | Readiness math stays explainable |
| Private GitHub repo for hidden tests | Codex challenge → user accepted | Prevents leak via /api/github proxy |
| Stdin/stdout matching for v1.4 | Codex agreed sufficient | Function harness = v1.5 if associates need it |
| SQLite only for SQL | Codex recommended | Real Postgres SQL = v1.5 hardened service |
| Async submit + poll (no `wait=true`) | Codex hard recommendation | Judge0 docs say wait mode doesn't scale |
| Pin Judge0 ≥ 1.13.1 | Codex required | Older versions had sandbox escape (GHSA-q7vg-26pg-v5hr) |
| Phase 38 = Judge0 spike before commit | Codex required gate | De-risks resource sizing assumptions |

---

_Pipeline-discover stage complete. Artifact ready for ingestion by `/gsd-new-milestone`._
