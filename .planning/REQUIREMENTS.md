# Requirements: v1.4 — Coding Challenges + Multi-Language Sandbox

**Milestone:** v1.4
**Defined:** 2026-04-18
**Source:** `.planning/PIPELINE-DISCOVER.md` (discovery brief 2026-04-18, user-approved Approach B — MSA-from-day-1)
**Approach:** 9 phases (36-44), ~8-10 weeks

**Core Value carry-over:** Associates get consistent, feedback-rich practice reps that adapt to their weaknesses. v1.4 extends this from mock interviews into coding challenges — continuous skill telemetry across rep types replaces the current 3-point front-loaded coding assessment.

---

## Requirements (v1.4 Active)

### Data Model (CODING-MODEL-NN) — Phase 36

- [x] **CODING-MODEL-01**: Prisma `CodingChallenge` model: id, slug, title, language enum (python/javascript/typescript/java/sql/csharp), difficulty, description (markdown path in public repo), skillSlug (joins to existing curriculum), cohortId nullable, createdAt, updatedAt
- [x] **CODING-MODEL-02**: Prisma `CodingAttempt` model: id, associateId FK, challengeId FK, submittedCode, language, verdict enum (pass/fail/timeout/mle/runtime_error/compile_error/pending), visibleTestResults JSON, hiddenTestResults JSON (verdict-only), score (0-100), judge0Token, submittedAt, completedAt
- [x] **CODING-MODEL-03**: Prisma `CodingTestCase` model: id, challengeId FK, isHidden bool, stdin, expectedStdout, weight (for partial credit), orderIndex — hidden rows loaded server-only from private repo, never persisted to client responses
- [x] **CODING-MODEL-04**: Prisma `CodingSkillSignal` model: id, attemptId FK (unique), skillSlug, signalType enum (pass/partial/fail/compile_error/timeout), weight float, mappedScore 0-100 — explicit mapping that feeds GapScore
- [x] **CODING-MODEL-05**: Idempotent `0002_coding_challenges` Prisma migration (`IF NOT EXISTS`, DO-block FK guards) so `prisma migrate deploy` is safe over existing databases
- [x] **CODING-MODEL-06**: Pure-function `codingSignalService.ts` maps `CodingSkillSignal` rows into GapScore inputs (weighted by signal type; compile_error weighted lower than wrong-answer)

### Challenge Bank (CODING-BANK-NN) — Phase 37

- [ ] **CODING-BANK-01**: Public GitHub repo schema for challenge prompts: `challenges/<slug>/README.md` (prompt markdown), `starters/<lang>.{ext}` (starter code per language), `visible-tests.json` (stdin/stdout pairs)
- [ ] **CODING-BANK-02**: Private GitHub repo schema for hidden tests: `challenges/<slug>/hidden-tests.json` (never exposed to clients); token-scoped server-only fetch via `GITHUB_CODING_PRIVATE_TOKEN`
- [ ] **CODING-BANK-03**: `coding-challenge-service.ts` loader mirrors existing `github-service.ts` pattern — proxied through `/api/github` for public content, separate server-only path for private tests
- [ ] **CODING-BANK-04**: In-memory manifest cache with ETag short-circuit (reuses v1.2 cache pattern); 5-min invalidation window so trainer author-to-visible time ≤ 5 min
- [ ] **CODING-BANK-05**: Validation pipeline: schema check, language whitelist enforcement, test-case sanity (stdin/stdout non-empty, expected output normalized), duplicate-slug guard

### Judge0 Infrastructure (JUDGE-NN) — Phase 38

- [x] **JUDGE-01**: Judge0 pinned to ≥ 1.13.1 (addresses sandbox escape advisory GHSA-q7vg-26pg-v5hr) in `docker-compose.yml`
- [x] **JUDGE-02**: Judge0 stack added to local `docker-compose.yml`: judge0-server, judge0-workers, Judge0 Postgres, Judge0 Redis — bound to internal Docker network or localhost only, never published to host
- [x] **JUDGE-03**: Judge0 sandbox config: `enable_network=false`, CPU + memory caps tuned, worker count = 2×vCPU baseline with explicit override env var
- [x] **JUDGE-04**: `JUDGE0_URL` + `JUDGE0_AUTH_TOKEN` env vars drive the client — architecture deploys local-mono OR remote-MSA without code changes
- [x] **JUDGE-05**: `/api/health` extended with Judge0 reachability probe (200 ok / 503 unreachable)
- [ ] **JUDGE-06**: Load spike at Phase 38 gate: 10 concurrent mixed-language submissions on actual GCE VM size; measure CPU/RAM/p50/p95 — commit resource sizing to PROJECT.md before Phase 39 begins

### Execution API (CODING-API-NN) — Phase 39

