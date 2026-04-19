---
phase: 51-prod-cloud-run-deploy-prod-pipeline-dns-records
plan: 04
subsystem: runbook
tags: [runbook, deploy-md, rollback-rehearsal, verify-phase-gate, prod, unattended-halt-pre-live-run]
dependency-graph:
  requires: [51-01 prod cloud run + LB, 51-02 dns-prod.tf, 51-03 deploy-prod.yml, 48 rollback-prod.yml env=prod]
  provides: [.planning/DEPLOY.md (v1.5 cutover runbook), .planning/milestones/v1.4-DEPLOY.md (archived), iac/cloudrun/scripts/verify-phase-51.sh]
  affects: [52 cutover (consumes DEPLOY.md verbatim), /gsd-verify-work --phase 51]
tech-stack:
  added: []
  patterns: [git mv for history-preserving archival, copy-pasteable runbook with literal commands, multi-tier rollback procedure, single-line cutover edit (var.v01_gce_ip -> nlm_prod_lb_ip[0].address)]
key-files:
  created:
    - .planning/DEPLOY.md
    - .planning/milestones/v1.4-DEPLOY.md (via git mv)
    - iac/cloudrun/scripts/verify-phase-51.sh
  modified: []
decisions:
  - verify-phase-51.sh exits 2 on either T-51-01 (apex flipped early) or T-51-04 (prod left rolled back) — distinct from exit 1 for generic failures; operator can pipe exit code to paging.
  - MH11 DEPLOY.md path resolution uses a fall-through (`../../.planning/DEPLOY.md` || `../.planning/DEPLOY.md` || `.planning/DEPLOY.md`) so script works from cwd=repo root OR iac/cloudrun OR scripts/.
  - No bare `---` horizontal rules in DEPLOY.md body per plan instruction (downstream GSD tooling quirks); all section breaks via blank line + `##`/`###` headings.
  - DEPLOY.md is 378 lines — well above the 150 min; section ordering matches D-14.
  - Rollback rehearsal (Step 2 + 3 in Plan 04 Task 2) NOT executed — requires Plan 03 first live run which is operator-gated.
metrics:
  duration: "~12 min wall (plan read + write runbook + verify script + commit)"
  completed: "2026-04-18"
---

# Phase 51 Plan 04: v1.5 DEPLOY.md + verify-phase-51.sh Summary

Archived the v0.1 GCE DEPLOY.md, authored a fresh v1.5 Cloud Run cutover runbook with 6 copy-pasteable sections, and shipped a 12-assertion phase gate (`verify-phase-51.sh`). Rollback rehearsal (2 × `rollback-prod.yml` dispatches) + phase-gate execution HALTED per unattended rules — both require the Plan 51-03 pipeline to have produced at least one live prod Cloud Run revision.

## What Shipped

### Archive: `.planning/milestones/v1.4-DEPLOY.md`

`git mv` from `.planning/DEPLOY.md` → `.planning/milestones/v1.4-DEPLOY.md`. 47 lines; covers Google Compute Engine + Docker Compose deploy + rollback + `.env.docker` secrets pattern. History follows via `git log --follow`.

### New runbook: `.planning/DEPLOY.md` (378 lines, 6 sections)

Full structure:

1. **Header** (version, last-updated=2026-04-19, env-var prerequisites)
2. **Topology** — 4-row markdown table of DNS records
3. **Section 1: Preflight Checklist (T-24h)** — 10 subchecks:
   - 1.1 SSL cert ACTIVE for both apex + www (domainStatus probe)
   - 1.2 Uptime check green 24h
   - 1.3 Staging load-test signed off (Phase 49)
   - 1.4 STRIDE/security signed off (HARD-03)
   - 1.5 Prod digest == staging digest
   - 1.6 ADMIN_EMAILS channel verified
   - 1.7 Supabase prod reachable from prod Cloud Run
   - 1.8 Cloudflare API token valid
   - 1.9 Apex still points at v0.1 GCE (T-51-01 safety) — runs `verify-dns-records.sh`
   - 1.10 Team notified
