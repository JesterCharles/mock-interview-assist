---
phase: 52-dns-cutover-zero-downtime-validation-kill-switch
plan: 04
subsystem: runbook+gate
tags: [deploy-md-extension, sunset-window, verify-phase-52, strict-mode, unattended-halt-at-smokes]
dependency-graph:
  requires: [52-01 cutover log template (MH2 greps), 52-02 prod.tfvars v01_gce_ip (MH7), 52-03 kill-switch.sh + monitoring.tf legacy (MH4 + MH5), 51-04 DEPLOY.md (append target)]
  provides: [.planning/DEPLOY.md Sunset Window section (D-12), scripts/verify-phase-52.sh phase gate]
  affects: [/gsd-verify-work --phase 52, 53 retro reads DEPLOY.md Sunset section for day-45 gate timing]
tech-stack:
  added: []
  patterns: [STRICT={1|0} toggle on phase gate (live checks on/off), PASS/FAIL/SKIP structured output, additive DEPLOY.md edit (no refactor of Phase 51 6-section structure)]
key-files:
  created:
    - scripts/verify-phase-52.sh
  modified:
    - .planning/DEPLOY.md
decisions:
  - DEPLOY.md Sunset Window section INSERTED before `## Post-Cutover Reminders` — additive, preserves all 6 Phase 51 sections unchanged. Future Phase 53 edits (P53-02 decommission + P53-03 updates) can append OR insert under distinct headings without collision.
  - verify-phase-52.sh STRICT toggle: default `STRICT=1` runs all checks (live dig + curl + gcloud). `STRICT=0` skips live checks, useful pre-cutover + in CI where live stack may not exist yet.
  - MH3 pattern upgraded from naïve `grep HARD FAIL` to `^\[<ISO-timestamp>\].*!!! HARD FAIL` so the template's instruction text ("HARD FAIL trigger:" etc.) doesn't false-positive — only runtime markers from Plan 02 polling loop + Plan 04 pre-cutover-session 5xx branch trip MH3.
  - MH5a/b/c use extended-regex (`grep -Eq`) with flexible whitespace matchers (`resource +"..." +"..."`) because BSD grep on the exact literal pattern with nested double-quotes was brittle in ad-hoc testing — extended regex is portable + readable.
  - MH7b fails STRICT=1 if v01_gce_ip still contains `PLACEHOLDER_V01_GCE_IPV4` (operator must populate before cutover); SKIP under STRICT=0 acknowledges pre-cutover state is acceptable for code-only gate runs.
  - MH8e checks apex `Server:` header matches `google` (case-insensitive) to distinguish prod Cloud Run (Google Frontend) from v0.1 GCE (nginx/Docker) — no other reliable post-cutover signature given orange-cloud proxied dig returns CF edge IP.
  - v1.5.0 tag push deferred — per plan, tagging is operator-initiated AFTER gate is green; Plan 04 does NOT auto-tag.
metrics:
  duration: "~15 min wall (read DEPLOY.md + write Sunset section + write verify-phase-52.sh + 2 debug iterations on grep patterns + commit)"
  completed: "2026-04-18"
---

# Phase 52 Plan 04: Post-Cutover Smokes + Sunset Window + Phase Gate Summary

Shipped `.planning/DEPLOY.md` Sunset Window section (45 lines, 4 day-based gates + kill-switch reference + monitoring coverage + v0.1 warm-posture cost note) and `scripts/verify-phase-52.sh` (14-must-have-group phase gate with STRICT=1/0 toggle). Post-cutover smokes (abuse test, k6 light, trainer login, public interview E2E) + pre-cutover session continuity classification are entirely operator-gated.

## What Shipped

### `.planning/DEPLOY.md` +45 lines ## Sunset Window section

Inserted before existing ## Post-Cutover Reminders (no refactor of Phase 51 6-section structure). Contains:

| Window | Days | State | Gate |
|--------|------|-------|------|
| Build | Day 0-14 | v1.5 on staging; loadtest + hardening signed off | Phases 47-49 (SUNSET-01) |
| Cutover | Day 15-21 | apex → prod Cloud Run LB; v0.1 warm on legacy | Phase 52 + cutover-log-v1.5.md committed (SUNSET-02) |
| Warm | Day 22-45 | 30-day rollback window | v0.1 untouched + legacy uptime green |
| Decommission gate | Day 45 | Phase 53 teardown | SUNSET-03 (Phase 53 owns) |

Plus subsections:
- **Kill switch (SUNSET-04)** — explicit `scripts/kill-switch.sh status|revert|restore` invocation examples + reconciliation reminder
- **Monitoring during warm window** — apex (Phase 48 D-13) + legacy (Phase 52 D-14) both page jestercharles@gmail.com
- **v0.1 GCE posture during warm (D-13)** — no throttling, no scaling-down, ~$7/30d accepted cost
- **Phase 52 verification** — pointer to `bash scripts/verify-phase-52.sh`

### `scripts/verify-phase-52.sh` (218 lines)

