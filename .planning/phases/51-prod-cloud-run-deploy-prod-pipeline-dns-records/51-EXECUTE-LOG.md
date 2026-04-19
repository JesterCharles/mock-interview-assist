# Phase 51 Execute Log — Prod Cloud Run + Deploy-Prod Pipeline + DNS Records

**Mode:** `--unattended` (chain=true, auto_advance=true)
**Started:** 2026-04-18 ~18:50 PT
**Completed:** 2026-04-18 ~19:10 PT
**Wall time:** ~20 min
**Branch:** `chore/v1.5-archive-v1.4`
**Executor model:** Claude Opus 4.7 (1M context)

## Summary

All 4 plans executed end-to-end under unattended rules. Every task shipped HCL / workflow YAML / scripts / docs to disk with atomic commits. **No live GCP mutations, no live Cloudflare mutations, no live gh workflow runs.** All apply / import / tag-push / rehearsal / phase-gate-execution steps are explicitly halted per unattended checkpoint rules — they require operator credentials and carry destructive risk against the v0.1 GCE stack still serving users.

## Plan Execution Matrix

| Plan | Name | Commits | Status | Halted At |
|------|------|---------|--------|-----------|
| 51-01 | Prod Cloud Run + LB + SSL + digest scripts | `2bdb15e` | Code-complete | `terraform apply` against prod.tfvars |
| 51-02 | dns-prod.tf + Cloudflare apex import script + verify-dns-records | `658236d` | Code-complete | `terraform import` + `terraform apply` for 3 DNS records |
| 51-03 | deploy-prod.yml tag-triggered CI | `03eba3a` | Code-complete | First `v1.5.0-rc1` tag push + live pipeline run |
| 51-04 | v1.5 DEPLOY.md + verify-phase-51.sh | `ef11abd` | Code-complete | Rollback rehearsal + phase-gate execution |

## Artifacts Shipped

### HCL (iac/cloudrun/)

- `cloudrun-prod.tf` (79 lines, count-gated) — prod Cloud Run service + public invoker IAM
- `loadbalancer-prod.tf` (108 lines, 7 resources) — global IP + NEG + backend + URL map + SSL cert (apex+www) + HTTPS proxy + forwarding rule
- `dns-prod.tf` (53 lines, 3 cloudflare_record) — apex/www/legacy
- `outputs.tf` (modified) — `prod_cloudrun_url`, `prod_lb_ip`, `prod_ssl_cert_name`, `staging_lb_ip`
- `variables.tf` (modified) — `v01_gce_ip` variable (default="")
- `prod.tfvars` (modified) — `initial_image_digest`, `cf_zone_id`, `v01_gce_ip` PLACEHOLDERS
- All formatted (`terraform fmt`) and validated (`terraform validate`) green.

### CI (.github/workflows/)

- `deploy-prod.yml` (176 lines) — tag-only trigger (`v*`), WIF auth via `PROD_PROJECT_NUMBER`, concurrency serialization, prisma migrate deploy against prod `DIRECT_URL`, deploy by digest, `*.run.app` smoke check, failure email

### Scripts (iac/cloudrun/scripts/)

- `fetch-latest-staging-digest.sh` — gh CLI → last success → sha256 hex
- `promote-staging-digest-to-prod.sh` — gcloud artifacts docker tags add (cross-registry, bit-identical)
- `import-cloudflare-apex.sh` — Cloudflare API → record id → terraform import
- `verify-dns-records.sh` — 4-record assertion with T-51-01 negative assertion (exit 2)
- `verify-phase-51.sh` — 12-assertion phase gate (MH1-MH12; exit 2 on T-51-01 or T-51-04 trip)

### Runbook

- `.planning/DEPLOY.md` (378 lines, 6 D-14 sections)
- `.planning/milestones/v1.4-DEPLOY.md` (archived via `git mv`, history preserved)

### Summaries + Log

- `51-01-SUMMARY.md`, `51-02-SUMMARY.md`, `51-03-SUMMARY.md`, `51-04-SUMMARY.md`
- `51-EXECUTE-LOG.md` (this file)

## terraform plan — final state

With all 4 plans committed:

```
Plan: 20 to add, 0 to change, 0 to destroy.

Changes to Outputs:
  + prod_cloudrun_url    = (known after apply)
  + prod_lb_ip           = (known after apply)
  + prod_ssl_cert_name   = "nlm-prod-ssl-cert"
```

