---
phase: 52-dns-cutover-zero-downtime-validation-kill-switch
plan: 03
subsystem: iac+scripts
tags: [kill-switch, cloudflare-api-direct, legacy-uptime, sunset-04, unattended-halt-at-rehearsal]
dependency-graph:
  requires: [52-02 cutover executed + apex on prod, 48 monitoring.tf (email notification channel), 51 prod.tfvars v01_gce_ip variable]
  provides: [scripts/kill-switch.sh (SUNSET-04 kill switch), iac/cloudrun/monitoring.tf legacy uptime + alert (D-14)]
  affects: [52-04 verify-phase-52.sh MH4 + MH5 greps + MH8f live check, DEPLOY.md Sunset Window references kill-switch.sh, 53 SUNSET-03 removes legacy uptime block]
tech-stack:
  added: []
  patterns: [pure-shell wrapper over Cloudflare API PATCH (no terraform round-trip), env-guard inside subcommands (not top-level) so --help prints cleanly on missing envs, count-gated prod-only resources (`count = var.env == "prod" ? 1 : 0`)]
key-files:
  created:
    - scripts/kill-switch.sh
  modified:
    - iac/cloudrun/monitoring.tf
decisions:
  - kill-switch.sh is pure bash + curl + jq (no terraform, no go, no python) — portable to any operator shell with zero install burden beyond jq (already a NLM dependency).
  - Env guards live INSIDE subcommands (cmd_status, cmd_revert, cmd_restore) not at top-level — so `bash kill-switch.sh` with no args (or -h/--help) prints usage cleanly without tripping missing-env errors. Verified by script self-test.
  - `require_cf_auth` defers CLOUDFLARE_API_TOKEN + CLOUDFLARE_ZONE_ID binding until needed; `cmd_revert` additionally requires V01_GCE_IP; `cmd_restore` additionally requires PROD_CLOUDRUN_LB_IP. Each subcommand fails loud on its own missing env before touching the API.
  - Preserves `proxied: true` (orange-cloud ON) on every PATCH — matches Phase 51 dns-prod.tf D-01 baseline so the cutover doesn't inadvertently change proxy state.
  - Apex record ID lookup filters by `name=nextlevelmock.com` because the zone has 4 A records (apex + www + staging + legacy); without the filter the script could mutate the wrong record.
  - Legacy uptime check + alert are both count-gated on env="prod" (matches Phase 48 monitoring.tf pattern) so `staging.tfvars` applies are unaffected. Phase 53 SUNSET-03 removes these 2 resources as part of v0.1 decommission.
  - Alert policy filter uses `google_monitoring_uptime_check_config.legacy[0].uptime_check_id` (count-indexed) per Phase 51 D-11 import convention.
  - Legacy uptime accepts 2xx OR 503 (identical tolerance to apex uptime per Phase 48 D-24) — transient Prisma/DB-pool hiccups on v0.1 must not page during the 30-day warm.
metrics:
  duration: "~12 min wall (read plans + write kill-switch.sh + extend monitoring.tf + syntax/fmt/validate + 2 commits)"
  completed: "2026-04-18"
---

# Phase 52 Plan 03: Kill Switch + Legacy Uptime Summary

Shipped two artifacts under unattended rules: (1) `scripts/kill-switch.sh` — Cloudflare-API-direct DNS rollback tool (SUNSET-04) with status/revert/restore subcommands; (2) `iac/cloudrun/monitoring.tf` extended with `legacy.nextlevelmock.com` uptime check + alert policy (D-14, SUNSET-02 warm-window coverage). Rehearsal (T+30min revert + restore cycle) and `terraform apply` of the new monitoring resources are operator-gated.

## What Shipped

### `scripts/kill-switch.sh` (125 lines, executable)

Three subcommands:

| Sub | Action | Env required | API call |
|-----|--------|-------------|----------|
| `status` | Print apex A record JSON | CLOUDFLARE_API_TOKEN, CLOUDFLARE_ZONE_ID | GET `/zones/{z}/dns_records?type=A&name=nextlevelmock.com` |
| `revert` | Flip apex A to V01_GCE_IP | + V01_GCE_IP | PATCH `/zones/{z}/dns_records/{id}` |
| `restore` | Flip apex A to PROD_CLOUDRUN_LB_IP | + PROD_CLOUDRUN_LB_IP | PATCH `/zones/{z}/dns_records/{id}` |