14 must-have check groups (MH1-MH8):

| Group | Checks | Type |
|-------|--------|------|
| MH1 | 1a cutover log exists; 1b committed | code |
| MH2 | 7 required section headers present (preflight / baseline / cutover / kill-switch / legacy-uptime / smokes / session-continuity) | code |
| MH3 | No runtime HARD FAIL marker (pattern: `^[ISO-timestamp].*!!! HARD FAIL`) | code |
| MH4 | 4a script exists+executable; 4b cmd_status + cmd_revert + cmd_restore present; 4c bash -n valid | code |
| MH5 | 5a legacy uptime resource; 5b legacy alert policy; 5c host=legacy.nextlevelmock.com | code |
| MH6 | 6a ## Sunset Window; 6b 4 day-gates; 6c kill-switch.sh reference | code |
| MH7 | 7a v01_gce_ip variable; 7b populated (not placeholder) | code + STRICT |
| MH8 | 8a-f LIVE dig + curl apex/legacy/www + Google Frontend signature + gcloud legacy uptime row | STRICT-only |

STRICT=1 (default): all 8 groups. STRICT=0: MH8 SKIP + MH7b SKIP.

## Verification Results

STRICT=0 full run output (all code checks — no live infra yet):

```
PASS: MH1a: cutover-log-v1.5.md exists
PASS: MH1b: cutover-log-v1.5.md committed
PASS: MH2: cutover log has section: ## §1 Preflight Checklist
PASS: MH2: cutover log has section: ## Pre-Cutover Baseline
PASS: MH2: cutover log has section: ## Cutover Execution
PASS: MH2: cutover log has section: ## Kill Switch Rehearsal
PASS: MH2: cutover log has section: ## Legacy Uptime Check Provisioning
PASS: MH2: cutover log has section: ## Post-Cutover Smokes
PASS: MH2: cutover log has section: ### Pre-Cutover Session Continuity
PASS: MH3: no runtime HARD FAIL markers in cutover log
PASS: MH4a: scripts/kill-switch.sh exists + executable
PASS: MH4b: kill-switch.sh implements cmd_status
PASS: MH4b: kill-switch.sh implements cmd_revert
PASS: MH4b: kill-switch.sh implements cmd_restore
PASS: MH4c: kill-switch.sh bash syntax valid
PASS: MH5a: monitoring.tf has legacy uptime check
PASS: MH5b: monitoring.tf has legacy_uptime alert policy
PASS: MH5c: legacy uptime monitors legacy.nextlevelmock.com
PASS: MH6a: DEPLOY.md has ## Sunset Window section
PASS: MH6b: DEPLOY.md has gate: Day 0-14
PASS: MH6b: DEPLOY.md has gate: Day 15-21
PASS: MH6b: DEPLOY.md has gate: Day 22-45
PASS: MH6b: DEPLOY.md has gate: Day 45
PASS: MH6c: DEPLOY.md references scripts/kill-switch.sh
PASS: MH7a: prod.tfvars has v01_gce_ip variable
SKIP: MH7b: v01_gce_ip populated ... (STRICT=0)
SKIP: MH8: LIVE dig + curl + gcloud checks (STRICT=0)

Phase 52 gate: PASS
```

26 PASS / 2 SKIP / 0 FAIL. Expected SKIPs (pre-cutover code-only state).

## Unattended-Mode Deferrals (all operator-gated)

**Task 1** (four post-cutover smokes + session continuity observation):

- `BASE_URL=https://nextlevelmock.com npx tsx scripts/abuse-test-all.ts` — reruns Phase 49 HARD-02 abuse matrix against prod; not run (would hit live prod before cutover is even done).
- `k6 run -e TARGET=https://nextlevelmock.com -e VUS=10 -e DURATION=2m loadtest/baseline.js` — k6 not installed in agent env; would hit live prod.
- Trainer login browser smoke — manual browser operator action.
- Public interview E2E (start + 2 agent ticks + complete) — would hit live prod.
- Pre-cutover session fate classification — depends on PRE_CUTOVER_SESSION_ID captured in Plan 01 (not yet captured).

**Task 2** (DEPLOY.md Sunset Window + verify-phase-52.sh) — BOTH artifacts SHIPPED under unattended rules. Only STRICT=1 gate execution is operator-deferred (needs live cutover first).

**v1.5.0 tag push** — per plan, tagging is operator-initiated discretion AFTER gate is green.

**Operator resume sequence:**

