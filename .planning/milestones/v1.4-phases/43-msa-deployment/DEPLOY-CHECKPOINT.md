# Phase 43 Deploy Checkpoint — Human Action Required

**Status:** Awaiting GCP credentials + live VM access.
**Gate:** Plan 43-01 Task 3 (checkpoint:human-action).
**Blocks:** First production coding submission (Phase 38 re-verify), Phase 44 load test kickoff.

All IaC + CI/CD + metrics + runbook code shipped to `main` autonomously. The
following steps require live `gcloud` auth and cannot be run by Claude.

***

## What's Already Done (autonomous)

| Plan | Deliverable | Status | Commit |
|------|-------------|--------|--------|
| 43-01 (Tasks 1-2) | `infra/terraform/` module — 2 VMs, firewall, SA, GCS backend | Shipped | 7515173 |
| 43-02 | `.github/workflows/` — pr-checks, deploy-app, deploy-judge0 | Shipped | bc3ea31 |
| 43-03 | `scripts/push-judge0-metrics.*` — metrics pusher + 6 passing tests | Shipped | 41806a3 + af1f120 |
| 43-04 | `docs/runbooks/coding-stack.md` — 510-line ops runbook | Shipped | 64d6966 |

***

## What the Human Must Do (live GCP)

### Prerequisites

1. `gcloud auth application-default login`
2. `terraform` **>= 1.6.0** locally (current dev machine is 1.5.7 — see
   `infra/terraform/main.tf` note; upgrade via `brew upgrade terraform` or
   `tfenv install 1.6.0`).
3. GCP project with billing enabled and Compute Engine API active.
4. SSH key pair for OS Login.

### Step 1 — Bootstrap GCS state bucket (one-time)

```bash
export PROJECT_ID="your-gcp-project"
export REGION="us-central1"

gcloud storage buckets create gs://${PROJECT_ID}-tfstate \
  --location=${REGION} \
  --uniform-bucket-level-access

gcloud storage buckets update gs://${PROJECT_ID}-tfstate --versioning
```

### Step 2 — Populate tfvars

Create `infra/terraform/terraform.tfvars` (gitignored):

```hcl
project_id           = "your-gcp-project"
region               = "us-central1"
zone                 = "us-central1-a"
app_vm_name          = "your-existing-app-vm"
app_vm_machine_type  = "e2-small"   # MUST match live VM exactly
```

### Step 3 — Terraform init

```bash
cd infra/terraform
terraform init \
  -backend-config="bucket=${PROJECT_ID}-tfstate" \
  -backend-config="prefix=nlm/prod"
```

### Step 4 — Import existing app VM

```bash
# Inspect live config first
gcloud compute instances describe ${APP_VM_NAME} --zone=${ZONE} \
  > /tmp/app-vm-live.json

# Import into Terraform state
terraform import google_compute_instance.app \
  projects/${PROJECT_ID}/zones/${ZONE}/instances/${APP_VM_NAME}

# Reconcile app-vm.tf until plan is zero-diff
terraform show google_compute_instance.app | less
# Edit infra/terraform/app-vm.tf to back-fill:
#   - boot_disk.initialize_params.image (currently placeholder: "debian-cloud/debian-12")
#   - tags, labels, metadata, scheduling
terraform plan   # MUST show 0 changes for google_compute_instance.app
```

If plan shows destroy/replace for the app VM — **STOP**. Do not apply.
Reconcile attributes until plan is clean.

### Step 5 — Apply (creates Judge0 VM + disk + firewall + SA)

```bash
terraform apply
```

Expected NEW resources:
- `google_compute_disk.judge0_data` (100 GB pd-standard)
- `google_compute_instance.judge0` (n1-standard-2, no public IP)
- `google_compute_firewall.judge0_from_app`
- `google_service_account.judge0_metrics`
- `google_project_iam_member.judge0_metrics_log_writer`

### Step 6 — Verify firewall is internal-only

```bash
gcloud compute firewall-rules describe allow-judge0-from-app \
  --format="value(sourceRanges)"
# Expected: a single /32 matching the app VM internal IP.
# If you see 0.0.0.0/0 — ABORT and investigate.
```

```bash
gcloud compute instances describe ${JUDGE0_VM_NAME:-nlm-judge0-prod} \
  --zone=${ZONE} --format="value(networkInterfaces[0].accessConfigs)"
# Expected: empty. Judge0 VM must have NO public IP.
```

### Step 7 — Bootstrap Judge0 compose on the VM

SSH into the Judge0 VM and lay down the compose file:

```bash
gcloud compute ssh nlm-judge0-prod --zone=${ZONE}
# On the VM:
mkdir -p ~/judge0 && cd ~/judge0
# Copy docker-compose.yml + .env from the phase 38 spike artifacts
# .env must include:
#   JUDGE0_IMAGE_TAG=1.13.1
#   JUDGE0_AUTH_TOKEN=<chosen token>
#   (+ all Judge0 server/worker/postgres/redis env vars from Phase 38)
docker compose up -d
```

### Step 8 — Re-verify Phase 38 spike on prod VM (MANDATORY)

Phase 38 spike was PARTIAL PASS — sandbox exec couldn't run on arm64 dev host.
Must re-verify on this x86_64 GCE VM before first real submission:

- [ ] `docker compose up` — all 4 services healthy
- [ ] POST 10 mixed-language submissions concurrently (spike fixtures in
      `.planning/phases/38-judge0-infrastructure/`)
