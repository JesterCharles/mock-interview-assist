# Phase 50 — Secret Manager Flag Population Runbook

**Purpose:** Populate the `CODING_CHALLENGES_ENABLED`, `JUDGE0_URL`, and
`JUDGE0_AUTH_TOKEN` secret values in Google Secret Manager so Cloud Run
env-var mounts resolve on first boot.

**Related:** `.planning/phases/50-judge0-integration-points-flag-audit/50-CONTEXT.md`
(D-01, D-03) — see `scripts/populate-coding-flag-secrets.sh` for the
runnable implementation.

## When to run

After **Phase 45 Plan 03** ships (secret shells exist in both GCP
projects) and before the first Cloud Run revision deploys that mounts
these envs. Re-run anytime the placeholder values need rotation or in
Phase 51+ when prod values change.

## Pre-requisites

1. `gcloud auth login` completed for an identity with **Secret Manager
   Admin** (`roles/secretmanager.admin`) on both projects:
   - `nlm-prod`
   - `nlm-staging-493715`

2. Phase 45 Plan 03 has been applied (`terraform apply` ran successfully
   against `iac/cloudrun/secrets.tf`) — verify secret shells exist:

   ```bash
   gcloud secrets list --project=nlm-prod | grep CODING_CHALLENGES_ENABLED
   gcloud secrets list --project=nlm-staging-493715 | grep CODING_CHALLENGES_ENABLED
   ```

   If either command returns nothing, rerun Phase 45 Plan 03 before
   continuing.

## Run the script

From the repo root:

```bash
bash scripts/populate-coding-flag-secrets.sh
```

The script is idempotent — gcloud auto-increments secret version
numbers, so re-running is safe.

## Values written

| Secret | `nlm-prod` | `nlm-staging-493715` |
|--------|-----------|----------------------|
| `CODING_CHALLENGES_ENABLED` | `false` | `true` |
| `JUDGE0_URL` | `http://placeholder.invalid` | `http://placeholder.invalid` |
| `JUDGE0_AUTH_TOKEN` | `placeholder-will-be-set-in-v1.6` | `placeholder-will-be-set-in-v1.6` |

**Why placeholders?** Phase 50 is flag-dark — no real Judge0 endpoint
exists yet in v1.5. The `isCodingEnabled()` guard short-circuits BEFORE
`judge0Client.getEnv()` reads these values (verified in Plan 02
tests), so the placeholder strings never hit the wire. Cloud Run
env-var mount simply needs a non-empty value or the revision fails to
boot.

`http://placeholder.invalid` uses the IANA-reserved `.invalid` TLD so
even a mis-configured client cannot resolve it (RFC 6761).

## Verification

```bash
# Expected: false
gcloud secrets versions access latest \
  --secret=CODING_CHALLENGES_ENABLED \
  --project=nlm-prod

# Expected: true
gcloud secrets versions access latest \
  --secret=CODING_CHALLENGES_ENABLED \
  --project=nlm-staging-493715

# Expected: http://placeholder.invalid (both projects)
gcloud secrets versions access latest \
  --secret=JUDGE0_URL \
  --project=nlm-prod
gcloud secrets versions access latest \
  --secret=JUDGE0_URL \
  --project=nlm-staging-493715

# Expected: placeholder-will-be-set-in-v1.6 (both projects)
gcloud secrets versions access latest \
  --secret=JUDGE0_AUTH_TOKEN \
  --project=nlm-prod
gcloud secrets versions access latest \
  --secret=JUDGE0_AUTH_TOKEN \
  --project=nlm-staging-493715
```

The phase gate `scripts/verify-phase-50.sh` (Plan 04) automates these
checks — run it after populating secrets.

## Rotation

Re-running the script creates a new version for each secret. Cloud Run
revisions referencing `latest` pick up the new value on next deploy.
To force a pickup without a code change:

```bash
gcloud run deploy nlm-app-staging \
  --project=nlm-staging-493715 \
  --region=us-central1 \
  --image=$(gcloud run revisions list \
    --project=nlm-staging-493715 \
    --region=us-central1 \
    --service=nlm-app-staging \
    --format='value(image)' --limit=1)
```

## Troubleshooting

**Error: `NOT_FOUND: Secret [CODING_CHALLENGES_ENABLED] not found`**
→ Phase 45 Plan 03 not applied yet. Run `terraform apply` against
  `iac/cloudrun/secrets.tf` in both projects before re-running this
  script.

**Error: `PERMISSION_DENIED: User does not have permission`**
→ The signed-in gcloud identity lacks Secret Manager Admin on the
  project. Grant via:

  ```bash
  gcloud projects add-iam-policy-binding nlm-prod \
    --member="user:you@example.com" \
    --role="roles/secretmanager.admin"
  ```

**Cloud Run boot fails with `CODING_CHALLENGES_ENABLED env var not set`**
→ Either the secret version is empty, or the Cloud Run service
  definition does not yet mount it as an env var. Phase 47 Plan 03
  adds the mount to `iac/cloudrun/cloudrun-*.tf`.

## Future rotation (v1.6)

When Judge0 goes live in v1.6:

1. Run `iac/judge0/` terraform apply to provision the VM.
2. Grab the internal IP from `terraform output`.
3. Overwrite both placeholders with real values:

   ```bash
   printf 'http://<VM_INTERNAL_IP>:2358' | gcloud secrets versions add JUDGE0_URL \
     --data-file=- --project=nlm-prod
   printf '<real-judge0-auth-token>' | gcloud secrets versions add JUDGE0_AUTH_TOKEN \
     --data-file=- --project=nlm-prod
   printf 'true' | gcloud secrets versions add CODING_CHALLENGES_ENABLED \
     --data-file=- --project=nlm-prod
   ```

4. Redeploy Cloud Run revision to pick up the new versions.
