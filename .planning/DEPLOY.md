# DEPLOY.md — v1.5 Cloud Run Cutover Runbook

**Version:** v1.5
**Last updated:** 2026-04-19
**Applies to:** Phase 52 DNS cutover + ongoing v1.5 operations
**Archived prior version:** `.planning/milestones/v1.4-DEPLOY.md` (GCE + Docker Compose)

This runbook is the single source of truth for:
1. Cutting the `nextlevelmock.com` apex from the v0.1 GCE stack to the new v1.5 Cloud Run stack (Phase 52).
2. Deploying new versions to prod post-cutover (tag-driven CI).
3. Rolling back at the DNS layer (Cloudflare A-record swap) or at the Cloud Run layer (revision pin via `rollback-prod.yml`).

Every command in this file is copy-pasteable. Shell env vars required:

```bash
export CLOUDFLARE_API_TOKEN=<zone-scoped DNS:Edit token on nextlevelmock.com>
export CLOUDFLARE_ZONE_ID=<zone id from CF dashboard Overview panel>
export GOOGLE_OAUTH_ACCESS_TOKEN=$(gcloud auth print-access-token)  # if ADC is stale
```

## Topology

| Domain | DNS record | Points at | Orange-cloud | TTL |
|--------|-----------|-----------|--------------|-----|
| `nextlevelmock.com` | A (apex) | v0.1 GCE LB IP until Phase 52; prod Cloud Run LB IP after | ON | Auto (1) pre-cutover, 300 at T-24h |
| `www.nextlevelmock.com` | A | prod Cloud Run LB IP | OFF | 300 |
| `staging.nextlevelmock.com` | A | staging Cloud Run LB IP (Phase 47) | OFF | 300 |
| `legacy.nextlevelmock.com` | A | v0.1 GCE LB IP (30-day rollback, SUNSET-03) | OFF | 300 |

Resolve the literal IPs any time:

```bash
cd iac/cloudrun
V01_IP=$(grep -E '^v01_gce_ip' prod.tfvars | sed -E 's/.*"([^"]+)".*/\1/')
PROD_LB_IP=$(terraform output -raw prod_lb_ip)
STAGING_LB_IP=$(terraform output -raw staging_lb_ip)
echo "v01=$V01_IP  prod=$PROD_LB_IP  staging=$STAGING_LB_IP"
```

## Section 1: Preflight Checklist (T-24h before cutover)

Execute in order. Each step MUST return the expected result before proceeding. If any step fails, STOP and escalate — do NOT proceed to Section 3.

### 1.1 SSL cert ACTIVE for both apex + www

```bash
gcloud compute ssl-certificates describe nlm-prod-ssl-cert \
  --global --project=nlm-prod \
  --format='json(managed.domainStatus)'
```

Expected: both `nextlevelmock.com` AND `www.nextlevelmock.com` report `ACTIVE`. If apex is still `PROVISIONING` at T-24h (known chicken-and-egg per T-51-06): DO NOT PROCEED unless the risk is explicitly accepted in the cutover log and the team is on standby. Reason: cert must be ACTIVE before clients are routed to the LB or they hit TLS failures.

### 1.2 Uptime check green 24h

```bash
gcloud monitoring uptime list-configs --project=nlm-prod \
  --format='json(displayName,httpCheck)' \
  | jq '.[] | select(.displayName | contains("nextlevelmock"))'
```

Also review Google Cloud Monitoring alert log for the nlm-production dashboard — no fired alerts in the last 24h.

### 1.3 Staging load-test signed off (Phase 49)

```bash
test -f .planning/loadtest-baseline-v1.5.md && grep -q "sign-off" .planning/loadtest-baseline-v1.5.md
```

### 1.4 STRIDE / security signed off (Phase 49 HARD-03)

```bash
test -f .planning/SECURITY-v1.5.md && grep -qi "codex adversarial-review" .planning/SECURITY-v1.5.md
```

### 1.5 Prod image digest == latest staging deploy digest

```bash
PROD_DIGEST=$(gcloud run services describe nlm-prod --region=us-central1 --project=nlm-prod \
  --format='value(template.containers[0].image)' | grep -oE 'sha256:[a-f0-9]{64}')
STAGING_DIGEST=$(gcloud run services describe nlm-staging --region=us-central1 --project=nlm-staging-493715 \
  --format='value(template.containers[0].image)' | grep -oE 'sha256:[a-f0-9]{64}')
echo "prod:    $PROD_DIGEST"
echo "staging: $STAGING_DIGEST"
```

