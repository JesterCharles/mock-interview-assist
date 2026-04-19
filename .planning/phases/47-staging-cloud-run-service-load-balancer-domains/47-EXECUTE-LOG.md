# Phase 47 Execute Log

**Mode:** unattended
**Started:** 2026-04-18
**Finished:** 2026-04-18
**Executor:** claude-opus-4-7[1m]

## Summary

| Plan  | Status                        | Tasks | Commits                                 | Notes                                                                                |
| ----- | ----------------------------- | ----- | --------------------------------------- | ------------------------------------------------------------------------------------ |
| 47-01 | PARTIAL — HALT on Task 3       | 2/3   | `8125a5e`, `561e34c`                    | vars/providers/tfvars extended + cloudrun-staging.tf shipped; terraform apply HALTED |
| 47-02 | PARTIAL — HALT on Task 3       | 2/3   | `0d791ac`, `c1e16a8`                    | LB+DNS HCL shipped + README runbook; terraform apply + SSL poll HALTED               |
| 47-03 | PARTIAL — HALT on Task 2+3     | 1/3   | `3afd146`, `bc1702d`                    | WIF HCL + D-18 bindings + wif-smoke.yml shipped; apply both projects + gh run HALTED |
| 47-04 | PARTIAL — HALT on Task 1+2+3   | 0/3   | `f139123`                               | Probe + phase-gate + runbook shipped; live invocation HALTED (nothing to verify yet) |

**Plans completed: 0** (all 4 are code-complete with operator checkpoints)
**Plans halted (code complete, operator pending): 4**
**Total commits: 7** per-task + 4 SUMMARY + 1 EXECUTE-LOG/STATE (pending)
**Duration:** ~32 minutes wall clock

## Commit Range

First → last: `8125a5e..HEAD` on branch `chore/v1.5-archive-v1.4`.

```
8125a5e feat(47-01): extend TF vars/providers/tfvars for Phase 47 + register cloudflare v4 provider
561e34c feat(47-01): add staging Cloud Run v2 service HCL (INFRA-04, T-47-07 lifecycle ignore)
0d791ac feat(47-02): add staging HTTPS LB + managed SSL + Cloudflare DNS HCL (INFRA-05)
c1e16a8 docs(47-02): document Phase 47 apply sequence + SSL poll + Cloudflare zone lookup runbook
3afd146 feat(47-03): add WIF pool+provider + D-18 least-privilege bindings (CI-04, T-47-02/03)
bc1702d feat(47-03): add wif-smoke.yml workflow_dispatch workflow (D-19, Pitfall 8 ordering)
f139123 feat(47-04): add coldstart-probe-staging.sh + verify-phase-47.sh phase-gate + Plan 04 runbook
```

## Per-Plan Detail

### 47-01 — Staging Cloud Run Service (PARTIAL — HALT on Task 3)

- **Shipped:**
  - `iac/cloudrun/variables.tf` extended: `initial_image_digest` (no default), `domain_name`, `github_repo_slug`, `cf_zone_id`
  - `iac/cloudrun/providers.tf` extended: `cloudflare/cloudflare ~> 4.0` registered + `provider "cloudflare" {}` block (env-auth)
  - `iac/cloudrun/outputs.tf` extended: `cloudrun_service_name`, `cloudrun_service_url`
  - `iac/cloudrun/staging.tfvars` extended: Phase 47 values (placeholders for `initial_image_digest` + `cf_zone_id`)
  - `iac/cloudrun/cloudrun-staging.tf` NEW: `google_cloud_run_v2_service.nlm_staging` + `google_cloud_run_v2_service_iam_member.public_invoke`, count-gated to staging
- **Validations:** `terraform fmt -check` exit 0; `terraform validate` exit 0; `terraform init -reconfigure` downloaded + locked cloudflare v4.52.7; `terraform plan -target=...` shows 2 resources to add.
- **HALT reason (Task 3):** `terraform apply` blocked by three operator gates — (1) no image in Artifact Registry (P45-02 Docker smoke halted on supabase-admin D-15 conflict), (2) 13 Phase 46 secrets unpopulated pending operator runbook A–J, (3) no `CLOUDFLARE_API_TOKEN`. `staging.tfvars` placeholders block apply intentionally.

### 47-02 — Load Balancer + DNS (PARTIAL — HALT on Task 3)