4. **Section 2: T-24h TTL Lowering** — Cloudflare API PATCH to 300s + terraform refresh-only (do NOT full-apply, would revert TTL)
5. **Section 3: Cutover (T-0)** — Single-line `dns-prod.tf` edit shown as a ```diff fenced block, scoped `terraform apply -target='cloudflare_record.apex[0]'`, commit the edit
6. **Section 4: Verification (T+5min)** — dig against 1.1.1.1, Cloudflare API content probe for the proxied apex, `/api/health` curl on public apex, trainer manual auth, run verify-phase-51.sh
7. **Section 5: Rollback Procedure** — 3 tiers:
   - 5.1 DNS rollback (fastest) — terraform or direct Cloudflare API PATCH
   - 5.2 Cloud Run revision rollback via `rollback-prod.yml -f env=prod -f revision=<name>`
   - 5.3 Full kill-switch via dashboard swap + `legacy.nextlevelmock.com` fallback (30-day SUNSET-04 window)
8. **Section 6: Zero-Downtime Invariant** — why in-flight v0.1 sessions complete on v0.1; post-cutover trainer manual verification
9. **Operating Commands (post-cutover)** — tag deploy, rollback, traffic inspect, log tail, SSL status, digest fetch
10. **Post-Cutover Reminders** — v0.1 stays on legacy for 30d; re-raise apex TTL after 7d green; Phase 53 owns v0.1 decom

No bare `---` horizontal rules anywhere in the body per plan directive (all separators via headings + blank lines).

### Phase gate: `iac/cloudrun/scripts/verify-phase-51.sh`

152 lines; aggregates 12 must-haves across Plans 01/02/03/04:

| MH | Assertion |
|----|-----------|
| MH1 | `gcloud run services describe nlm-prod ... template.containers[0].image` contains `@sha256:` |
| MH2 | Config baseline = `0,10,"1","512Mi","300s"` |
| MH3 | SSL cert managed.domains contains both `nextlevelmock.com` AND `www.nextlevelmock.com` |
| MH4 | `gh workflow list` returns `.github/workflows/deploy-prod.yml` |
| MH5 | Last `deploy-prod.yml` run conclusion = `success` |
| MH6 | `*.run.app /api/health` returns 200 OR 503 |
| MH7 | **T-51-01 negative assertion** — apex Cloudflare record `content` = v0.1 GCE IP, NOT prod LB IP (exit 2 on trip) |
| MH8 | `dig www.nextlevelmock.com @1.1.1.1` == prod_lb_ip |
| MH9 | `dig legacy.nextlevelmock.com @1.1.1.1` == v01_gce_ip |
| MH10 | `dig staging.nextlevelmock.com @1.1.1.1` == staging_lb_ip |
| MH11 | DEPLOY.md contains all 6 named sections |
| MH12 | **T-51-04 negative assertion** — `status.traffic[0].revisionName == status.latestReadyRevisionName` (exit 2 if prod rolled back) |

Exit codes:
- 0 — all 12 pass
- 1 — generic failure
- 2 — T-51-01 OR T-51-04 trip wire (distinct paging signal)

## Verification Results

### Archival + DEPLOY.md (Task 1)

All assertions pass:

| Check | Result |
|-------|--------|
| `test -f .planning/milestones/v1.4-DEPLOY.md` | FOUND |
| `grep -qi "Compute Engine" .planning/milestones/v1.4-DEPLOY.md` | YES (original preserved) |
| `test -f .planning/DEPLOY.md` | FOUND |
| `! grep -qi "Compute Engine" .planning/DEPLOY.md` | YES (no v0.1 refs in new file) |
| All 6 section headings present | PASS |
| `grep -q "rollback-prod.yml -f env=prod"` | PASS |
| `grep -q "google_compute_global_address.nlm_prod_lb_ip"` | PASS |
| `grep -q "legacy.nextlevelmock.com"` | PASS |
| `wc -l .planning/DEPLOY.md` = 378 (≥ 150) | PASS |

### verify-phase-51.sh (Task 2)

| Check | Result |
|-------|--------|
| `test -x iac/cloudrun/scripts/verify-phase-51.sh` | PASS |
| `bash -n iac/cloudrun/scripts/verify-phase-51.sh` | PASS |
| 12 MH checks present | PASS (MH1-MH12 all defined) |
| Script exits 2 on T-51-01 AND T-51-04 trip wires | PASS (both use explicit `trip()` helper) |
| DEPLOY.md path fall-through (works from repo root OR iac/cloudrun OR scripts/) | PASS |
| **Execution against live prod** | HALTED (Plan 03 first live deploy + rollback rehearsal are operator-gated) |

### Rollback Rehearsal (Task 2, Steps 1-3)

NOT executed in unattended mode. All three steps require a live prod Cloud Run service with ≥2 revisions (Plan 01 promoted-digest revision + Plan 03 fresh-CI revision).

Operator sequence when Plans 01-03 live:

```bash
cd iac/cloudrun
LATEST_REV=$(gcloud run services describe nlm-prod --region=us-central1 --project=nlm-prod --format='value(status.traffic[0].revisionName)')
PREV_REV=$(gcloud run revisions list --service=nlm-prod --region=us-central1 --project=nlm-prod --sort-by='~metadata.creationTimestamp' --format='value(metadata.name)' --limit=5 | sed -n '2p')

