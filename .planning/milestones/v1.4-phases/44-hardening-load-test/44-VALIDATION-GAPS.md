# Phase 44 — Validation Gaps

**Audited:** 2026-04-18
**Phase status:** PARTIAL — harnesses + docs + STRIDE draft shipped; live-run tasks deferred behind deployed-stack prerequisite.

## Gaps Filled (Automated)

| # | Requirement | Test | Command |
|---|-------------|------|---------|
| 1 | HARD-04 / D-13 — `validate-challenge` CLI behavior | `scripts/__tests__/validateChallengeCli.test.ts` | `npx vitest run scripts/__tests__/validateChallengeCli.test.ts` |
| 2 | HARD-01 / D-02 — load-test fixture shape + language distribution | `scripts/__tests__/hardeningFixtures.test.ts` | `npx vitest run scripts/__tests__/hardeningFixtures.test.ts` |
| 3 | HARD-02 / D-05 — abuse-test payload-class coverage + expectedContainment allowlist | `scripts/__tests__/hardeningFixtures.test.ts` | `npx vitest run scripts/__tests__/hardeningFixtures.test.ts` |

**Result:** 14 new tests, all passing under `npm run test`.

## Deployment-Gated Gaps (Escalated — cannot be closed locally)

These gaps require the Phase 43 deployed stack + trainer-provisioned test cohort; they are intentionally deferred per the plans' `checkpoint:human-verify gate="blocking"` tasks.

| Req | Gap | Blocking prereq | Resume signal |
|-----|-----|-----------------|---------------|
| HARD-01 | `44-LOAD-TEST-REPORT.md` with measured p50/p95/max per language + PASS verdict (Plan 44-01 Task 3) | Phase 43 deployed stack healthy; test associate + 10 test-cohort challenges seeded in prod Supabase; `LOAD_TEST_BASE_URL` + creds exported | Operator runs `npm run load-test-coding` → exit 0, commits report |
| HARD-02 | `44-ABUSE-TEST-REPORT.md` with per-payload containment evidence + docker-stats cgroup-escape check (Plan 44-01 Task 3) | Same as above + `JUDGE0_VM_SSH_KEY_PATH` reachable for docker-stats sampler | Operator runs `npm run abuse-test-coding` → exit 0, commits report |
| HARD-03 | `44-CSO-REPORT.md` via gstack `/cso` scoped to Phases 38+39+43 (Plan 44-02 Task 1) | Human operator drives `/cso` skill interactively; current `SECURITY-AUDIT.md` is draft baseline only | `VERDICT: PASS` + `grep -c 'SEVERITY: HIGH'` returns 0 |
| HARD-03 | `44-CODEX-ADVERSARIAL-REPORT.md` via `codex adversarial-review` (Plan 44-02 Task 2) | Human operator invokes codex plugin against same base..head SHA range as Task 1 | `VERDICT: PASS` + 0 HIGH |

## Why these stay deferred

- **Load + abuse harnesses target the deployed stack, not local Docker** (per D-01 / HARD-01 explicit wording). Running them from the dev machine against a local Judge0 would not exercise the production Terraform-provisioned VM sizing that D-03 thresholds describe.
- **`/cso` and `codex adversarial-review` are interactive tools**, not CLI-invocable from the executor (Plan 44-02 Task 1/2 deviation, already documented in 44-02-SUMMARY.md).
- **Test associate provisioning + post-run password rotation** are operator-only steps per Plan 44-01 `user_setup` (no automation path for Supabase auth admin actions in this phase).

## Handoff

Operator path is documented in `LOAD-TEST-CHECKPOINT.md`. Once the four gated reports land with PASS verdicts, Phase 44 can merge.
