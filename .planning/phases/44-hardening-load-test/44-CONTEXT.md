# Phase 44: Hardening + Load Test - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning
**Mode:** `--auto`

<domain>
## Phase Boundary

Prove production readiness: 50-concurrent load test passes p95 ≤ 10 sec without queue death; abuse tests (fork bombs, infinite loops, network egress, large output) contained; STRIDE review of Phases 38+39+43 returns zero outstanding findings; publish architecture diagram + README quickstart + trainer-authoring guide.

**In scope:**
- Load test harness: script that drives 50 concurrent submissions across the 5 languages against the DEPLOYED stack (from Phase 43), records per-submission latency + overall wall clock + queue depth
- Abuse test suite: 6 payload classes (fork bomb, infinite loop, network egress attempt, large stdout flood, memory bomb, file-descriptor bomb) per language where applicable
- STRIDE security review: document + cover Phases 38 + 39 + 43; `/cso` skill produces report; Codex adversarial-review gates merge
- `ARCHITECTURE.md` update: new stack diagram (Next.js ↔ Judge0 ↔ private repo ↔ Supabase)
- `README.md` quickstart section: "Run coding feature locally" walkthrough
- `docs/trainer-authoring.md`: how trainers write new coding challenges (repo schema, markdown template, test-case authoring)

**Out of scope:**
- Anti-cheat heuristics → v1.5 seed
- Multi-region failover → v2.0
- Per-challenge test-case limits → v1.5

</domain>

<decisions>
## Implementation Decisions