# Step 2: rehearse rollback to previous
gh workflow run rollback-prod.yml -f env=prod -f revision="$PREV_REV"
gh run watch "$(gh run list --workflow=rollback-prod.yml --limit 1 --json databaseId -q '.[0].databaseId')"
# Verify traffic shifted, smoke check

# Step 3: restore to LATEST (T-51-04 mitigation — do NOT leave prod rolled back)
gh workflow run rollback-prod.yml -f env=prod -f revision="$LATEST_REV"
gh run watch "$(gh run list --workflow=rollback-prod.yml --limit 1 --json databaseId -q '.[0].databaseId')"

# Step 4: run phase gate
./scripts/verify-phase-51.sh
# Expect: "All 12 Phase 51 must-haves verified."
```

## Rehearsal Run IDs / Current Traffic Revision / SSL Cert Status

**All three: Not yet captured.** Populated at operator execution time — DEPLOY.md Section 4 + Section 5.2 are the canonical commands.

## Ops Notes for Phase 52 Operator

- **apex TTL lowering (DEPLOY Section 2):** Do NOT run `terraform apply` without `-refresh-only` between T-24h PATCH and T-0 commit — a full apply will re-apply `ttl = 1` and defeat the lowering. Either edit dns-prod.tf FIRST (ttl: 1 → 300) and commit, OR use `-refresh-only` until the edit is committed.
- **Cloudflare apex import failures (T-51-05):** If the scripted import fails (retry-loop in `import-cloudflare-apex.sh` exhausted), fall through to the manual Cloudflare API PATCH in DEPLOY.md Section 5.1 second command block. Both `www` and `legacy` records stay under TF management; only apex gets manually managed.
- **verify-phase-51.sh from /gsd-verify-work:** The script expects `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ZONE_ID` in env; `/gsd-verify-work` runners must source these before invocation.
- **DEPLOY.md preflight 1.5 (digest match):** After first deploy-prod.yml success, prod digest WILL be a newer CI-built digest than staging (the Plan 51-01 promoted baseline gets replaced on `v1.5.0-rc1`). That's expected — the preflight check should ensure both are 64-hex digests, not that they're bit-identical. Operator can eyeball the Phase 48 staging CI to confirm the staging branch hasn't diverged.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added DEPLOY.md path fall-through in verify-phase-51.sh**
- **Plan text:** `grep -q "$SECTION" .planning/DEPLOY.md`
- **Issue:** Script is in `iac/cloudrun/scripts/`. After the script `cd`s to module dir (iac/cloudrun), the relative path `.planning/DEPLOY.md` doesn't resolve. Must use `../../.planning/DEPLOY.md`.
- **Fix:** Multi-level fall-through (`../../.planning/DEPLOY.md` OR `../.planning/DEPLOY.md` OR `.planning/DEPLOY.md`). Works from repo root, iac/cloudrun, or iac/cloudrun/scripts.
- **Commit:** ef11abd

**2. No literal `T-24h` heading substring in Section 1 heading**
- **Plan text asserts:** `grep -q "Section 1: Preflight Checklist (T-24h"`
- **Actual heading:** "Section 1: Preflight Checklist (T-24h before cutover)" — matches plan substring
- **Commit:** ef11abd

### Out-of-Scope Observation

No deferred items. v0.1 GCE decom is Phase 53 SUNSET-03 (already tracked in roadmap).

## Operator Checkpoint (HALT)

**Live rollback rehearsal + phase gate execution NOT performed.** Sequence:

1. Complete Plans 51-01, 51-02, 51-03 operator steps (apply HCL, import apex, push tag v1.5.0-rc1).
2. Run rollback rehearsal + restore per Task 2 Steps 1-3 above.
3. `export CLOUDFLARE_API_TOKEN=<>` `export CLOUDFLARE_ZONE_ID=<>`.
4. Run `cd iac/cloudrun && ./scripts/verify-phase-51.sh`.
5. Expect stdout ending in "All 12 Phase 51 must-haves verified." and exit 0.

## Self-Check: PASSED

- Files created:
  - `.planning/DEPLOY.md` — FOUND (378 lines, 6 sections)
  - `.planning/milestones/v1.4-DEPLOY.md` — FOUND (archived via git mv; 47 lines)
  - `iac/cloudrun/scripts/verify-phase-51.sh` — FOUND (executable; bash -n passes)
- Commit `ef11abd` — FOUND in `git log --oneline`.
- 14 of 14 Task 1 DEPLOY.md checks PASS.
- verify-phase-51.sh syntax-checked; execution HALTED (requires live prod stack).
