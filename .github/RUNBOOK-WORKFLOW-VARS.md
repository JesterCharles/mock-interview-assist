# GitHub Actions Repo Variables — NLM v1.5

**Purpose:** The deploy / rollback workflows reference GCP project numbers via `${{ vars.STAGING_PROJECT_NUMBER }}` and `${{ vars.PROD_PROJECT_NUMBER }}`. These must be set as **repo variables** (not secrets) before any workflow runs will succeed.

## Why Variables, Not Secrets?

GCP project numbers are **not sensitive**. They are:
- Visible to anyone with `roles/viewer` on the project.
- Required in error messages and WIF provider paths that must be logged for debugging.
- Static for the life of the project.

Using `${{ secrets.X }}` would needlessly mask them in logs, making failed runs harder to debug.

## Required Variables

| Variable | Value | Source |
|----------|-------|--------|
| `STAGING_PROJECT_NUMBER` | 12-digit project number for `nlm-staging-493715` | `gcloud projects describe nlm-staging-493715 --format='value(projectNumber)'` |
| `PROD_PROJECT_NUMBER` | 12-digit project number for `nlm-prod` | `gcloud projects describe nlm-prod --format='value(projectNumber)'` |

## How to Set (one-time)

### Option A — via `gh` CLI

```bash
STAGING_NUM=$(gcloud projects describe nlm-staging-493715 --format='value(projectNumber)')
PROD_NUM=$(gcloud projects describe nlm-prod --format='value(projectNumber)')

gh variable set STAGING_PROJECT_NUMBER --body "$STAGING_NUM" --repo JesterCharles/mock-interview-assist
gh variable set PROD_PROJECT_NUMBER --body "$PROD_NUM" --repo JesterCharles/mock-interview-assist
```

### Option B — via GitHub UI

1. Navigate to: https://github.com/JesterCharles/mock-interview-assist/settings/variables/actions
2. Click **New repository variable**
3. Name: `STAGING_PROJECT_NUMBER`, Value: (output of `gcloud projects describe nlm-staging-493715 --format='value(projectNumber)'`)
4. Repeat for `PROD_PROJECT_NUMBER`

## Verification

```bash
gh variable list --repo JesterCharles/mock-interview-assist
# Expected output includes STAGING_PROJECT_NUMBER and PROD_PROJECT_NUMBER
```

A failed-fast `deploy-staging.yml` run before these are set surfaces the error:
```
Error: failed to get ID token: could not find workload_identity_provider
```

## Rollback

```bash
gh variable delete STAGING_PROJECT_NUMBER --repo JesterCharles/mock-interview-assist
gh variable delete PROD_PROJECT_NUMBER --repo JesterCharles/mock-interview-assist
```
