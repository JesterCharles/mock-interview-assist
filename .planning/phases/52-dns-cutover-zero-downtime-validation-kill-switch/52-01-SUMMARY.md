---
phase: 52-dns-cutover-zero-downtime-validation-kill-switch
plan: 01
subsystem: runbook
tags: [cutover-log, preflight-template, pre-cutover-baseline, unattended-halt-all-live-ops]
dependency-graph:
  requires: [51-04 DEPLOY.md (preflight §1 source), 51-02 dns-prod.tf + verify-dns-records.sh, 48 monitoring.tf (uptime config to probe)]
  provides: [.planning/cutover-log-v1.5.md (narrative log template)]
  affects: [52-02 appends ## Cutover Execution, 52-03 appends ## Kill Switch Rehearsal + ## Legacy Uptime, 52-04 appends ## Post-Cutover Smokes, 53 retro reads final log]
tech-stack:
  added: []
  patterns: [ISO-8601 timestamp prefix on every appended line, narrative-with-timestamped-log-lines per D-08, placeholder-literal template with per-section expected output]
key-files:
  created:
    - .planning/cutover-log-v1.5.md
  modified: []
decisions:
  - Cutover log is a TEMPLATE with placeholder markers rather than a pre-filled document — live values (dig output, session IDs, curl headers) are operator-filled during the actual cutover event. Unattended mode cannot populate these because Phase 52 is the only human-present phase of v1.5 (all plans autonomous:false per phase frontmatter).
  - Log sections pre-structured to match the order Plan 02/03/04 will append — MH2 of verify-phase-52.sh greps for 7 required headers so the template must include them upfront (empty placeholder bodies are fine pre-cutover).
  - Three-state pre-cutover-session outcome (2xx/4xx/5xx → SUCCESS/expected-per-D-07/HARD-FAIL-escalate) encoded in Pre-Cutover Session Continuity template block — operator pastes status code + body + OUTCOME classification.
  - Preflight §1 subchecks were expanded from plan-text 9 items to 11 items (added §1.10 TTL and §1.11 Team notified) to exactly match DEPLOY.md Section 1 shape from Phase 51 D-14.
metrics:
  duration: "~6 min wall (read plans + write 425-line template + commit)"
  completed: "2026-04-18"
---

# Phase 52 Plan 01: Pre-Cutover Baseline Summary

Seeded `.planning/cutover-log-v1.5.md` as a 425-line narrative log template. Every live command (preflight walk-through, pre-cutover session start, T-0 notification email, baseline dig/curl) is a placeholder — operator populates during the actual cutover event. No DNS mutations, no API calls, no terraform applies performed (Phase 52 is the only human-present phase of v1.5).

## What Shipped

### `.planning/cutover-log-v1.5.md` (425 lines)

Structured as:

1. **Header** — operator, T-0 timestamp placeholder, pre-/post-cutover apex values, unattended-mode note
2. **## §1 Preflight Checklist (T-24h to T-5min)** — 11 subchecks mirroring DEPLOY.md Section 1:
   - 1.1 SSL cert ACTIVE for apex + www
   - 1.2 Uptime check green 24h
   - 1.3 Staging load-test signed off (Phase 49)
   - 1.4 SECURITY-v1.5.md codex adversarial-review sign-off
   - 1.5 Prod digest == staging digest
   - 1.6 ADMIN_EMAILS reachability (last 7 days)
   - 1.7 Supabase prod reachable from prod Cloud Run
   - 1.8 Cloudflare API token valid
   - 1.9 Apex still points at v0.1 GCE (T-51-01 safety) — runs `verify-dns-records.sh`
   - 1.10 TTL lowered to 300s
   - 1.11 Team notified
3. **## Pre-Cutover Baseline (T-0)** — 4 subblocks:
   - Pre-cutover session start (D-04, curl `/api/public/interview/start`)
   - T-0 notification email (Resend via `/api/send-email`, T-52-04 non-blocking)
   - Baseline dig for all 4 records
   - Cloudflare API content cross-check (since apex is proxied, dig returns CF edge IP)
   - Baseline curl for all 3 health endpoints
4. **## Cutover Execution (T-0 to T+5min)** — Plan 02 placeholder with:
   - terraform plan dry-run
   - terraform apply block
   - commit block
   - 10-poll loop scaffolding (Poll 0-9 at 30s intervals)
   - T+5min verification
   - Cutover outcome tag
5. **## Kill Switch Rehearsal (T+30min)** — Plan 03 placeholder with:
   - Pre-rehearsal snapshot
   - REVERT + 60s wait + verify
   - RESTORE + 60s wait + verify (T-52-05 end-state invariant)
   - Terraform state reconciliation
6. **## Legacy Uptime Check Provisioning** — Plan 03 placeholder
7. **## Post-Cutover Smokes (T+60min)** — Plan 04 placeholder with 4 smokes + session continuity
8. **## Sunset Window Tracker** — 4-row status table pointing at DEPLOY.md
9. **Final outcome checklist** — phase close state

### `scripts/verify-phase-52.sh` MH2 contract

Every required section header from the template has a corresponding grep in `verify-phase-52.sh` MH2. The template MUST include these headers upfront (empty bodies OK pre-cutover) so the phase-gate greps remain structurally valid — only body content gets populated at cutover time.

## Verification Results

| Check | Result |
|-------|--------|
| `test -f .planning/cutover-log-v1.5.md` | PASS (425 lines) |
| `wc -l` ≥ 30 | PASS |
| `git log --oneline -1 .planning/cutover-log-v1.5.md` | PASS (commit `2a0742d`) |
| All 7 MH2 section headers present | PASS (verify-phase-52.sh STRICT=0 full run) |
| Pre-cutover session ID placeholder present | PASS (`PRE_CUTOVER_SESSION_ID=` grep match) |
| ISO-8601 timestamp marker `[<timestamp>]` present | PASS |
| T-0 email template present | PASS |
| 4-record dig baseline present | PASS (apex, www, staging, legacy) |

## Unattended-Mode Deferrals (all operator-gated)

Task 1 (preflight walk-through) and Task 2 (live session start + T-0 email + baseline dig/curl + commit) are the entire scope of Plan 01's LIVE work. Both are checkpoint:human-verify tasks per frontmatter (`autonomous: false`). Under `--unattended`:

- No gcloud commands run.
- No curl against live production.
- No Cloudflare API calls.
- No Resend email sent.
- No sessions started on v0.1.
- No terraform operations.

Operator resume sequence when present:

1. Export `V01_GCE_IP`, `PROD_CLOUDRUN_LB_IP`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ZONE_ID` per `user_setup` block in plan frontmatter.
2. Walk DEPLOY.md Section 1 line-by-line, pasting each command's stdout into the `## §1 Preflight Checklist` placeholder in `cutover-log-v1.5.md`.
3. If any preflight check fails, mark **PREFLIGHT FAIL** and STOP — Phase 52 does not proceed.
4. Start the pre-cutover public-interview session via curl POST — record `sessionId` into `PRE_CUTOVER_SESSION_ID=` line (Plan 04 reads it back).
5. Send T-0 email via Resend endpoint — log response or `EMAIL FAILED` (T-52-04 non-blocking per threat register).
6. Run 4 dig commands + CF API content cross-check + 3 curl health checks — paste raw output under `## Pre-Cutover Baseline`.
7. Commit: `git add .planning/cutover-log-v1.5.md && git commit -m "docs(52-01-live): preflight + baseline captured"`.
8. Resume with "baseline committed" — Wave 2 (Plan 02 cutover) runs.

## Deviations from Plan

### [Rule 3 — Blocking] Template ships as stand-alone file, not per-task appends

**Plan text:** Task 1 appends preflight to an existing/new file; Task 2 appends baseline, then commits.
**Reality under `--unattended`:** Both tasks are human-verify checkpoints. Both their `<what-built>` blocks write to the same file. Unattended mode cannot run either task's live commands. Committing an empty file + hoping operator appends to sections creates drift risk (section-header names might diverge between template + verify script).
**Fix:** Write the template with all 7 section headers + placeholder bodies in ONE commit, structured so operator appends content UNDER each header rather than creating new sections. verify-phase-52.sh MH2 greps for header presence — template is compliant from day 1.
**Commit:** `2a0742d`

### No literal auth-gate escalation

No auth errors encountered — this phase is pure file writes under `--unattended`. All live auth gates (CF token, gcloud ADC, Resend) are operator-gate-only per phase mode.

## Operator Checkpoint (HALT)

**All live work deferred.** Zero live GCP/Cloudflare/Resend mutations. 425-line template ready to populate at cutover execution.

## Self-Check: PASSED

- Files created:
  - `.planning/cutover-log-v1.5.md` — FOUND (425 lines, all 7 MH2 sections present)
- Commit `2a0742d` — FOUND in `git log --oneline`.
- `STRICT=0 bash scripts/verify-phase-52.sh` — exit 0 with all Plan 01 checks PASS.