Expected: both digests identical OR prod is a newer CI-built digest (tag `v1.5.0-rc1` builds fresh via `deploy-prod.yml`). Either way both must resolve to a 64-hex digest; neither should be empty or `:latest`.

### 1.6 ADMIN_EMAILS channel verified (test email in last 7 days)

Manual check: operator opens `jestercharles@gmail.com` inbox and confirms at least one Google Cloud Monitoring notification / Resend test email was received in the last 7 days. Purpose: the failure-path email hop in `deploy-prod.yml` + the monitoring alert policy both route here; verify it's working before going live.

### 1.7 Supabase prod reachable from prod Cloud Run

```bash
URL=$(gcloud run services describe nlm-prod --region=us-central1 --project=nlm-prod --format='value(status.url)')
curl -sf "$URL/api/health" | jq .
```

Expect JSON body including `"db": "ok"` (or a 503 transient — retry up to 3x with 30s sleep).

### 1.8 Cloudflare API token valid + zone access

```bash
curl -sfS -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID" | jq '.result.name'
```

Expected: `"nextlevelmock.com"`.

### 1.9 Apex still points at v0.1 GCE IP (T-51-01 safety)

```bash
cd iac/cloudrun
./scripts/verify-dns-records.sh
```

Expected: exit 0. If the script exits 2, the cutover has already happened (or been attempted); ABORT preflight and investigate.

### 1.10 Team notified

Inform stakeholders the cutover window starts in 24h. Include:
- Expected cutover time (T-0)
- Expected duration (≤ 5 min DNS propagation, in-flight sessions drain naturally)
- Rollback trigger and who decides (solo-dev: operator decides)

## Section 2: T-24h Pre-Step (TTL Lowering)

Execute exactly 24 hours before the cutover window. Purpose: shorten DNS propagation so a rollback resolves within 5 min, not 4 hours.

### 2.1 Lower apex TTL to 300s via Cloudflare API

```bash
RECORD_ID=$(curl -sfS -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records?type=A&name=nextlevelmock.com" \
  | jq -r '.result[0].id')

curl -sfS -X PATCH \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"ttl":300}' \
  "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records/$RECORD_ID" \
  | jq '.result.ttl'
```

Expected response: `300`.

### 2.2 Reconcile Terraform state with the manual TTL change

```bash
cd iac/cloudrun
# Update the apex resource ttl in dns-prod.tf: 1 -> 300
# (If not updated first, a full `terraform apply` will revert the TTL back to 1.)
# Edit dns-prod.tf:
#   resource "cloudflare_record" "apex" {
#     ...
#     ttl = 300   # was 1; lowered at T-24h per DEPLOY.md Section 2
#   }
terraform apply -refresh-only -var-file=prod.tfvars
```

Do NOT run a full `terraform apply` here — it would re-apply TTL=1 and defeat the lowering. Only `-refresh-only` is safe until the edit is committed.

### 2.3 Wait 24h for caches to expire

Consumers holding the old (Auto/3600s) TTL will expire within the next 1-4 hours; remaining stragglers bound by 300s after that. At T-0, 99%+ of clients re-query apex within 5 min.

## Section 3: Cutover (T-0)

Single-line Terraform edit. Window: ≤ 5 minutes.

### 3.1 Edit `iac/cloudrun/dns-prod.tf`

Change the apex record value from `var.v01_gce_ip` to `google_compute_global_address.nlm_prod_lb_ip[0].address`:

```diff
 resource "cloudflare_record" "apex" {
   count = var.env == "prod" ? 1 : 0

   zone_id = var.cf_zone_id
   name    = "@"
   type    = "A"
-  value   = var.v01_gce_ip
+  value   = google_compute_global_address.nlm_prod_lb_ip[0].address
   ttl     = 300
   proxied = true
-  comment = "Phase 51 DNS-02 — apex still on v0.1 GCE; Phase 52 flips to google_compute_global_address.nlm_prod_lb_ip.address"
+  comment = "Phase 52 DNS-04 — apex flipped from v0.1 GCE to prod Cloud Run LB at <T-0 timestamp>"
 }
```