20 resources = 9 Plan 51 HCL + 3 Plan 51 DNS (apex, www, legacy) + 8 pre-existing Phase 47 + 48 items (WIF pool, IAM bindings, monitoring) not yet live because Phase 46/47/48 operator checkpoints remain.

The pre-existing **ADMIN_EMAILS data-source 404 error** (monitoring.tf line 29) surfaces during plan but is OUT OF PHASE 51 SCOPE — it's a Phase 46 deferred item (secret value not yet populated in nlm-prod Secret Manager). Logged to `deferred-items.md`.

## File Overlap Check (P49 parallel agent)

Confirmed no collisions:

- P49 touched `loadtest/**` (untracked), `scripts/abuse-test-all.ts`, `scripts/lib/route-discovery.ts`, `.github/workflows/load-test.yml`, `.planning/SECURITY-v1.5*.md`, `.planning/phases/49-*/**`
- P51 touched `iac/cloudrun/**` (prod files only), `.github/workflows/deploy-prod.yml`, `.planning/DEPLOY.md`, `.planning/milestones/v1.4-DEPLOY.md`, `.planning/phases/51-*/**`
- Zero overlap.

## Commits on chore/v1.5-archive-v1.4

```
ef11abd docs(51-04): v1.5 DEPLOY.md cutover runbook + verify-phase-51.sh phase gate
03eba3a feat(51-03): deploy-prod.yml workflow (tag-triggered, WIF auth, prod Cloud Run)
658236d feat(51-02): prod DNS records (apex/www/legacy) + Cloudflare apex import script + verify-dns-records
2bdb15e feat(51-01): prod Cloud Run + LB + SSL cert HCL + digest-promote scripts
```

(Plus a 5th commit below for STATE/ROADMAP/summaries metadata.)

## Operator Follow-up (for Phase 52 readiness)

To take Phase 51 from "code-complete" to "live":

1. **Phase 46 operator** — populate ADMIN_EMAILS + 12 other secrets in `nlm-prod` Secret Manager (`gcloud secrets versions add` × 13). Documented in `docs/runbooks/phase-46-supabase-wipe.md`.
2. **Phase 47 operator** — apply staging Cloud Run + WIF + first AR image. Documented in `iac/cloudrun/README.md`.
3. **Phase 48 operator** — branch protection + first deploy-staging run + monitoring apply + email verification.
4. **Phase 51 operator** — 4 halt points:
   - 51-01: Fill `prod.tfvars` placeholders → `./scripts/promote-staging-digest-to-prod.sh` → `terraform apply -target=...` (9 targets per Plan 01 SUMMARY)
   - 51-02: Export `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ZONE_ID` → `./scripts/import-cloudflare-apex.sh` → `terraform apply -target='cloudflare_record.{apex,www,legacy}[0]'`
   - 51-03: Merge branch to main → `git tag -a v1.5.0-rc1 -m "Phase 51 prod smoke rc1" && git push origin v1.5.0-rc1` → watch run for success
   - 51-04: Run rollback rehearsal (2 × `gh workflow run rollback-prod.yml`) + `./scripts/verify-phase-51.sh`
5. **Phase 52 ready:** when `verify-phase-51.sh` exits 0, phase-gate is green. Single-line edit of `dns-prod.tf` (DEPLOY.md Section 3.1) flips the apex.

## Phase Gate Status

`verify-phase-51.sh` syntax-checked (`bash -n`); NOT executed. Expected exit 0 once operator has completed all 4 halt points above.

## Deviations Aggregate (Rule 1-3 Auto-fixes)

All deviations documented in per-plan SUMMARY.md files. Aggregate:

- **Rule 3 (blocking)** × 4:
  - P01: Used on-disk `count`+`var.project_id` pattern (not plan-text `var.prod_project_id`) — matches actual staging HCL shape.
  - P02: Used count-indexed import address `'cloudflare_record.apex[0]'` — required for count=1 resource.
  - P03: Added `workflow_dispatch: {}` to triggers — rerun path without force-pushing tag.
  - P04: DEPLOY.md path fall-through in verify-phase-51.sh — resolve from multiple cwd.

- **Rule 2 (missing critical)** × 1:
  - P01: Added `staging_lb_ip` output — Plan 02 verify script needed it.

- **Rule 4 (architectural)** × 0 — no architectural changes required.

No auth gates encountered (all ops were file writes + local commits).