Structural features:
- `set -euo pipefail` + `bash -n` syntax-check clean
- No-args / -h / --help / unknown-sub all print usage to stderr + exit 2
- `require_cf_auth()` + `require_jq()` helpers deferred to subcommand bodies
- Apex record lookup filters by `name=nextlevelmock.com` (zone has 4 A records)
- `proxied: true` preserved on every PATCH (matches Phase 51 D-01)
- Does NOT touch terraform state — script emits reminder to run `terraform -chdir=iac/cloudrun refresh -var-file=prod.tfvars` after any mutation

### `iac/cloudrun/monitoring.tf` extension (+78 lines)

Two new prod-only resources appended after existing `google_monitoring_alert_policy.uptime`:

```hcl
resource "google_monitoring_uptime_check_config" "legacy" {
  count        = var.env == "prod" ? 1 : 0
  project      = var.project_id
  display_name = "nlm-prod-legacy-uptime"
  timeout      = "10s"
  period       = "60s"

  http_check {
    path           = "/api/health"
    port           = 443
    use_ssl        = true
    validate_ssl   = true
    request_method = "GET"
    accepted_response_status_codes {
      status_class = "STATUS_CLASS_2XX"
    }
    accepted_response_status_codes {
      status_value = 503
    }
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = "legacy.nextlevelmock.com"
    }
  }
}

resource "google_monitoring_alert_policy" "legacy_uptime" {
  count                 = var.env == "prod" ? 1 : 0
  project               = var.project_id
  display_name          = "NLM Uptime — legacy v0.1 (SUNSET-02 warm window)"
  combiner              = "OR"
  notification_channels = [google_monitoring_notification_channel.email.name]
  # ... threshold + aggregations identical to apex pattern ...
}
```

Bound to the same `google_monitoring_notification_channel.email` as apex + staging uptime — same operator mailbox (jestercharles@gmail.com via ADMIN_EMAILS Secret Manager secret).

## Verification Results

| Check | Result |
|-------|--------|
| `test -x scripts/kill-switch.sh` | PASS |
| `bash -n scripts/kill-switch.sh` (syntax) | PASS |
| `bash scripts/kill-switch.sh` (no args) → usage + exit 2 | PASS |
| `bash scripts/kill-switch.sh -h` → usage + exit 2 | PASS |
| `bash scripts/kill-switch.sh bogus` → usage + exit 2 | PASS |
| `grep '^cmd_status()'` | PASS |
| `grep '^cmd_revert()'` | PASS |
| `grep '^cmd_restore()'` | PASS |
| `grep 'google_monitoring_uptime_check_config .legacy.'` (via extended regex) | PASS |
| `grep 'google_monitoring_alert_policy .legacy_uptime.'` (via extended regex) | PASS |
| `grep 'host.*= .legacy.nextlevelmock.com.'` | PASS |
| `terraform fmt` monitoring.tf | PASS (no changes) |
| `terraform validate` iac/cloudrun/ | PASS (Success! The configuration is valid.) |
| `STRICT=0 bash scripts/verify-phase-52.sh` MH4a-c + MH5a-c | PASS |

## Unattended-Mode Deferrals (all operator-gated)

**Task 1 rehearsal** (T+30min revert + restore cycle):

- `bash scripts/kill-switch.sh status` — not run (no CF creds in agent env).
- `bash scripts/kill-switch.sh revert` — the actual DNS mutation; absolute operator gate.
- `dig @1.1.1.1 +short nextlevelmock.com A` verification after revert — no live DNS to poll.
- `bash scripts/kill-switch.sh restore` — T-52-05 mitigation; operator MUST run this to leave prod as end state.
- `terraform -chdir=iac/cloudrun refresh -var-file=prod.tfvars` — state reconciliation deferred.

**Task 2 terraform apply** (legacy uptime resources):

- `terraform plan -target=google_monitoring_uptime_check_config.legacy -target=google_monitoring_alert_policy.legacy_uptime -out=legacy-uptime.tfplan` — not run.
- `terraform apply legacy-uptime.tfplan` — not run; creates 2 live GCP Monitoring resources billed under nlm-prod.
- `gcloud monitoring uptime list --project=nlm-prod` — no resources to list yet.

**Operator resume sequence** (from the cutover-green state at T+30min post-apex-flip):