### 3.2 Apply (scoped, count-indexed)

```bash
cd iac/cloudrun
terraform plan -var-file=prod.tfvars -target='cloudflare_record.apex[0]'
# Expect EXACTLY 1 resource to update: cloudflare_record.apex[0] (value + comment).
# If plan shows more changes, STOP — dns-prod.tf or prod.tfvars has drifted.

terraform apply -var-file=prod.tfvars -target='cloudflare_record.apex[0]' -auto-approve
```

### 3.3 Commit the edit

```bash
git add iac/cloudrun/dns-prod.tf
git commit -m "feat(52-01): flip apex nextlevelmock.com from v0.1 GCE to prod Cloud Run LB"
git push
```

## Section 4: Verification (T+5min)

### 4.1 DNS propagation

```bash
PROD_LB_IP=$(cd iac/cloudrun && terraform output -raw prod_lb_ip)

# Apex resolves to a Cloudflare anycast IP (apex is proxied)
dig +short A nextlevelmock.com @1.1.1.1

# Confirm underlying record value via Cloudflare API:
curl -sfS -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records?type=A&name=nextlevelmock.com" \
  | jq -r '.result[0].content'
# Expect: the value of $PROD_LB_IP
```

### 4.2 Health check via public apex URL

```bash
curl -sfI https://nextlevelmock.com/api/health | head -1
# Expect: HTTP/2 200 or HTTP/2 503 (503 = Prisma transient; re-curl up to 3x)
```

### 4.3 Authenticated trainer path

Operator-manual: log in at https://nextlevelmock.com/signin → navigate to /trainer → confirm the roster loads; fetch `/api/associate/me` returns 200. This validates the full Supabase auth hop through prod Cloud Run.

### 4.4 Run the phase gate

```bash
cd iac/cloudrun
./scripts/verify-phase-51.sh
```

Expect: "All 12 Phase 51 must-haves verified." MH7 (negative assertion) will STILL trip until dns-prod.tf is re-edited to match Phase 52 state — update `verify-phase-51.sh` or scope the gate to Phase 51 + forward gate to Phase 52 verifier.

## Section 5: Rollback Procedure

Three tiers, ordered fastest to slowest. Pick the tier that matches the failure mode:

### 5.1 DNS rollback (fastest — TTL 300s, visible within 5 min)

Use when: user-visible errors after apex flip (TLS errors, 5xx spikes, broken auth flow, data integrity concern).

```bash
cd iac/cloudrun
git checkout HEAD~1 -- dns-prod.tf  # revert apex.value to var.v01_gce_ip
terraform apply -var-file=prod.tfvars -target='cloudflare_record.apex[0]' -auto-approve
```

Alternatively (if terraform is unavailable), direct Cloudflare API:

```bash
RECORD_ID=$(curl -sfS -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records?type=A&name=nextlevelmock.com" \
  | jq -r '.result[0].id')
V01_IP=$(cd iac/cloudrun && grep -E '^v01_gce_ip' prod.tfvars | sed -E 's/.*"([^"]+)".*/\1/')

curl -sfS -X PATCH \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data "{\"content\":\"$V01_IP\"}" \
  "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records/$RECORD_ID" | jq '.result.content'
```

### 5.2 Cloud Run revision rollback (image-level issue)

Use when: prod Cloud Run revision has a bug but v0.1 GCE is unavailable or the issue is isolated to the latest deploy (not cutover itself).

```bash
# List recent revisions
gcloud run revisions list --service=nlm-prod --region=us-central1 --project=nlm-prod \
  --format='table(metadata.name,metadata.creationTimestamp)' --limit=5

# Pin traffic to a previous revision via the parameterized rollback workflow:
gh workflow run rollback-prod.yml -f env=prod -f revision=<previous-revision-name>

# Watch the run:
gh run watch "$(gh run list --workflow=rollback-prod.yml --limit 1 --json databaseId -q '.[0].databaseId')"

# Verify the pinned revision is now serving:
gcloud run services describe nlm-prod --region=us-central1 --project=nlm-prod \
  --format='value(status.traffic[0].revisionName)'
```

### 5.3 Full kill-switch (30-day window, SUNSET-04)

Use when: total cutover reversal needed and DNS-layer rollback (5.1) isn't enough (e.g., Supabase prod has data corruption).

