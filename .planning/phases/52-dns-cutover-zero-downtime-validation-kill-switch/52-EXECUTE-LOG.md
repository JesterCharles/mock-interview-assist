# Phase 52 Execute Log — DNS Cutover + Zero-Downtime Validation + Kill Switch

**Mode:** `--unattended` (chain=true, auto_advance=true)
**Started:** 2026-04-19 ~00:14 UTC
**Completed:** 2026-04-19 ~00:45 UTC
**Wall time:** ~30 min
**Branch:** `chore/v1.5-archive-v1.4`
**Executor model:** Claude Opus 4.7 (1M context)

## Summary

Phase 52 shipped the full cutover scaffolding — cutover log narrative template, kill-switch script, legacy uptime monitoring, DEPLOY.md Sunset Window section, and STRICT=1/0 phase-gate aggregator — under unattended rules. **All 4 plans are `autonomous: false` per phase frontmatter** because Phase 52 is the ONLY human-present phase of v1.5: apex DNS flip, kill-switch rehearsal, legacy uptime provisioning via terraform apply, post-cutover abuse/k6/trainer/public-interview smokes, and pre-cutover session continuity observation all require a human operator with live Cloudflare + GCP + browser access.

Zero live mutations performed: no Cloudflare DNS changes, no terraform applies, no gcloud calls, no gh workflow runs, no curl against production, no Resend email sends, no k6 runs, no abuse-test-all executions, no git tag pushes. Every artifact is static code/doc/HCL ready for operator activation.

## Plan Execution Matrix

| Plan | Name | Commits | Status | Halted At |
|------|------|---------|--------|-----------|
| 52-01 | Pre-cutover baseline (cutover log template) | `2a0742d` | Code-complete | Live preflight walk-through + pre-cutover session start + T-0 email + baseline dig/curl |
| 52-02 | Cutover execution (apex flip) | `322482c` | Code-complete | `terraform apply -target='cloudflare_record.apex[0]'` — the apex DNS flip |
| 52-03 | Kill switch + legacy uptime | `1f63756`, `80033c0` | Code-complete | T+30min kill-switch rehearsal + `terraform apply` of legacy uptime resources |
| 52-04 | Post-cutover smokes + sunset window + phase gate | `392e5da` | Code-complete | 4 smokes + pre-cutover session classification + STRICT=1 phase gate + v1.5.0 tag |

## Artifacts Shipped

### Cutover narrative log (`.planning/cutover-log-v1.5.md`)

425-line template with 7 pre-structured sections + placeholder bodies:
- ## §1 Preflight Checklist (11 subchecks mirroring DEPLOY.md Section 1)
- ## Pre-Cutover Baseline (T-0) — session start + T-0 email + 4-record dig + CF API cross-check + curl
- ## Cutover Execution (T-0 to T+5min) — terraform plan/apply + 10-poll loop + T+5min verification
- ## Kill Switch Rehearsal (T+30min) — pre-snapshot + revert + verify + restore + verify + TF refresh
- ## Legacy Uptime Check Provisioning — terraform plan/apply + gcloud list verification
- ## Post-Cutover Smokes (T+60min) — D-15 abuse + D-16 k6 + D-17a trainer login + D-17b E2E interview
- ### Pre-Cutover Session Continuity (D-06/D-07) — 2xx/4xx/5xx classification with OUTCOME disposition

Plus ## Sunset Window Tracker (4-row status table) and final outcome checklist.

### Scripts

- `scripts/kill-switch.sh` (125 lines, executable) — SUNSET-04 Cloudflare-API-direct DNS rollback:
  - `status` — print apex A record JSON
  - `revert` — flip apex A to V01_GCE_IP (via PATCH preserving proxied=true)
  - `restore` — flip apex A to PROD_CLOUDRUN_LB_IP (same shape)
  - Env guards inside subcommands (not top-level) so `-h`/no-args prints usage cleanly
  - Record lookup filters by name (zone has 4 A records)
- `scripts/verify-phase-52.sh` (218 lines, executable) — Phase 52 phase gate:
  - 14 must-have check groups (MH1-MH8)
  - STRICT=1 default: all checks including live dig + curl + gcloud
  - STRICT=0: skip live checks (MH7b + MH8) for code-only pre-cutover validation
  - PASS/FAIL/SKIP structured output; exit 0 only on all PASS

### IaC

- `iac/cloudrun/monitoring.tf` (+78 lines) — Phase 52 D-14 additions:
  - `google_monitoring_uptime_check_config.legacy` — probes https://legacy.nextlevelmock.com/api/health every 60s
  - `google_monitoring_alert_policy.legacy_uptime` — 2 consecutive 60s failures → email
  - Both `count = var.env == "prod" ? 1 : 0` (staging apply unaffected)
  - Both bound to existing `google_monitoring_notification_channel.email`
  - Accept 2xx OR 503 (matches apex tolerance per Phase 48 D-24)
- `iac/cloudrun/prod.tfvars` (+9 lines comment) — annotate v01_gce_ip with pointer to DEPLOY.md Section 3.1 canonical cutover path