- **Shipped:**
  - `iac/cloudrun/loadbalancer-staging.tf` NEW: 7 chained LB resources (global_address → serverless NEG → backend_service → url_map → managed_ssl_certificate → target_https_proxy → global_forwarding_rule), all count-gated. SSL cert uses `create_before_destroy`. No `balancing_mode` (invalid on SERVERLESS NEG). No HTTP:80 redirect.
  - `iac/cloudrun/dns-staging.tf` NEW: `cloudflare_record.staging` v4 syntax (`resource "cloudflare_record"`, arg `value` — NOT v5 `cloudflare_dns_record`/`content`). `proxied = false` literal (T-47-06).
  - `iac/cloudrun/README.md` extended with "## Phase 47 apply sequence" section: prerequisites, Cloudflare zone lookup (+ Keychain stash), AR digest capture, full Wave 1→2→3 apply sequence, SSL ACTIVE 40×60s poll, PROVISIONING/FAILED_NOT_VISIBLE troubleshooting.
- **Validations:** `terraform validate` exit 0; `terraform plan -var-file=staging.tfvars` shows 10 resources to add (2 + 7 + 1).
- **HALT reason (Task 3):** Creating a live Cloudflare DNS record requires `CLOUDFLARE_API_TOKEN`; SSL ACTIVE wait is 10–60 min. Both are operator-gated.

### 47-03 — Workload Identity Federation (PARTIAL — HALT on Tasks 2+3)

- **Shipped:**
  - `iac/cloudrun/wif.tf` NEW: `data.google_project.current` + `google_iam_workload_identity_pool.github` + `google_iam_workload_identity_pool_provider.github` (with `attribute_condition` repo-gate — T-47-02) + `google_service_account_iam_member.wif_impersonation` (principalSet uses `data.google_project.current.number`, Pitfall 3).
  - `iac/cloudrun/iam.tf` extended with 3 D-18 bindings: project-level `roles/artifactregistry.writer` + `roles/run.admin`, SA-scoped `roles/iam.serviceAccountUser` on `nlm-cloudrun-sa`. No `roles/owner`/`roles/editor` anywhere (T-47-03).
  - `.github/workflows/wif-smoke.yml` NEW: workflow_dispatch only, `permissions: id-token: write + contents: read`, `google-github-actions/auth@v2` → `setup-gcloud@v2` (Pitfall 8) → `gcloud auth list` + `print-identity-token` proof. Uses `${{ vars.STAGING_PROJECT_NUMBER }}` (non-secret repo variable).
- **Validations:** `terraform plan -var-file=staging.tfvars` shows 16 resources total to add. Plan output confirms principalSet URI interpolates to `168540542629` (staging project number from live gcloud describe) — NOT the project ID string. Project numbers captured: staging=`168540542629`, prod=`609812564722`.
- **HALT reasons:**
  - Task 2 — Live `terraform apply` against BOTH projects (`nlm-staging-493715` + `nlm-prod`). Not destructive but D-18 matrix changes require operator sign-off; also chains onto P47-01 HALT.
  - Task 3 — `gh variable set STAGING_PROJECT_NUMBER / PROD_PROJECT_NUMBER` + `gh workflow run wif-smoke.yml`. Requires repo-scope PAT and applied WIF bindings.

### 47-04 — Phase-Gate + Cold-Start Probe (PARTIAL — HALT on Tasks 1+2+3)

- **Shipped:**
  - `iac/cloudrun/scripts/coldstart-probe-staging.sh` (executable): SSL ACTIVE gate (Pitfall 7 advisory-exit-0) → pin LATEST → `${COLDSTART_WAIT_SECONDS:-300}`s sleep → curl `/api/health` with `-w '%{http_code} %{time_total}'` → assert HTTP 200 AND `time_total < 30.0` via awk float compare.
  - `iac/cloudrun/scripts/verify-phase-47.sh` (executable): 17 total PASS gates — 7 INFRA-04 + 5 INFRA-05 + 5 CI-04 + cold-start delegation. Final line: `All Phase 47 assertions PASSED.` (exact match).
  - `iac/cloudrun/README.md` extended with "### Plan 04 — NEXT_PUBLIC_SITE_URL secret + cold-start probe" H3: secret add + update-secrets runbook, probe invocation, phase-gate invocation, T-47-10 rotation notes.
- **Validations:** `bash -n` syntax check exits 0 on both scripts; both have `0755` perms.
- **HALT reasons:**
  - Task 1 — `gcloud secrets versions add NEXT_PUBLIC_SITE_URL` + `gcloud run services update --update-secrets=...:latest`. Live Secret Manager write + Cloud Run revision update.
  - Task 2 — Script depends on live Cloud Run + SSL ACTIVE.
  - Task 3 — Phase-gate fails on first missing resource; nothing live yet to verify.

## Next Actions for Human Operator

Execute in order. Each step requires the prior step complete.

**1. Pre-apply: populate Phase 46 secrets (if not already done)**

