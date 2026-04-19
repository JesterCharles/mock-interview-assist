# GCE Judge0 Reference (v1.4)

> ⚠ **REFERENCE TEMPLATE — NOT ACTIVE INFRASTRUCTURE.**
> This directory captures the v1.4 GCE Judge0 layout for future reference.
> v1.5 uses `iac/cloudrun/` (Cloud Run). This code is **NOT** applied by
> the v1.5 CI/CD pipeline. Moved from `infra/terraform/` in Phase 50
> (JUDGE-INTEG-04) via `git mv` (history preserved). See
> `iac/cloudrun/judge0.tf.disabled` for the v1.6 activation plan.

---

## Original v1.4 Content

Phase 43 MSA deployment: dedicated Judge0 VM + imported app VM. State lives in
GCS; no local state file is ever committed.

See `.planning/phases/43-msa-deployment/43-01-PLAN.md` for the full decision
log. The short version:

- **Two VMs**, same VPC + subnet. App VM keeps its public IP; Judge0 VM has no
  public IP.
- **Firewall** — Judge0 port 2358 reachable only from app VM internal IP
  (source_ranges = /32, internal-only per D-03).
- **Persistent disk** on the Judge0 VM for Postgres data (survives restart).
- **Remote state** in GCS with versioning.
- **Least-privilege SA** attached to Judge0 VM (logWriter only).

## Prerequisites

- `gcloud auth application-default login` (or a SA key with compute + iam admin).
- `terraform >= 1.6.0` (tested against 1.6+; module uses modern backend config).
  - NOTE: local dev env may have 1.5.x — upgrade before running apply.
- GCP project with billing enabled.
- An existing app VM already provisioned (this module imports it).

## Bootstrap (one-time, per GCP project)

1. Create the GCS bucket that will hold Terraform state. The bucket name is
   conventionally `${PROJECT_ID}-tfstate`. Append `|| true` to make the
   create idempotent (safe to re-run the bootstrap block):

   ```bash
   PROJECT_ID="your-gcp-project"
   REGION="us-central1"

   gcloud storage buckets create gs://${PROJECT_ID}-tfstate \
     --location=${REGION} \
     --uniform-bucket-level-access || true

   gcloud storage buckets update gs://${PROJECT_ID}-tfstate --versioning
   ```

2. Restrict bucket IAM to the trainer user + CI service account only:

   ```bash
   # Grant your user explicit access
   gcloud storage buckets add-iam-policy-binding gs://${PROJECT_ID}-tfstate \
     --member="user:you@example.com" \
     --role="roles/storage.objectAdmin"
   ```

### State bucket hardening (WR-02, Phase 43 review)

The bootstrap above creates a bucket with Google-managed encryption and no
retention policy. For production, apply the following defense-in-depth
hardening:

**a. Customer-Managed Encryption Key (CMEK) — optional but recommended.**

Use a Cloud KMS key so you can rotate / revoke independently of Google:

```bash
# One-time: create a KMS keyring + key (regional, same region as the bucket)
gcloud kms keyrings create nlm-tfstate --location=${REGION}
gcloud kms keys create tfstate-key \
  --location=${REGION} \
  --keyring=nlm-tfstate \
  --purpose=encryption

# Grant the GCS service agent permission to use the key
PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format='value(projectNumber)')
gcloud kms keys add-iam-policy-binding tfstate-key \
  --location=${REGION} \
  --keyring=nlm-tfstate \
  --member="serviceAccount:service-${PROJECT_NUMBER}@gs-project-accounts.iam.gserviceaccount.com" \
  --role="roles/cloudkms.cryptoKeyEncrypterDecrypter"

# Apply CMEK to the bucket (new objects encrypted with this key)
gcloud storage buckets update gs://${PROJECT_ID}-tfstate \
  --default-encryption-key=projects/${PROJECT_ID}/locations/${REGION}/keyRings/nlm-tfstate/cryptoKeys/tfstate-key
```

**b. Retention policy — prevents accidental state deletion for 30 days.**