- [x] **CODING-API-01**: `POST /api/coding/submit` auth-gated (Supabase session + `getCallerIdentity()`); async submit pattern (submit → return attempt id → poll); NEVER uses Judge0 `wait=true`
- [x] **CODING-API-02**: Server-side hidden test injection from private repo — client never receives hidden test inputs or expected outputs in request/response bodies
- [x] **CODING-API-03**: Language allowlist enforced server-side (python, javascript, typescript, java, sql, csharp); rejection returns 400 with explicit error code
- [x] **CODING-API-04**: Per-user rate limits reuse `rateLimitService.ts` pattern (e.g., 30 submissions/hour, 200/day) with explicit env config
- [x] **CODING-API-05**: `GET /api/coding/attempts/[id]` polling endpoint returns verdict + visible test details + hidden test pass/fail count only (not hidden inputs)
- [x] **CODING-API-06**: `GET /api/coding/challenges` lists challenges authorized for current associate (filtered by cohort + curriculum week if assigned)
- [x] **CODING-API-07**: Verdict normalization layer maps Judge0 status codes to canonical enum (pass/fail/timeout/mle/runtime_error/compile_error) so UI + scoring see one contract

### UI (CODING-UI-NN) — Phase 40

- [x] **CODING-UI-01**: `/coding` route shows challenge list filtered by language, week, difficulty, status (unstarted/attempted/passed); empty state when no cohort
- [x] **CODING-UI-02**: `/coding/[challengeId]` renders prompt markdown + Monaco editor (lazy-loaded, language-switched) + Run/Submit buttons + attempt history sidebar
- [x] **CODING-UI-03**: Run/Submit states surfaced explicitly in UI: queued → running → verdict (visible test results shown; hidden tests show only pass count, never inputs)
- [x] **CODING-UI-04**: Attempt history sidebar per associate per challenge (recent N attempts with verdict badges + timestamps), scoped to the authenticated associate
- [x] **CODING-UI-05**: AppShell integration — new sidebar entry "Coding" in associate and trainer nav (role-aware), uses existing DESIGN.md tokens, dark mode compliant

### GapScore Integration (CODING-SCORE-NN) — Phase 41

- [ ] **CODING-SCORE-01**: `CodingSkillSignal` writes fire-and-forget from attempt completion; GapScore recompute triggered within 5 sec of attempt verdict
- [ ] **CODING-SCORE-02**: Coding signals feed existing GapScore recency-weighted algorithm (0.8 decay); difficulty-weighted so easy-attempt farming cannot inflate readiness
- [ ] **CODING-SCORE-03**: Trainer dashboard `/trainer/[slug]` extended with per-associate coding attempt history panel and skill signal bars
- [ ] **CODING-SCORE-04**: DESIGN.md + PROJECT.md readiness-math section updated to explain coding signal weight contribution vs interview signal

### SQL (SQL-NN) — Phase 42

- [ ] **SQL-01**: Judge0 SQLite language wired; server-side schema + seed data injection per challenge (trainer-authored)
- [ ] **SQL-02**: Result normalization (column order, whitespace, type coercion) with explicit trainer-authored expected-rows format
- [ ] **SQL-03**: Trainer reporting label: `SQL fundamentals (SQLite dialect)` — visible on challenge cards and in trainer dashboard; Postgres SQL deferred to v1.5 (documented in PROJECT.md Out of Scope)

### MSA Deploy (IAC-NN) — Phase 43

- [x] **IAC-01**: Terraform module provisions dedicated Judge0 GCE host (n1-standard-4 or sized per Phase 38 spike); app VM remains separate
- [x] **IAC-02**: GitHub Actions pipeline: build + test on PR; deploy app + Judge0 as separate workflows on tag push; Judge0 patching cadence documented in runbook
- [x] **IAC-03**: Health checks + rollback path automated in deploy workflow; failed health check auto-reverts to previous image
- [x] **IAC-04**: Monitoring: Judge0 queue-depth metric + submission latency p50/p95 pushed to GCE Logs Explorer; alert thresholds documented
- [x] **IAC-05**: Runbook documents Judge0 patching, scale-up procedure, abuse response, and recovery-from-queue-death playbook

### Hardening (HARD-NN) — Phase 44

- [ ] **HARD-01**: Load test at 50 concurrent submissions across all 5 languages; p95 latency ≤ 10 sec; no queue death; no app degradation
- [ ] **HARD-02**: Abuse test: fork bombs, infinite loops, network egress attempts, large output floods — all contained by sandbox (`enable_network=false`, cgroups CPU/mem limits) with no host impact
- [ ] **HARD-03**: STRIDE security review covering Phases 38 + 39 + 43 — zero outstanding findings before merge; `/cso` + codex adversarial-review both pass
- [ ] **HARD-04**: ARCHITECTURE.md updated with coding-challenge stack diagram (Next.js ↔ Judge0 ↔ private repo); README quickstart for local coding feature; trainer-authoring guide

---

## Traceability (Requirement → Phase)