### Runbook

- `.planning/DEPLOY.md` (+45 lines `## Sunset Window`) — Phase 52 D-12:
  - 4 day-based gates (Day 0-14 Build / Day 15-21 Cutover / Day 22-45 Warm / Day 45 Decommission)
  - Kill switch (SUNSET-04) with explicit invocation examples
  - Monitoring during warm window (apex + legacy both → jestercharles@gmail.com)
  - v0.1 GCE posture during warm (no throttling, ~$7/30d accepted cost)
  - Phase 52 verification pointer (`bash scripts/verify-phase-52.sh`)
  - INSERTED before ## Post-Cutover Reminders — additive, no refactor of Phase 51 6-section structure

### Summaries + Log

- `52-01-SUMMARY.md`, `52-02-SUMMARY.md`, `52-03-SUMMARY.md`, `52-04-SUMMARY.md`
- `52-EXECUTE-LOG.md` (this file)

## terraform validate — final state

```
$ terraform -chdir=iac/cloudrun validate
Success! The configuration is valid.
```

Phase 52 code adds 2 prod-only resources (legacy uptime + legacy alert policy) behind `count = var.env == "prod" ? 1 : 0`. Staging plan unaffected.

## verify-phase-52.sh — STRICT=0 full run

```
Phase 52 gate: PASS
```

26 PASS / 2 SKIP / 0 FAIL. Skips (expected pre-cutover):
- MH7b: v01_gce_ip populated (placeholder present — pre-cutover state)
- MH8: LIVE dig + curl + gcloud checks

STRICT=1 full run is the post-cutover gate; expected to pass once operator completes the live sequence.

## Coordination with Other Phases

- **Upstream (Phase 51 artifacts preserved):** `.planning/DEPLOY.md` extended additively. Phase 51's 6 sections (Preflight, T-24h, Cutover, Verification, Rollback, Zero-Downtime) untouched. Phase 52's new section (Sunset Window) inserted before Post-Cutover Reminders. `dns-prod.tf` NOT modified in Phase 52 (that's the operator's single-line cutover edit per DEPLOY.md Section 3.1). `iac/cloudrun/prod.tfvars` v01_gce_ip placeholder preserved; only added a comment pointing at DEPLOY.md.

- **Downstream (P53 coordination):** Per user instructions, `.planning/DEPLOY.md` is also touched by P53-02 (v0.1 decommission section) and P53-03 updates. Our Phase 52 Sunset Window section is self-contained under ## Sunset Window heading — P53 can safely append new sections (or edit within distinct headings) without conflict. The ## Post-Cutover Reminders section at file end is shared surface; P53 should append to it rather than rewrite. `iac/cloudrun/monitoring.tf` legacy uptime + alert are count-gated so P53 SUNSET-03 removes them cleanly.

## File Overlap Check

No parallel agent concurrent with Phase 52. Commits are serial on chore/v1.5-archive-v1.4.

Files touched:
- `.planning/cutover-log-v1.5.md` (new)
- `.planning/DEPLOY.md` (append only, between Section 6 and Post-Cutover Reminders — actually inserted just before Post-Cutover Reminders)
- `.planning/phases/52-*/{52-01..04}-SUMMARY.md`, `52-EXECUTE-LOG.md` (new)
- `iac/cloudrun/prod.tfvars` (comment insert)
- `iac/cloudrun/monitoring.tf` (append only)
- `scripts/kill-switch.sh` (new)
- `scripts/verify-phase-52.sh` (new)

## Commits on chore/v1.5-archive-v1.4

```
392e5da docs(52-04): DEPLOY.md Sunset Window + verify-phase-52.sh phase gate
80033c0 feat(52-03): add legacy.nextlevelmock.com uptime check + alert (D-14)
1f63756 feat(52-03): add scripts/kill-switch.sh — fast DNS cutover/rollback via Cloudflare API
322482c chore(52-02): document apex cutover gate in prod.tfvars comment
2a0742d docs(52-01): seed cutover-log-v1.5.md template (preflight + baseline scaffolding)
```

(Plus a 6th metadata commit below for SUMMARY.md files + STATE.md + ROADMAP.md rollup.)

## Operator Follow-up (for v1.5 cutover readiness)

To take Phase 52 from "code-complete" to "live":

**Prerequisites:** Phases 46-51 operator steps complete. `bash scripts/verify-phase-49.sh` + `bash iac/cloudrun/scripts/verify-phase-51.sh` both exit 0. `.planning/loadtest-baseline-v1.5.md` + `.planning/SECURITY-v1.5.md` both show sign-off. Apex TTL lowered to 300s (DEPLOY.md Section 2, T-24h prior).

**Execution sequence:**