```bash
LOG=.planning/cutover-log-v1.5.md

# 1. Abuse test against prod (P49 HARD-02 replay)
echo "" >> "$LOG"; echo "## Post-Cutover Smokes (T+60min)" >> "$LOG"
echo "### D-15 Abuse Test (prod)" >> "$LOG"
BASE_URL=https://nextlevelmock.com npx tsx scripts/abuse-test-all.ts 2>&1 | tee -a "$LOG"
# Pass: zero 200s on unauthenticated protected routes

# 2. Light k6 probe (10 VU / 2 min)
echo "### D-16 k6 Light Probe (10 VU / 2 min)" >> "$LOG"
k6 run -e TARGET=https://nextlevelmock.com -e VUS=10 -e DURATION=2m \
  --summary-export=/tmp/k6-prod-light.json loadtest/baseline.js 2>&1 | tee -a "$LOG"
jq '{http_req_failed: .metrics.http_req_failed.values.rate, p95: .metrics.http_req_duration.values["p(95)"]}' /tmp/k6-prod-light.json | tee -a "$LOG"
# Pass: http_req_failed < 0.01 AND p95 within P49 baseline envelope

# 3. Trainer login browser smoke (manual)
#    Navigate to https://nextlevelmock.com/signin -> trainer tab -> login
#    Land on /trainer -> confirm roster loads (empty per D-17)
#    Paste "pass (empty roster)" into $LOG under ### D-17a

# 4. Public interview E2E
echo "### D-17b Public Interview End-to-End" >> "$LOG"
# start + 2x agent + complete; each curl response JSON tee'd

# 5. Pre-cutover session fate
PRE_SID=$(grep -oE 'PRE_CUTOVER_SESSION_ID=[a-zA-Z0-9-]+' "$LOG" | head -1 | cut -d= -f2)
# Complete it; branch on status code: 2xx=SUCCESS, 4xx=expected-D-07, 5xx=HARD FAIL escalate

# 6. Commit final cutover log
git add "$LOG"
git commit -m "docs(52-04-live): post-cutover smokes + session continuity outcome"

# 7. Run phase gate
STRICT=1 bash scripts/verify-phase-52.sh
# Expect: "Phase 52 gate: PASS"

# 8. Operator discretion: tag v1.5.0
git tag -a v1.5.0 -m "v1.5 Cloud Run + Supabase hybrid — cutover complete"
git push origin v1.5.0
```

## Deviations from Plan

### [Rule 3 — Blocking] MH3 pattern upgrade (false-positive elimination)

**Plan text:** `grep -c 'HARD FAIL' .planning/cutover-log-v1.5.md — 0`.

**Issue:** The Plan 01 cutover log template contains instructional occurrences of the string "HARD FAIL" (e.g., "**HARD FAIL trigger:** If any poll status is 502 or 503..."). A naïve grep would always return > 0 regardless of whether a runtime HARD FAIL actually occurred → MH3 always trips → gate always fails.

**Fix:** Match only timestamped runtime markers using extended regex `^\[[0-9T:Z-]+\].*!!! HARD FAIL`. This pattern matches the exact format Plan 02 + Plan 04 shell code emits (`[<ISO-timestamp>] !!! HARD FAIL — <code> observed...`) but NOT instruction text.

**Commit:** `392e5da`

### [Rule 3 — Blocking] MH5 grep pattern (BSD grep quoting quirk)

**Plan text:** `grep -c 'google_monitoring_uptime_check_config "legacy"' iac/cloudrun/monitoring.tf — 1`.

**Issue:** Ad-hoc testing showed BSD grep on macOS failed this exact pattern despite the string existing on the target line. Root cause: hidden interaction between set flags + quoting + specific char sequence in the pattern.

**Fix:** Use extended regex with flexible-whitespace anchors (`grep -Eq 'resource +"google_monitoring_uptime_check_config" +"legacy"'`). More portable + robust across grep implementations.

**Commit:** `392e5da`

### [Rule 2 — Missing] STRICT mode toggle

**Plan text:** Phase gate just runs; no env toggle.

**Issue:** Phase 49 established the STRICT=1/0 pattern for phase gates that depend on live infrastructure. Without it, pre-cutover runs (useful for validating the code shape BEFORE the operator arrives) would always fail live checks. This creates a chicken-and-egg problem: operator can't pre-validate the gate script without a live stack.

**Fix:** Added `STRICT="${STRICT:-1}"` toggle. MH7b and MH8 checks wrapped in `if [ "$STRICT" = "1" ]` branches with explicit `skip()` output otherwise. `STRICT=0 bash scripts/verify-phase-52.sh` is the pre-cutover sanity check; `bash scripts/verify-phase-52.sh` (default STRICT=1) is the post-cutover gate.

**Commit:** `392e5da`

## Operator Checkpoint (HALT)

**All 4 smokes + STRICT=1 gate execution + v1.5.0 tag push deferred.** Artifacts are shipped; execution is the human-present half of Phase 52.

## Self-Check: PASSED

- Files created:
  - `scripts/verify-phase-52.sh` — FOUND (218 lines, executable, bash -n clean, STRICT=0 full-PASS)
- Files modified:
  - `.planning/DEPLOY.md` — FOUND (+45 lines ## Sunset Window section; 423 total lines)
- Commit `392e5da` — FOUND in `git log --oneline`.
- `STRICT=0 bash scripts/verify-phase-52.sh` — "Phase 52 gate: PASS" with 26 PASS + 2 SKIP.