| Requirement | Phase | Status |
|-------------|-------|--------|
| CODING-MODEL-01 | Phase 36 | Active |
| CODING-MODEL-02 | Phase 36 | Active |
| CODING-MODEL-03 | Phase 36 | Active |
| CODING-MODEL-04 | Phase 36 | Active |
| CODING-MODEL-05 | Phase 36 | Active |
| CODING-MODEL-06 | Phase 36 | Active |
| CODING-BANK-01 | Phase 37 | Active |
| CODING-BANK-02 | Phase 37 | Active |
| CODING-BANK-03 | Phase 37 | Active |
| CODING-BANK-04 | Phase 37 | Active |
| CODING-BANK-05 | Phase 37 | Active |
| JUDGE-01 | Phase 38 | Active |
| JUDGE-02 | Phase 38 | Active |
| JUDGE-03 | Phase 38 | Active |
| JUDGE-04 | Phase 38 | Active |
| JUDGE-05 | Phase 38 | Active |
| JUDGE-06 | Phase 38 | Active (gate) |
| CODING-API-01 | Phase 39 | Active |
| CODING-API-02 | Phase 39 | Active |
| CODING-API-03 | Phase 39 | Active |
| CODING-API-04 | Phase 39 | Active |
| CODING-API-05 | Phase 39 | Active |
| CODING-API-06 | Phase 39 | Active |
| CODING-API-07 | Phase 39 | Active |
| CODING-UI-01 | Phase 40 | Active |
| CODING-UI-02 | Phase 40 | Active |
| CODING-UI-03 | Phase 40 | Active |
| CODING-UI-04 | Phase 40 | Active |
| CODING-UI-05 | Phase 40 | Active |
| CODING-SCORE-01 | Phase 41 | Active |
| CODING-SCORE-02 | Phase 41 | Active |
| CODING-SCORE-03 | Phase 41 | Active |
| CODING-SCORE-04 | Phase 41 | Active |
| SQL-01 | Phase 42 | Active |
| SQL-02 | Phase 42 | Active |
| SQL-03 | Phase 42 | Active |
| IAC-01 | Phase 43 | Active |
| IAC-02 | Phase 43 | Active |
| IAC-03 | Phase 43 | Active |
| IAC-04 | Phase 43 | Active |
| IAC-05 | Phase 43 | Active |
| HARD-01 | Phase 44 | Active |
| HARD-02 | Phase 44 | Active |
| HARD-03 | Phase 44 | Active |
| HARD-04 | Phase 44 | Active |

**Coverage:** 44 total requirements mapped across 9 phases (36-44). Zero unmapped.

---

## Open Questions (from DISCOVER, resolved inline during Phase planning)

1. GCE VM current spec — verified in Phase 38 spike before infrastructure commit
2. .NET version (Judge0 C# Mono vs modern .NET 8+) — C# Mono for v1.4; modern .NET runtime deferred to v1.5 seed
3. Trainer authoring workflow — PR-based for v1.4 (in-app editor is v1.5 seed)
4. Cohort assignment — week-aligned via existing CurriculumWeek pattern (CODING-BANK-05 + CODING-API-06 encode this)
5. Backfill of 3 existing per-cohort challenges — decided in Phase 41 planning; default is no backfill (opt-in importer only)

---

## Seeds Planted (v1.5+ — see `.planning/seeds/v1.4-discovery-seeds.md` for full detail)

1. Function-level test harness (per-language drivers, LeetCode-style)
2. Real Postgres SQL runner (hardened service, isolated schemas, role-locked)
3. In-app challenge authoring (markdown editor + test runner UI)
4. .NET 8+ runtime (separate sandbox if Judge0 Mono insufficient)
5. Multi-modal practice platform (design, system design, behavioral simulations)
6. Anti-cheat heuristics (AI-generated submission detection, sample memorization detection)

---

## Out of Scope (v1.4)

| Feature | Reason |
|---------|--------|
| Function-level test harness | Stdin/stdout sufficient for v1.4 pedagogy; adds per-language driver complexity |
| Real Postgres SQL runner | Requires hardened service with isolated schemas; deferred to v1.5 |
| .NET 8+ modern runtime | Judge0 ships C# Mono; modern .NET needs separate sandbox |
| In-app challenge authoring | PR-based authoring ships faster; editor UI is v1.5 |
| Realtime Judge0 WebSocket updates | Polling via `GET /api/coding/attempts/[id]` is sufficient; Supabase Realtime future |
| Anti-cheat / plagiarism detection | Trust-dependent signal; build after client asks |
| Multi-file projects / framework scaffolds | Single-file stdin/stdout only in v1.4 |
| Paid external sandbox (Sphere Engine, etc.) | Cost + vendor lock-in; Judge0 self-host is the floor |

---

*Requirements defined: 2026-04-18*
*Source: PIPELINE-DISCOVER.md (office-hours + codex consult)*
*Next step: `/gsd-plan-phase 36` or `/pipeline-coordinator --resume`*
