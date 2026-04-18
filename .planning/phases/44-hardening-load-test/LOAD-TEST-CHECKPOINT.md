# Phase 44 Deployment-Gated Checkpoint

**Status:** HALTED GRACEFULLY — remaining tasks require the Phase 43-deployed
stack (live GCE app VM + Judge0 VM + Supabase prod project). This executor
shipped all code + docs that can be authored without live infrastructure;
this file is the human checklist to complete Phase 44.

## What Shipped Autonomously

| Plan | Task | Artifact | Status |
|------|------|----------|--------|
| 44-01 | T1 | `scripts/load-test-coding.ts` + 10 fixtures + npm script | SHIPPED |
| 44-01 | T2 | `scripts/abuse-test-coding.ts` + 6 payload fixtures | SHIPPED |
| 44-02 | T1/T2 | Manual draft `SECURITY-AUDIT.md` covering Phases 38+39+43 | SHIPPED (upgrade path below) |
| 44-03 | T1 | `scripts/validate-challenge.ts` + npm script | SHIPPED |
| 44-03 | T2 | `ARCHITECTURE.md` + README coding-challenges quickstart | SHIPPED |
| 44-03 | T3 | `docs/trainer-authoring.md` | SHIPPED |

## What Is Deferred

### 44-01 Task 3 — Run both harnesses against deployed stack

Prerequisites:

1. Phase 43 deploy completed successfully and `curl $LOAD_TEST_BASE_URL/api/health | jq .checks.judge0` returns `"ok"`.
2. Trainer provisions a dedicated test associate:
   - Supabase auth user (email + password). Password rotated after test.
   - Assigned to a test cohort with the 10 fixture challenges seeded. Slugs
     to seed (from `scripts/load-test-fixtures/*.json`):
     - `test-load-two-sum-py`, `test-load-fizzbuzz-py`
     - `test-load-two-sum-js`, `test-load-fizzbuzz-js`
     - `test-load-two-sum-ts`, `test-load-fizzbuzz-ts`
     - `test-load-two-sum-java`, `test-load-fizzbuzz-java`
     - `test-load-top-users-sql`, `test-load-two-sum-cs`
3. 6 abuse-test challenge slugs seeded on the same cohort (each accepts any
   submission — the payload is the test, not the solution):
   - `test-abuse-fork-bomb`, `test-abuse-infinite-loop`, `test-abuse-network-egress`,
     `test-abuse-stdout-flood`, `test-abuse-memory-bomb`, `test-abuse-fd-bomb`
4. Trainer announces maintenance window (load test is destructive to queue
   state; no real associate traffic should be in flight).
5. SSH key for Judge0 VM available locally (`JUDGE0_VM_SSH_KEY_PATH`) with
   the target host (`JUDGE0_VM_SSH_TARGET=user@host`) for the docker-stats
   sampler.

Environment:

```bash
export LOAD_TEST_BASE_URL=https://<deployed-app-url>
export LOAD_TEST_ASSOCIATE_EMAIL=<test-associate-email>
export LOAD_TEST_ASSOCIATE_PASSWORD=<rotated-password>
export NEXT_PUBLIC_SUPABASE_URL=<prod-supabase-url>
export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<prod-publishable-key>
export JUDGE0_VM_SSH_KEY_PATH=~/.ssh/judge0-vm
export JUDGE0_VM_SSH_TARGET=<gcp-user>@<judge0-vm-external-ip>
# Optional — wire to your gcloud/metrics query:
# export JUDGE0_METRICS_CMD="gcloud logging read jsonPayload.queueDepth>0 --limit=1 --freshness=5s --format=json | jq -s 'map({queueDepth: .jsonPayload.queueDepth})[0]'"
```

Run:

```bash
npm run load-test-coding
# -> writes .planning/phases/44-hardening-load-test/44-LOAD-TEST-REPORT.md
# -> exit 0 = PASS (all D-03 thresholds met); exit 1 = FAIL (threshold breach)

npm run abuse-test-coding
# -> writes .planning/phases/44-hardening-load-test/44-ABUSE-TEST-REPORT.md
# -> exit 0 = SAFE (all payload classes contained + no cgroup escape)
```

PASS criteria (44-01 Task 3 verify block):

- `44-LOAD-TEST-REPORT.md` contains `PASS` line + per-language p95 ≤ 10 000 ms
- `44-ABUSE-TEST-REPORT.md` contains `SAFE` verdict + docker stats clean