```bash
gcloud storage buckets update gs://${PROJECT_ID}-tfstate \
  --retention-period=30d
```

Retention combined with versioning gives you a 30-day undelete window for any
state file — covers accidental `terraform destroy` + delete-object race.
Removing the policy requires an explicit `--clear-retention-period` and will
print a confirmation prompt.

3. Initialize Terraform with the remote backend:

   ```bash
   cd infra/terraform
   terraform init \
     -backend-config="bucket=${PROJECT_ID}-tfstate" \
     -backend-config="prefix=nlm/prod"
   ```

4. Copy `terraform.tfvars.example` (TODO: create after Task 3) to
   `terraform.tfvars` and fill in project-specific values:

   ```hcl
   project_id           = "your-gcp-project"
   region               = "us-central1"
   zone                 = "us-central1-a"
   app_vm_name          = "your-existing-app-vm"
   app_vm_machine_type  = "e2-small"   # match live spec
   ```

## Importing the existing app VM

Plan 43-01 Task 3 is a human-action checkpoint — it requires live GCP creds.

```bash
# 1. Inspect the live VM so you can back-fill app-vm.tf attributes
gcloud compute instances describe ${APP_VM_NAME} \
  --zone=${ZONE} > /tmp/app-vm-live.json

# 2. Import into Terraform state
terraform import google_compute_instance.app \
  projects/${PROJECT_ID}/zones/${ZONE}/instances/${APP_VM_NAME}

# 3. Reconcile app-vm.tf attributes until `terraform plan` shows NO changes
#    for google_compute_instance.app. Use `terraform show` output to back-fill
#    boot_disk.initialize_params.image, tags, labels, metadata.
terraform show google_compute_instance.app | less

# 4. Verify clean plan
terraform plan   # app VM: 0 changes. Judge0 + disk + firewall + SA: NEW.
```

If the app VM resource shows ANY destroy/replace, STOP. Do not apply. Reconcile
the resource block attributes until the plan is clean.

## Applying (creates Judge0 VM, disk, firewall, SA)

```bash
terraform apply
```

Expected additions:
- `google_compute_disk.judge0_data`
- `google_compute_instance.judge0`
- `google_compute_firewall.judge0_from_app`
- `google_service_account.judge0_metrics`
- `google_project_iam_member.judge0_metrics_log_writer`

Verify post-apply:

```bash
gcloud compute instances list --filter="name=${JUDGE0_VM_NAME:-nlm-judge0-prod}"
gcloud compute firewall-rules describe allow-judge0-from-app \
  --format="value(sourceRanges)"
# Expected: a single /32 matching the app VM internal IP.
```

## Sizing overrides

`variables.tf` defaults (D-02) are driven by the Phase 38 spike report:
`.planning/phases/38-judge0-infrastructure/38-SPIKE-REPORT.md`. That spike
committed `n1-standard-2` for the Judge0 host — with a PARTIAL PASS verdict:
sandbox execution must be re-verified on the prod x86_64 VM before first
production submission (see Phase 43 Re-Verify Checklist in the spike report).

Do NOT bump `judge0_machine_type` or `judge0_data_disk_size_gb` without running
a follow-up spike. Record sizing changes in the commit message + runbook
Review Log (`docs/runbooks/coding-stack.md` §2).

## Rotation / IAM hygiene

- GCS state bucket IAM: trainer GCP user + CI SA only.
- Never commit `terraform.tfvars` (see `.gitignore`).
- Rotate the CI `GCP_SA_KEY` quarterly (see runbook Appendix A).

## File layout (D-05)

```
infra/terraform/
├── main.tf                  // providers, backend
├── variables.tf             // sizing + naming inputs
├── vpc.tf                   // data sources for existing network
├── app-vm.tf                // imported app VM (Task 3)
├── judge0-vm.tf             // new Judge0 VM + persistent disk
├── firewall.tf              // internal-only Judge0 ingress
├── service-accounts.tf      // logWriter-only SA for metrics
├── outputs.tf               // internal IPs, SA email, VM name
├── README.md                // this file
└── .gitignore               // never commit state or tfvars
```