- [ ] 30/30 correct verdicts across 3 runs (D-19)
- [ ] Wall clock ≤ 30 sec per run
- [ ] `docker stats` peak CPU ≤ 80% of limit per container
- [ ] `docker stats` peak RAM ≤ 80% of limit per container
- [ ] Commit final `deploy.resources.limits` values to the VM's compose file
- [ ] Update `.planning/PROJECT.md` "Committed Resource Sizing" section
- [ ] Append result to `docs/runbooks/coding-stack.md` §2 Review Log

### Step 9 — Install metrics pusher (runbook Appendix B)

```bash
gcloud compute scp scripts/push-judge0-metrics.mjs \
  nlm-judge0-prod:/opt/nlm/push-judge0-metrics.mjs \
  --zone=${ZONE}
```

Then follow `docs/runbooks/coding-stack.md` Appendix B steps 2-6 to create
env file, systemd service, timer, and verify logs arrive in Logs Explorer
within 2 min.

### Step 10 — Configure GitHub Actions secrets

See `docs/runbooks/coding-stack.md` Appendix A for the complete list:

```
GCP_SA_KEY, GCP_PROJECT_ID,
APP_VM_NAME, APP_VM_ZONE, APP_VM_SSH_KEY,
JUDGE0_VM_NAME, JUDGE0_VM_ZONE, JUDGE0_VM_SSH_KEY, JUDGE0_AUTH_TOKEN
```

### Step 11 — Configure alerts in GCE console (D-12)

Runbook Appendix B lists the three queries. Alerts are manual-setup per D-12
(out of Terraform scope for v1.4).

### Step 12 — First real deploy test

```bash
# Test app deploy workflow
git tag app-v1.4.0-rc1
git push origin app-v1.4.0-rc1
# Watch: GitHub Actions → Deploy App. Expect health check green.

# Test Judge0 deploy workflow
git tag judge0-v1.13.1
git push origin judge0-v1.13.1
# Watch: GitHub Actions → Deploy Judge0. Expect /system_info 200.
```

***

## VM Specs (per PROJECT.md + Phase 38 Spike)

| VM | Machine type | Boot disk | Data disk | Public IP |
|----|--------------|-----------|-----------|-----------|
| app VM | `e2-small` (imported) | default | — | yes |
| Judge0 VM | `n1-standard-2` | 20 GB Debian 12 | 100 GB pd-standard (attached, `judge0-data`) | **NO** |

**Sizing source:** Phase 38 spike (`38-SPIKE-REPORT.md`). Committed value is
`n1-standard-2`. Do NOT resize without running a follow-up spike.

***

## Exact gcloud Commands Needed (Summary)

```bash
# State bootstrap
gcloud storage buckets create gs://${PROJECT_ID}-tfstate --location=${REGION} --uniform-bucket-level-access
gcloud storage buckets update gs://${PROJECT_ID}-tfstate --versioning

# VM import
gcloud compute instances describe ${APP_VM_NAME} --zone=${ZONE} > /tmp/app-vm-live.json
terraform import google_compute_instance.app projects/${PROJECT_ID}/zones/${ZONE}/instances/${APP_VM_NAME}

# Verification (post-apply)
gcloud compute instances list --filter="name=nlm-judge0-prod"
gcloud compute firewall-rules describe allow-judge0-from-app --format="value(sourceRanges)"
gcloud compute instances describe nlm-judge0-prod --zone=${ZONE} --format="value(networkInterfaces[0].accessConfigs)"

# Metrics pusher install
gcloud compute scp scripts/push-judge0-metrics.mjs nlm-judge0-prod:/opt/nlm/push-judge0-metrics.mjs --zone=${ZONE}

# Log verification
gcloud logging read 'logName="projects/${PROJECT_ID}/logs/judge0-metrics"' --limit=3 --format=json

# Service account key creation (for GCP_SA_KEY secret)
gcloud iam service-accounts create github-deploy --display-name="GitHub Actions deploy SA"
gcloud iam service-accounts keys create key.json --iam-account=github-deploy@${PROJECT_ID}.iam.gserviceaccount.com
# (then paste key.json contents into GCP_SA_KEY secret; delete local file)
```

***

## Secrets / Env the Human Must Provide

| Name | Where | Source |
|------|-------|--------|
| `project_id` | `infra/terraform/terraform.tfvars` | GCP project id |
| `app_vm_name` | `infra/terraform/terraform.tfvars` | Existing VM name |
| `app_vm_machine_type` | `infra/terraform/terraform.tfvars` | Match live VM exactly |
| `GCP_SA_KEY` | GitHub Actions secret | Created via `gcloud iam sa keys create` |
| `GCP_PROJECT_ID` | GitHub Actions secret | Same as tfvars |
| `APP_VM_NAME`, `APP_VM_ZONE` | GitHub Actions secret | Match tfvars |
| `APP_VM_SSH_KEY` | GitHub Actions secret | Private ed25519 key (public half in OS Login) |
| `JUDGE0_VM_NAME`, `JUDGE0_VM_ZONE` | GitHub Actions secret | From `terraform output` |
| `JUDGE0_VM_SSH_KEY` | GitHub Actions secret | Private ed25519 key (public half in OS Login) |
| `JUDGE0_AUTH_TOKEN` | GitHub Actions secret + VM env | Chosen by operator, matches Judge0 server config |

***

## Blockers Removed Once Human Completes

- **Phase 44 load test** depends on a live deployed stack — can run the
  moment Step 12 succeeds
- **Phase 38 sandbox exec verification** completes via Step 8 checklist
- **First real cohort coding submission** gated on Step 8 + alert setup (Step 11)

***

*Last updated: 2026-04-18 by autonomous Phase 43 executor.*
*All autonomous work committed on `main` through commit 64d6966.*