### Load Test (locked per HARD-01)
- **D-01:** Harness: `scripts/load-test-coding.ts` using `p-limit` or manual Promise batching — 50 concurrent submissions, submitted against the real deployed stack (NOT local docker compose). Uses a dedicated test-associate Supabase account (trainer-provisioned, removed after test).
- **D-02:** Test-data set: 10 fixed challenges (2 per language except 1 each for SQL + C#) from the real challenge bank. 50 concurrent submissions = 5 attempts per challenge, mixed across users if needed.
- **D-03:** Pass criteria: all 50 return verdicts within wall-clock budget; p95 per-submission latency ≤ 10 sec; Judge0 queue depth never exceeds worker-count × 2 sustained for > 30 sec; app VM CPU stays under 80% at p95; Judge0 VM CPU stays under 85% at p95.
- **D-04:** Output: `.planning/phases/44-hardening-load-test/44-LOAD-TEST-REPORT.md` with measurements, commits the result to the repo.

### Abuse Test (locked per HARD-02)
- **D-05:** Payload classes + expected containment:
  1. **Fork bomb** (`:(){ :|:& };:` bash / `while(1) fork()` C) — `max_processes=60` (Phase 38 D-06) caps it
  2. **Infinite loop** — `max_cpu_time_limit=10` (Phase 38) kills it → verdict `timeout`
  3. **Network egress** — `enable_network=false` (Phase 38) → connection refused
  4. **Large stdout flood** (print 1 GB) — `max_file_size=8192 KB` (Phase 38) truncates → verdict `runtime_error` or `fail`
  5. **Memory bomb** (allocate 8 GB) — `max_memory_limit=256000 KB` (Phase 38) kills → verdict `mle` or `runtime_error`
  6. **File-descriptor bomb** (open 10000 files) — Docker default limits + cgroups contain
- **D-06:** Abuse test harness `scripts/abuse-test.ts` submits each payload class per language where applicable, asserts expected containment verdict, verifies host (`docker stats` on Judge0 VM during run) never sees cgroup escape.

### Security Review (locked per HARD-03)
- **D-07:** Run gstack `/cso` skill scoped to Phases 38 + 39 + 43. Output: `.planning/phases/44-hardening-load-test/44-CSO-REPORT.md`.
- **D-08:** Run `codex adversarial-review` against the same diff scope. Both must return PASS with zero HIGH severity findings before merge.
- **D-09:** STRIDE coverage per component:
  - Judge0 sandbox — Tampering, Elevation
  - Execution API — Spoofing (auth), Tampering (input validation), Info Disclosure (hidden tests), DoS (rate limit)
  - Terraform/CI — Elevation (service account scopes), Tampering (state integrity)

### Docs (locked per HARD-04)
- **D-10:** `ARCHITECTURE.md` update: add v1.4 coding stack diagram section (ASCII or mermaid) showing Next.js app ↔ Judge0 (via internal network) ↔ private repo (server-only) ↔ Supabase (attempts/challenges).
- **D-11:** `README.md` quickstart additions: "### Coding Challenges — Local Dev" with `docker compose up` + Judge0 spin-up steps + how to seed a sample challenge.
- **D-12:** `docs/trainer-authoring.md`: new file. Sections: repo layout, meta.json schema, markdown template, test-case authoring, local validation with `npm run validate-challenge <slug>`, PR workflow.

### CLI Helper
- **D-13:** Add `scripts/validate-challenge.ts` that runs Phase 37's validation pipeline against a local challenge directory (before trainer opens PR). Exposed via `npm run validate-challenge <path>`.

### Claude's Discretion
- Load-test tool choice — built-in Node `p-limit` (zero new deps) vs `autocannon` (HTTP-level, not API-semantics). Recommend p-limit + direct submit calls
- ASCII vs mermaid diagrams — mermaid if repo renders them in GitHub (default yes)
- Abuse-test runner: one file per payload vs single file with switch — single file recommended

### Folded Todos
None.

</decisions>

<canonical_refs>
## Canonical References

### Milestone-level
- `.planning/REQUIREMENTS.md` §HARD-01..04
- `.planning/ROADMAP.md` §Phase 44
- `.planning/phases/38-judge0-infrastructure/38-CONTEXT.md` — sandbox caps (D-04..D-07) that abuse tests verify
- `.planning/phases/43-msa-deployment/43-CONTEXT.md` — deployed stack that load test hits
- `PROJECT.md` — Committed resource sizing (from Phase 38 spike) that load test validates

### External
- Judge0 security advisory (GHSA-q7vg-26pg-v5hr) — already pinned; verify version
- OWASP Top 10 / STRIDE references for review

### Existing code
- `/api/health` — load test baseline probe
- `/api/coding/submit` + `/api/coding/attempts/[id]` — load test targets
- `ARCHITECTURE.md` — extend (or create if not present — check first)
- `README.md` — extend quickstart section

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- gstack `/cso` skill — structured security audit
- Codex plugin `codex review` + `codex adversarial-review` — code review gates
- Existing scripts/ directory for CLI helpers

### Established Patterns
- `docs/` folder for long-form ops + authoring guides
- ARCHITECTURE.md if present — extend, don't replace
- README quickstart pattern — concise, copy-pasteable

### Integration Points
- Load test runs against Phase 43-deployed stack; it is the FINAL gate before merge
- CSO report + codex adversarial pass = merge criteria

### Known Constraints
- Load test requires a deployed stack — must run AFTER Phase 43 completes
- Abuse tests must run in an isolated cohort to avoid polluting real attempt history (or seeded test associate)

</code_context>

<specifics>
## Specific Ideas

- HARD-01: "p95 latency ≤ 10 sec; no queue death; no app degradation" — D-03 exact thresholds
- HARD-02: enumerates the 6 payload classes — D-05 maps
- HARD-03: "zero outstanding findings; `/cso` + codex adversarial-review both pass" — D-07 + D-08
- HARD-04: ARCHITECTURE diagram + README quickstart + trainer-authoring guide — D-10..D-12

</specifics>

<deferred>
## Deferred Ideas

- **Anti-cheat heuristics** — v1.5 seed per discovery
- **Chaos tests (kill Judge0 mid-submission)** — v1.5+
- **Continuous synthetic monitoring** — v1.5 (cron + alerting)
- **Penetration test by external firm** — v1.5+

### Reviewed Todos (not folded)
None.

</deferred>

---

*Phase: 44-hardening-load-test*
*Context gathered: 2026-04-18 (auto)*