Trainer can revert with a single Cloudflare dashboard action: `nextlevelmock.com` A record value → v0.1 GCE IP. Or via API (same PATCH as Section 5.1 second command).

`legacy.nextlevelmock.com` remains pointing at v0.1 GCE for 30 days post-cutover — this is the persistent fallback URL. Phase 53 SUNSET-03 tears the v0.1 GCE stack down after the 30-day window.

## Section 6: Zero-Downtime Invariant

**Invariant:** Any active public-interview session started on v0.1 GCE BEFORE DNS propagation reaches the client MUST complete successfully on v0.1.

### Why it holds

- Cloudflare caches the pre-cutover apex record per-client up to 300s (post TTL lowering at T-24h).
- Browsers cache DNS for OS/Chrome defaults (typically 60-300s).
- Sessions in progress hold established TCP connections to v0.1; a DNS flip does not abort live connections.
- Sessions are short (10-30 min average); in-flight sessions drain naturally within the cache horizon.

### What happens to NEW sessions after cutover

New DNS queries (post-propagation) resolve to prod Cloud Run LB IP → LB → serverless NEG → `nlm-prod` Cloud Run service. Users see no difference at the URL bar.

Prod Cloud Run + v0.1 GCE share the SAME Supabase prod database (wiped + migrated clean in Phase 46). There is no split-brain — a session started on v0.1 then resumed on prod hits the same Associate/Session rows.

### Post-cutover manual verification (trainer)

1. Start one interview session against apex BEFORE the expected T+5min propagation mark — observe completion.
2. Start a second session AFTER propagation — observe completion.
3. Both must succeed. If either fails with an origin-mismatch or session-lost error, STOP and rollback per Section 5.1.

## Operating Commands (post-cutover reference)

### Deploy a new version

```bash
git tag -a vX.Y.Z -m "Release X.Y.Z"
git push origin vX.Y.Z
# Triggers .github/workflows/deploy-prod.yml automatically.
```

### Rollback to a specific revision

```bash
gh workflow run rollback-prod.yml -f env=prod -f revision=<revision-name-or-digest>
```

### Inspect current traffic

```bash
gcloud run services describe nlm-prod --region=us-central1 --project=nlm-prod \
  --format='value(status.traffic)'
```

### Tail error logs

```bash
gcloud logging read 'resource.type=cloud_run_revision AND resource.labels.service_name=nlm-prod AND severity>=WARNING' \
  --project=nlm-prod --limit=50 \
  --format='value(timestamp,jsonPayload.message)'
```

### Check managed SSL cert status

```bash
gcloud compute ssl-certificates describe nlm-prod-ssl-cert \
  --global --project=nlm-prod \
  --format='json(managed.domainStatus)'
```

### Fetch current digest serving prod

```bash
gcloud run services describe nlm-prod --region=us-central1 --project=nlm-prod \
  --format='value(template.containers[0].image)'
```

## Sunset Window (added Phase 52 D-12)

v1.5 v0.1 decommission is gated through these day-based checkpoints. The window anchors on T-0 (the Phase 52 apex flip). Phase 53 owns the decommission gate.

| Window | Days | State | Gate |
|--------|------|-------|------|
| Build | Day 0-14 | v1.5 on `staging.nextlevelmock.com`; load test + hardening signed off | Phases 47-49 complete (SUNSET-01) |
| Cutover | Day 15-21 | `nextlevelmock.com` apex → prod Cloud Run LB; v0.1 warm behind `legacy.nextlevelmock.com` | Phase 52 complete + `cutover-log-v1.5.md` committed (SUNSET-02) |
| Warm | Day 22-45 | 30-day rollback window; v0.1 stays fully running; legacy uptime check green | Phase 52 D-13 (v0.1 untouched) + legacy uptime alert quiet |
| Decommission gate | Day 45 | Phase 53 triggers v0.1 teardown checklist; terraform archive; legacy DNS retired | SUNSET-03 (Phase 53 owns) |

### Kill switch (SUNSET-04)

`scripts/kill-switch.sh revert` flips apex back to `$V01_GCE_IP` in ~2s via the Cloudflare API. Rehearsed in Phase 52 Plan 03 at T+30min. Required env: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ZONE_ID`, `V01_GCE_IP`, `PROD_CLOUDRUN_LB_IP`.

```bash
# Status only — no mutation
bash scripts/kill-switch.sh status