Teardown:

1. Rotate `LOAD_TEST_ASSOCIATE_PASSWORD` in Supabase (prevent reuse).
2. Optionally remove the test cohort if it was created solely for this run.
3. Commit both reports:

```bash
git add .planning/phases/44-hardening-load-test/44-LOAD-TEST-REPORT.md \
        .planning/phases/44-hardening-load-test/44-ABUSE-TEST-REPORT.md
git commit -m "test(44-01): attach load test + abuse test reports (HARD-01/02)"
```

### 44-02 Task 1 — gstack /cso

Run:

```bash
# Compute base SHA (first Phase 38 commit) -- for reference only; /cso can
# accept a scope note rather than a raw diff range.
git log --oneline --grep='Phase 3[89]\|Phase 43' | tail -1

# Invoke the skill; direct output to the Plan 44-02 report path.
# Actual invocation depends on how /cso is exposed in your shell.
```

Save output to `.planning/phases/44-hardening-load-test/44-CSO-REPORT.md`.

Verify (Plan 44-02 Task 1 verify block):

```bash
test -f .planning/phases/44-hardening-load-test/44-CSO-REPORT.md
grep -q "STRIDE" .planning/phases/44-hardening-load-test/44-CSO-REPORT.md
grep -q "VERDICT: PASS" .planning/phases/44-hardening-load-test/44-CSO-REPORT.md
[ "$(grep -c 'SEVERITY: HIGH' .planning/phases/44-hardening-load-test/44-CSO-REPORT.md)" = "0" ]
```

Reference baseline: `SECURITY-AUDIT.md` in this folder (executor's manual
draft — use as a checklist; /cso should cover every row).

### 44-02 Task 2 — codex adversarial-review

Use the same SHA range as Task 1. Run:

```bash
codex adversarial-review <base-sha>..<head-sha> \
  > .planning/phases/44-hardening-load-test/44-CODEX-ADVERSARIAL-REPORT.md
```

Verify:

```bash
grep -q "VERDICT: PASS" .planning/phases/44-hardening-load-test/44-CODEX-ADVERSARIAL-REPORT.md
[ "$(grep -c 'SEVERITY: HIGH' .planning/phases/44-hardening-load-test/44-CODEX-ADVERSARIAL-REPORT.md)" = "0" ]
```

If either HIGH finding appears, fix in a follow-up PR against Phases 38/39/43,
re-run, commit new report. Do NOT merge Phase 44 with HIGH findings.

## Full Human Checklist

- [ ] Phase 43 deploy green; health probe returns `judge0: ok`
- [ ] Test associate provisioned in Supabase
- [ ] Test cohort has all 10 load-test + 6 abuse-test challenge slugs seeded
- [ ] Maintenance window announced
- [ ] Env vars exported (see above)
- [ ] `npm run load-test-coding` returns 0; `44-LOAD-TEST-REPORT.md` PASS
- [ ] `npm run abuse-test-coding` returns 0; `44-ABUSE-TEST-REPORT.md` SAFE
- [ ] Test associate password rotated; teardown complete
- [ ] `gstack /cso` → `44-CSO-REPORT.md` PASS, 0 HIGH
- [ ] `codex adversarial-review` → `44-CODEX-ADVERSARIAL-REPORT.md` PASS, 0 HIGH
- [ ] Commit all 4 reports (`44-LOAD-TEST-REPORT.md`,
      `44-ABUSE-TEST-REPORT.md`, `44-CSO-REPORT.md`,
      `44-CODEX-ADVERSARIAL-REPORT.md`)
- [ ] Run `/gsd-verify-work 44` to confirm all HARD-01..04 requirements
      close.
- [ ] Tag v1.4 milestone once Phase 44 verifier passes.

## Authoring Receipts (This Executor Run)

Commits added by the autonomous run:

- `222906b` — test(44-01): load test + abuse test harnesses + fixtures
- `422f1ca` — feat(44-03): validate-challenge CLI
- `004a991` — docs(44-03): ARCHITECTURE.md + README coding-challenges quickstart
- `a100b46` — docs(44-03): trainer-authoring.md

Test count: baseline 925 → 949 passing locally (delta includes in-flight
Phase 42 SQL work already on-disk; no Phase 44 test regressions).