Run Phase 46 runbook (`docs/runbooks/phase-46-supabase-wipe.md`) Phases A–J end-to-end. Confirm all 13 Secret Manager secrets in `nlm-staging-493715` have real values:
```bash
for S in DATABASE_URL DIRECT_URL NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY SUPABASE_SECRET_KEY OPENAI_API_KEY RESEND_API_KEY GITHUB_TOKEN NEXT_PUBLIC_SITE_URL ADMIN_EMAILS JUDGE0_URL JUDGE0_AUTH_TOKEN CODING_CHALLENGES_ENABLED; do
  V=$(gcloud secrets versions access latest --secret="$S" --project=nlm-staging-493715 2>/dev/null | head -c 12)
  echo "$S=${V:-MISSING}"
done
```

**2. Push the first Docker image**

P45-02 Docker smoke was HALTED on the `src/lib/supabase/admin.ts` eager-init D-15 conflict. Pick one path:
- **Option A (recommended):** Lazy-init `supabaseAdmin` (small app-code change; now allowed since we're past P45). Then:
  ```bash
  docker build -t us-central1-docker.pkg.dev/nlm-staging-493715/nlm-app/nlm-app:phase47-first .
  docker push us-central1-docker.pkg.dev/nlm-staging-493715/nlm-app/nlm-app:phase47-first
  DIGEST=$(gcloud artifacts docker images list \
    us-central1-docker.pkg.dev/nlm-staging-493715/nlm-app/nlm-app \
    --include-tags --filter='tags:phase47-first' \
    --format='value(DIGEST)' --limit=1)
  echo "initial_image_digest = \"sha256:$DIGEST\""  # paste into staging.tfvars
  ```
- **Option B:** Let Phase 48 CI publish the first image, then come back to P47 apply. (Phase 47 apply + P48 CI are mutually dependent in this path — CI can't deploy to a service that doesn't exist. Option A is preferred.)

**3. One-time Cloudflare zone lookup**

```bash
export CLOUDFLARE_API_TOKEN='<token-with-Zone.Read+Zone.DNS.Edit-on-nextlevelmock.com>'
ZONE_ID=$(curl -sf -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/zones?name=nextlevelmock.com" \
  | jq -r '.result[0].id')
echo "cf_zone_id = \"$ZONE_ID\""  # paste into staging.tfvars
```

**4. Replace placeholders in `iac/cloudrun/staging.tfvars`**

Overwrite the two placeholders with real values:
- `initial_image_digest = "sha256:<64-hex-from-step-2>"`
- `cf_zone_id = "<32-hex-from-step-3>"`

**5. Apply Phase 47 in order (Wave 1 → Wave 2 → Wave 3)**

Follow the runbook in `iac/cloudrun/README.md` "## Phase 47 apply sequence". Targeted applies only — Phase 48 will handle future deploys:

```bash
cd iac/cloudrun
terraform init -reconfigure -backend-config="prefix=cloudrun/staging"

# Wave 1 — Cloud Run service
terraform apply -var-file=staging.tfvars \
  -target=google_cloud_run_v2_service.nlm_staging \
  -target=google_cloud_run_v2_service_iam_member.public_invoke

# Wave 2 — LB + DNS + WIF (staging)
terraform apply -var-file=staging.tfvars \
  -target=google_compute_global_address.nlm_staging_lb_ip \
  -target=google_compute_region_network_endpoint_group.nlm_staging_neg \
  -target=google_compute_backend_service.nlm_staging_backend \
  -target=google_compute_url_map.nlm_staging_urlmap \
  -target=google_compute_managed_ssl_certificate.nlm_staging_cert \
  -target=google_compute_target_https_proxy.nlm_staging_https_proxy \
  -target=google_compute_global_forwarding_rule.nlm_staging_https_fwd \
  -target=cloudflare_record.staging \
  -target=data.google_project.current \
  -target=google_iam_workload_identity_pool.github \
  -target=google_iam_workload_identity_pool_provider.github \
  -target=google_service_account_iam_member.wif_impersonation \
  -target=google_project_iam_member.ghactions_artifactregistry_writer \
  -target=google_project_iam_member.ghactions_run_admin \
  -target=google_service_account_iam_member.ghactions_act_as_cloudrun_sa

# Same WIF bindings against nlm-prod
terraform init -reconfigure -backend-config="prefix=cloudrun/prod"
terraform apply -var-file=prod.tfvars \
  -target=data.google_project.current \
  -target=google_iam_workload_identity_pool.github \
  -target=google_iam_workload_identity_pool_provider.github \
  -target=google_service_account_iam_member.wif_impersonation \
  -target=google_project_iam_member.ghactions_artifactregistry_writer \
  -target=google_project_iam_member.ghactions_run_admin \
  -target=google_service_account_iam_member.ghactions_act_as_cloudrun_sa
```

**6. Wait for SSL cert ACTIVE (10–60 min)**

```bash
for i in {1..40}; do
  S=$(gcloud compute ssl-certificates describe nlm-staging-ssl-cert \
    --project=nlm-staging-493715 --format='value(managed.status)')
  echo "[$i] cert=$S"; [[ "$S" == "ACTIVE" ]] && break; sleep 60
done
```

**7. Set GitHub repo variables + run WIF smoke**

```bash
gh variable set STAGING_PROJECT_NUMBER --body 168540542629 --repo JesterCharles/mock-interview-assist
gh variable set PROD_PROJECT_NUMBER --body 609812564722 --repo JesterCharles/mock-interview-assist
gh workflow run wif-smoke.yml --ref main --repo JesterCharles/mock-interview-assist
# Poll:
gh run list --workflow=wif-smoke.yml --limit 1 --json conclusion -q '.[0].conclusion'
# Expected: success
```

**8. Plan 04 — populate NEXT_PUBLIC_SITE_URL + refresh revision**

```bash
echo -n 'https://staging.nextlevelmock.com' | gcloud secrets versions add NEXT_PUBLIC_SITE_URL \
  --project=nlm-staging-493715 --data-file=-
gcloud run services update nlm-staging \
  --region=us-central1 --project=nlm-staging-493715 \
  --update-secrets=NEXT_PUBLIC_SITE_URL=NEXT_PUBLIC_SITE_URL:latest --quiet
```

**9. Run phase gate**

```bash
bash iac/cloudrun/scripts/verify-phase-47.sh
# Expected final line: All Phase 47 assertions PASSED.
```

**10. Proceed to Phase 48** (`/gsd-execute-phase 48 --unattended`) — GitHub Actions CI + deploy-staging + observability.

## Infrastructure Footprint

**Code + docs landed this phase (pending operator apply):**
- 5 new HCL files: `cloudrun-staging.tf`, `loadbalancer-staging.tf`, `dns-staging.tf`, `wif.tf` + 3 existing extensions (`variables.tf`, `providers.tf`, `outputs.tf`, `staging.tfvars`, `iam.tf`)
- 1 new GitHub Actions workflow: `.github/workflows/wif-smoke.yml`
- 2 new scripts: `iac/cloudrun/scripts/coldstart-probe-staging.sh`, `iac/cloudrun/scripts/verify-phase-47.sh`
- `iac/cloudrun/README.md` extended with Phase 47 apply sequence + Plan 04 runbook (~130 net new lines)
- `.terraform.lock.hcl` updated: `cloudflare/cloudflare v4.52.7` pinned

**On live apply (operator), the following will be created:**
- **nlm-staging-493715** (+16 resources): 1 Cloud Run v2 service, 1 public invoker IAM, 7 LB chain resources, 1 Cloudflare A record, 3 WIF resources (pool + provider + impersonation), 3 IAM bindings (artifactregistry.writer + run.admin + SA-scoped serviceAccountUser)
- **nlm-prod** (+6 resources, WIF + D-18 only): pool + provider + impersonation + 3 IAM bindings. No Cloud Run / LB in prod until Phase 51.
- **Cloudflare (nextlevelmock.com zone):** 1 A record `staging.nextlevelmock.com` with proxied=false

**Zero USER_MANAGED SA keys** after apply — WIF is the only GH Actions → GCP auth path.

## Known Risks Carried Forward

- **P45-02 Docker smoke halt** — still unresolved. Option A (lazy-init supabaseAdmin) is the cleanest path; decided at operator time.
- **Cold-start time unverified** — INFRA-04 SC#4 (`time_total < 30s`) depends on cold-start probe, which only runs after SSL ACTIVE. `startup_cpu_boost = true` is in the service template to help. If probe fails, operator can bump `min_instance_count = 1` (costs ~$13/mo) per existing STATE.md todo.
- **Supabase pooler public endpoint** — confirmed with `no vpc_access` in Cloud Run HCL. Phase 49 HARD-02 may revisit if abuse testing shows leaks.
- **Cloudflare token rotation** — annual cadence target; not automated. Phase 53 runbook will formalize.

## Status as of this log

Phase 47 is **code-complete + test-green + plan-green**. Every HCL file validates. Every script syntax-checks. Every runbook exists on disk. Nothing has been applied to live GCP or Cloudflare yet.

Phase 47 exits with 4/4 plans halted on operator checkpoints, matching the Phase 46 pattern (1/4 auto + 3/4 halted) but more halt-heavy because every plan in Phase 47 requires live infra mutations.

Operator's single-command exit criterion: `bash iac/cloudrun/scripts/verify-phase-47.sh` returning exit 0 with final line `All Phase 47 assertions PASSED.`