# Emergency rollback to v0.1 GCE (apex flip back; ~30-60s DNS propagation)
bash scripts/kill-switch.sh revert

# Forward back to prod Cloud Run
bash scripts/kill-switch.sh restore

# Reconcile terraform state after any revert/restore
terraform -chdir=iac/cloudrun refresh -var-file=prod.tfvars
```

After a kill-switch revert, operator MUST also run `gcloud run services update-traffic nlm-prod --to-revisions=<previous-digest>=100 --project=nlm-prod` via `rollback-prod.yml` **IF** the rollback is due to a bad prod revision (not a DNS issue). DNS-only rollback does not change which revision prod serves — it changes which origin clients resolve to.

### Monitoring during warm window

- `nextlevelmock.com/api/health` uptime (Phase 48 D-13) — now exercises prod Cloud Run.
- `legacy.nextlevelmock.com/api/health` uptime (Phase 52 D-14) — monitors v0.1 warm capacity for the 30-day window. Same email alert channel as apex.
- Both bind to: `jestercharles@gmail.com` (ADMIN_EMAILS Secret Manager secret).

### v0.1 GCE posture during warm (D-13)

Services running. LB alive. SSL cert auto-renewed. **No throttling. No scaling-down.** Cost accepted (~1 e2-small / month for 30 days; ~$7 total). The tradeoff is explicit: the kill-switch path is only viable as long as v0.1 is receiving requests successfully on `legacy.nextlevelmock.com`.

### Phase 52 verification

Run `bash scripts/verify-phase-52.sh` after the T+60min smokes complete. The phase-gate aggregates every Phase 52 must-have (cutover log sections present, apex DNS + health green, kill-switch + legacy uptime artifacts shipped, DEPLOY.md Sunset Window section present, `prod.tfvars` canonical state).

## Post-Cutover Reminders

- v0.1 GCE stays live on `legacy.nextlevelmock.com` for 30 days (SUNSET-03 countdown starts at T-0).
- Lower apex TTL back to Auto after 7 days of green (reduces Cloudflare query volume).
- Phase 53 handles decommissioning v0.1 GCE + archival of this runbook's v1.5 version.

## 7. Secret Rotation

Rotate a secret without downtime. Cloud Run loads secrets at revision-deploy time, so rotation = new secret version + new revision.

### Rotate a secret (both envs)

1. Generate the new secret value (provider dashboard, `openssl rand`, etc.).
2. Add the new version to Secret Manager:
   ```bash
   echo -n "<new-value>" | gcloud secrets versions add <SECRET_NAME> \
     --data-file=- \
     --project=<PROJECT_ID>
   ```
3. Deploy a new Cloud Run revision so it picks up the latest version. Either:
   - Push an empty commit and let `deploy-staging.yml` / `deploy-prod.yml` roll a new revision, OR
   - Manually: `gcloud run services update nlm-<env> --update-secrets=<ENV_VAR>=<SECRET_NAME>:latest --project=<PROJECT_ID>`
4. Smoke: `curl -sfI https://<host>/api/health` returns 200.
5. (Optional) Destroy the old version after 24h soak: `gcloud secrets versions destroy <SECRET_NAME> --version=<OLD_NUM>`.

### Rotation cadence (recommended)

| Secret | Cadence | Trigger |
|--------|---------|---------|
| `DATABASE_URL` / `DIRECT_URL` | On Supabase password reset | Supabase dashboard prompt |
| `SUPABASE_SECRET_KEY` | Quarterly | Calendar reminder |
| `OPENAI_API_KEY` | On employee offboarding or suspected leak | Ad-hoc |
| `RESEND_API_KEY` | On suspected leak | Ad-hoc |
| `JUDGE0_AUTH_TOKEN` | N/A in v1.5 (flag-dark) | v1.6 |
| WIF provider config | Annually | Calendar |

## 8. Supabase Migration Promotion

How a Prisma schema change travels from `main` → staging → prod.

### Normal flow