1. **T-0 preparation (Plan 01 live work):**
   - Walk DEPLOY.md Section 1 line-by-line, pasting each command's stdout into the `## §1 Preflight Checklist` section of `cutover-log-v1.5.md`.
   - Start pre-cutover session via curl; record sessionId in `PRE_CUTOVER_SESSION_ID=` line.
   - Send T-0 email via Resend (or log `EMAIL FAILED` per T-52-04 non-blocking).
   - Capture 4-record dig baseline + CF API content cross-check + 3 curl health checks.
   - Commit: `git add .planning/cutover-log-v1.5.md && git commit -m "docs(52-01-live): preflight + baseline captured"`.

2. **T-0 cutover (Plan 02 live work):**
   - Edit `iac/cloudrun/dns-prod.tf` line 26: `value = var.v01_gce_ip` → `value = google_compute_global_address.nlm_prod_lb_ip[0].address`.
   - `cd iac/cloudrun && terraform plan -var-file=prod.tfvars -target='cloudflare_record.apex[0]' -out=cutover.tfplan`.
   - Confirm plan shows EXACTLY 1 resource change; `terraform apply cutover.tfplan`.
   - Commit dns-prod.tf edit; paste terraform output into `## Cutover Execution`.
   - Run 10-poll loop every 30s for 5 min — any 502/503 triggers HARD FAIL + immediate Plan 03 kill-switch revert.
   - T+5min verification block.

3. **T+30min kill-switch rehearsal (Plan 03 Task 1 live work):**
   - Export CLOUDFLARE_API_TOKEN + CLOUDFLARE_ZONE_ID + V01_GCE_IP + PROD_CLOUDRUN_LB_IP.
   - `bash scripts/kill-switch.sh status` → `revert` → sleep 60 + verify → `restore` → sleep 60 + verify.
   - `terraform -chdir=iac/cloudrun refresh -var-file=prod.tfvars` to reconcile state.
   - End state MUST be apex → PROD_CLOUDRUN_LB_IP (T-52-05).

4. **T+30-45min legacy uptime provisioning (Plan 03 Task 2 live work):**
   - `cd iac/cloudrun && terraform plan -var-file=prod.tfvars -target=google_monitoring_uptime_check_config.legacy -target=google_monitoring_alert_policy.legacy_uptime -out=legacy-uptime.tfplan`.
   - Expect 2 to add, 0 to change, 0 to destroy. Apply.
   - `gcloud monitoring uptime list --project=nlm-prod` — confirm legacy.nextlevelmock.com row.

5. **T+60min post-cutover smokes (Plan 04 Task 1 live work):**
   - D-15 abuse test: `BASE_URL=https://nextlevelmock.com npx tsx scripts/abuse-test-all.ts`.
   - D-16 k6 light: `k6 run -e TARGET=https://nextlevelmock.com -e VUS=10 -e DURATION=2m loadtest/baseline.js`.
   - D-17a trainer login via browser → /signin → /trainer → roster loads (empty expected).
   - D-17b public interview E2E: start + 2 agent ticks + complete via curl.
   - Pre-cutover session fate: complete via curl + classify 2xx/4xx/5xx → OUTCOME.

6. **Phase close:**
   - Commit final cutover log.
   - `STRICT=1 bash scripts/verify-phase-52.sh` → "Phase 52 gate: PASS".
   - Operator discretion: `git tag -a v1.5.0 -m "v1.5 Cloud Run + Supabase hybrid — cutover complete"` + `git push origin v1.5.0`.

## Deviations Aggregate (Rule 1-3 Auto-fixes)

All deviations documented in per-plan SUMMARY.md files. Aggregate:

- **Rule 3 (blocking)** × 5:
  - P02: Canonical cutover path is HCL edit, not tfvars swap — annotate prod.tfvars instead of adding apex_target_ip (align with Phase 51 DEPLOY.md Section 3.1 + on-disk dns-prod.tf).
  - P03: Env-guards inside subcommands (not top-level) so no-args + `-h` print usage cleanly in kill-switch.sh.
  - P03: Align monitoring.tf legacy resources to `project = var.project_id` + `count = var.env == "prod" ? 1 : 0` (match Phase 48 pattern, not plan-text hardcoded "nlm-prod").
  - P04: MH3 pattern upgrade `^\[timestamp\].*!!! HARD FAIL` to avoid false-positive on template instruction text.
  - P04: MH5 extended-regex grep for robustness against BSD grep quirks with nested double-quote patterns.

- **Rule 2 (missing critical)** × 2:
  - P03: Accept 503 on legacy uptime check (matches apex tolerance per Phase 48 D-24; prevents alert fatigue during transient v0.1 Prisma hiccups).
  - P04: STRICT=1/0 toggle on verify-phase-52.sh — enables pre-cutover code-only sanity check + post-cutover live gate. Establishes consistency with Phase 49 STRICT pattern.

- **Rule 4 (architectural)** × 0 — no architectural changes required.

No auth gates encountered (all operations were file writes + local commits + bash syntax checks + terraform fmt/validate).

## Phase Gate Status

`scripts/verify-phase-52.sh`:
- STRICT=0: EXECUTED — "Phase 52 gate: PASS" (26 PASS / 2 expected-SKIP / 0 FAIL)
- STRICT=1: NOT executed (requires live cutover + live GCP infra). Expected exit 0 post-cutover.