```bash
# 1. Kill-switch rehearsal — export envs first
export CLOUDFLARE_API_TOKEN=<zone-scoped DNS:Edit>
export CLOUDFLARE_ZONE_ID=<zone id>
export V01_GCE_IP=<from prod.tfvars v01_gce_ip>
export PROD_CLOUDRUN_LB_IP=$(gcloud compute addresses describe nlm-prod-lb-ip --global --project=nlm-prod --format='value(address)')

LOG=.planning/cutover-log-v1.5.md
echo "" >> "$LOG"; echo "## Kill Switch Rehearsal (T+30min)" >> "$LOG"

# 2. Pre-snapshot
echo "[$(date -u +%FT%TZ)] $ bash scripts/kill-switch.sh status" >> "$LOG"
bash scripts/kill-switch.sh status >> "$LOG"

# 3. REVERT to v0.1
echo "[$(date -u +%FT%TZ)] $ bash scripts/kill-switch.sh revert" >> "$LOG"
bash scripts/kill-switch.sh revert >> "$LOG"
sleep 60
dig @1.1.1.1 +short nextlevelmock.com A >> "$LOG"
curl -sI https://nextlevelmock.com/api/health | head -5 >> "$LOG"

# 4. RESTORE to prod (T-52-05 — leave prod as end state)
echo "[$(date -u +%FT%TZ)] $ bash scripts/kill-switch.sh restore" >> "$LOG"
bash scripts/kill-switch.sh restore >> "$LOG"
sleep 60
dig @1.1.1.1 +short nextlevelmock.com A >> "$LOG"
curl -sI https://nextlevelmock.com/api/health | head -5 >> "$LOG"

# 5. Reconcile terraform state
terraform -chdir=iac/cloudrun refresh -var-file=prod.tfvars

# 6. Legacy uptime provision
cd iac/cloudrun
terraform plan -var-file=prod.tfvars \
  -target=google_monitoring_uptime_check_config.legacy \
  -target=google_monitoring_alert_policy.legacy_uptime \
  -out=legacy-uptime.tfplan
terraform apply legacy-uptime.tfplan
gcloud monitoring uptime list --project=nlm-prod

# 7. Resume signals
#    "kill-switch rehearsed"  →  Plan 03 Task 1 complete
#    "legacy uptime live"     →  Plan 03 Task 2 complete
```

## Deviations from Plan

### [Rule 3 — Blocking] Env-guard placement (script ergonomics)

**Plan text:** `:` expansions at top-level of the script (`: "${CLOUDFLARE_API_TOKEN:?missing}"` etc.).

**Issue:** Plan 03's must-have explicitly checks `bash scripts/kill-switch.sh 2>&1 | grep -q 'usage:'` — script must print usage cleanly with NO args. Top-level `:` expansions trip a missing-env error BEFORE the case-esac reaches the usage path.

**Fix:** Moved env guards into `require_cf_auth()` (called by subcommands) and per-subcommand blocks (`cmd_revert` requires V01_GCE_IP; `cmd_restore` requires PROD_CLOUDRUN_LB_IP). Top-level remains env-free so usage printing works unconditionally.

**Commit:** `1f63756`

### [Rule 3 — Blocking] Align with on-disk monitoring.tf pattern

**Plan text:** hardcoded `project = "nlm-prod"` on both resources; no count gate.

**On-disk reality (Phase 48 monitoring.tf):**
- All resources use `project = var.project_id` (tfvars drives env).
- Resources that are prod-only (e.g., Phase 51 DNS records) use `count = var.env == "prod" ? 1 : 0`.

**Fix:** Aligned both legacy resources to `project = var.project_id` + `count = var.env == "prod" ? 1 : 0`. Alert policy filter updated to `google_monitoring_uptime_check_config.legacy[0].uptime_check_id` per count-indexed reference convention.

**Commit:** `80033c0`

### [Rule 2 — Missing] Accept 503 on legacy uptime

**Plan text:** HTTP check block only specifies `path`, `port`, `use_ssl`.

**Issue:** Phase 48 D-24 established that apex uptime accepts 2xx OR 503 to absorb transient Prisma/DB-pool hiccups. Legacy v0.1 has similar transient failure modes (same Supabase backend). Without matching tolerance, v0.1 transient hiccups during the 30-day warm would page constantly → alert fatigue (T-52-07 risk).

**Fix:** Added `accepted_response_status_codes { status_class = "STATUS_CLASS_2XX" }` and `accepted_response_status_codes { status_value = 503 }` blocks matching apex pattern.

**Commit:** `80033c0`

## Operator Checkpoint (HALT)

**All live work deferred.** Rehearsal + terraform apply are the sole reason this plan is `autonomous: false`.

## Self-Check: PASSED

- Files created:
  - `scripts/kill-switch.sh` — FOUND (125 lines, executable, 3 subcommands, bash -n clean)
- Files modified:
  - `iac/cloudrun/monitoring.tf` — FOUND (+78 lines, legacy uptime + alert, terraform fmt + validate green)
- Commits:
  - `1f63756` — FOUND in `git log --oneline`.
  - `80033c0` — FOUND in `git log --oneline`.
- `STRICT=0 bash scripts/verify-phase-52.sh` — MH4a-c + MH5a-c all PASS.