1. Developer authors schema change in `prisma/schema.prisma` on a feature branch.
2. Locally: `npx prisma migrate dev --name <descriptive-name>` against a dev Supabase (or a throwaway local Postgres). Commits the generated migration file under `prisma/migrations/`.
3. Open PR → `pr-checks.yml` runs `prisma format` + `prisma validate` (no DB apply).
4. Merge to `main` → `deploy-staging.yml` runs `prisma migrate deploy` against the staging `DIRECT_URL` as a pre-deploy step. If it fails, the deploy aborts.
5. Staging smoke + manual validation.
6. Cut release tag `v*` → `deploy-prod.yml` runs `prisma migrate deploy` against prod `DIRECT_URL` (same migration file). Same failure behavior.

### Emergency rollback

Schema changes are **forward-only**. If a migration breaks prod:
1. Immediately revert the app via `rollback-prod.yml` (Cloud Run revision swap) — app on old image keeps working against new schema IF the schema change was additive.
2. If the schema change was destructive (DROP COLUMN, etc.) and the old revision can't read the new schema, manual recovery is required: restore the pre-migration `pg_dump` from the Phase 46 backup bucket. This is a last resort and implies data loss for writes since the migration.

### Additive-only policy

Per the Phase 46 migrate-deploy baseline, schema changes should be additive (ADD COLUMN, CREATE TABLE, CREATE INDEX). Destructive changes (DROP COLUMN, RENAME TABLE) require a two-step migration:
- v*.a: Add new column, dual-write from app.
- v*.b (next milestone): Drop old column once all readers have migrated.

## 9. v0.1 Sunset + Day-45 Teardown Checklist

**Target teardown date: 2026-06-02** (cutover 2026-04-18 + 45 days).

This section is the authoritative runbook. The standalone file `.planning/decommission-checklist-v01.md` mirrors it for operator sign-off. `scripts/decommission-v01.sh` contains the gcloud commands pre-commented — operator uncomments one block per step.

### Preconditions (gate before any delete)

- 30-day warm window elapsed without a rollback event (check Phase 48 uptime history on `legacy.nextlevelmock.com`).
- Prod Cloud Run uptime >= 99% over the past 30 days.
- No outstanding kill-switch requests in issue tracker.
- A fresh `pg_dump` of the prod Supabase taken within 24h of teardown (belt-and-suspenders; prod Supabase is untouched by teardown).

### Step-by-step teardown (9 steps)

1. **Confirm 30-day warm window elapsed without rollback.** Check Phase 48 uptime history on `legacy.nextlevelmock.com` and Cloudflare analytics on legacy traffic. No rollback event recorded.
2. **Delete the legacy app VM:**
   ```bash
   gcloud compute instances delete nlm-app-vm --zone=us-central1-a --project=<v0.1-project-id> --quiet
   ```
3. **Delete the legacy Judge0 VM:**
   ```bash
   gcloud compute instances delete judge0-vm --zone=us-central1-a --project=<v0.1-project-id> --quiet
   ```
4. **Delete legacy forwarding rule (load balancer):**
   ```bash
   gcloud compute forwarding-rules delete <legacy-LB-rule-name> --region=us-central1 --project=<v0.1-project-id> --quiet
   ```
5. **Release legacy static IP:**
   ```bash
   gcloud compute addresses release <legacy-IP-name> --region=us-central1 --project=<v0.1-project-id>
   ```
6. **Remove `legacy.nextlevelmock.com` DNS record.** Cloudflare dashboard → DNS → delete the A record. (OR terraform-managed: remove the resource from `iac/cloudrun/dns-prod.tf` and `terraform apply`.)
7. **Remove the legacy uptime check from Cloud Monitoring.** Cloud Console → Monitoring → Uptime Checks → delete the check targeting `legacy.nextlevelmock.com`. This stops paging on the now-torn-down service.
8. **Archive / retain `iac/gce-judge0/`.** Per Phase 50 D-13 decision: **retain as a v1.6 reference template.** Do NOT delete; the README in that directory already labels it as a reference, not active infrastructure.
9. **Update project docs to remove v0.1 references.** Open PRs against `.planning/STATE.md` and `.planning/PROJECT.md` removing "v0.1 GCE" language. Commit as `docs(v0.1-sunset): remove v0.1 references post-teardown`.

### Post-teardown

- Tick the sign-off line in `.planning/decommission-checklist-v01.md`: `Executed by: <name> on <date>`.
- Close the milestone v1.5 retrospective action item tracking v0.1 teardown.
- Announce internally (email / Slack) that legacy GCE is off.
