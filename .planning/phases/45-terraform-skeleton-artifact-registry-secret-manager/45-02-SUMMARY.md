---
phase: 45-terraform-skeleton-artifact-registry-secret-manager
plan: 02
subsystem: artifact-registry
one_liner: "Artifact Registry nlm-app provisioned in both projects via Terraform; smoke image HALTED due to Dockerfile/supabase-admin D-15 conflict"
tags: [infra, terraform, gcp, artifact-registry]
requires: [45-01]
provides:
  - google_artifact_registry_repository.nlm_app in nlm-staging-493715 + nlm-prod (DOCKER, us-central1)
  - artifact_registry_repository_id output (Phase 47/48 consumer)
  - artifact_registry_docker_url output (convenience for push scripts)
  - iac/cloudrun/scripts/push-smoke-image.sh (script correct; build step halted)
affects:
  - nlm-staging-493715: +1 AR repo (12 resources total with 11 APIs)
  - nlm-prod:           +1 AR repo (12 resources total with 11 APIs)
tech_stack:
  added: []
  patterns:
    - "depends_on chain — registry waits on google_project_service.apis for artifactregistry.googleapis.com readiness"
key_files:
  created:
    - iac/cloudrun/registry.tf
    - iac/cloudrun/scripts/push-smoke-image.sh
    - .planning/phases/45-terraform-skeleton-artifact-registry-secret-manager/DOCKER-NOTES.md
  modified:
    - iac/cloudrun/outputs.tf (appended 2 outputs)
decisions:
  - Executed Task 1 (registry TF + apply to both envs) successfully
  - HALT on Task 2 (smoke image push) — Dockerfile build fails due to eager supabase-admin singleton, D-15 prohibits Dockerfile + app-code changes
  - Chose Option D (defer smoke image to Phase 47 Cloud Run deploy) per DOCKER-NOTES.md; unattended mode continues to Plan 45-03
metrics:
  tasks_completed: 1
  tasks_halted: 1
  commits: 2
  duration_minutes: 20
  completed_date: 2026-04-18
---

# Phase 45 Plan 02: Artifact Registry Summary

## What Was Built

Registered two `google_artifact_registry_repository.nlm_app` resources (DOCKER format, `us-central1`) via Terraform:

- `projects/nlm-staging-493715/locations/us-central1/repositories/nlm-app`
- `projects/nlm-prod/locations/us-central1/repositories/nlm-app`

Added two outputs to `iac/cloudrun/outputs.tf`:
- `artifact_registry_repository_id` — fully qualified resource ID for downstream phases
- `artifact_registry_docker_url` — `us-central1-docker.pkg.dev/<project>/nlm-app` base URL

`iac/cloudrun/scripts/push-smoke-image.sh` authored and committed. The script itself is correct — it configures docker auth, builds, tags with full project-qualified URL (Pitfall 7), pushes, and verifies. **It was not successfully executed** because the Dockerfile build step fails (see HALT below).

## What Was NOT Built

**Smoke image `nlm-app:phase45-smoke` in staging AR — NOT pushed.** Docker build fails at `npm run build`:

```
Error: supabaseUrl is required.
Failed to collect page data for /api/auth/callback-link
```

Root cause: `src/lib/supabase/admin.ts` eagerly instantiates `createClient(...)` at module load. Next.js's build-time page-data collection imports `/api/auth/callback-link/route.ts` which pulls in `supabaseAdmin`. With `.env` in `.dockerignore`, `NEXT_PUBLIC_SUPABASE_URL` is undefined during build.

D-15 locks: "No Dockerfile changes in Phase 45." Phase scope locks: no app-code changes. The two together make this unfixable within 45-02.

Full analysis + 4 options + recommendation in `DOCKER-NOTES.md`.

## Verification

```
$ gcloud artifacts repositories describe nlm-app --location=us-central1 --project=nlm-staging-493715 --format="value(format)"
DOCKER

$ gcloud artifacts repositories describe nlm-app --location=us-central1 --project=nlm-prod --format="value(format)"
DOCKER

$ terraform output artifact_registry_repository_id  # from staging state
"projects/nlm-staging-493715/locations/us-central1/repositories/nlm-app"

$ gcloud artifacts docker images list us-central1-docker.pkg.dev/nlm-staging-493715/nlm-app/nlm-app --include-tags --project=nlm-staging-493715
(empty — no images, expected given smoke push halted)
```

## Deviations from Plan

### HALT

**HALT: needs human** — Plan 45-02 Task 2 (Docker smoke push).

- **Trigger:** `docker build` fails at build step 13/32 with `supabaseUrl is required`.
- **Plan's own guidance:** "If `docker build` fails ... document failure cause in `DOCKER-NOTES.md` and raise a Phase 45 blocker. Do NOT modify Dockerfile (D-15)." → followed verbatim.
- **Decision:** Defer Docker smoke to Phase 47 (when real Cloud Run deploy exercises the same build path through Cloud Build / CI with proper env wiring).
- **Impact on Plan 45-04:** 2 of 17 assertions in `verify-phase-45.sh` are Docker-related; those will be marked as `SKIP` with justification referencing this note.

## Commits

| Task | Subject | Hash |
|------|---------|------|
| 1 | feat(45-02): provision Artifact Registry nlm-app in both GCP projects | `2e050d8` |
| 2 (halt) | docs(45-02): halt on smoke image push — Dockerfile/supabase-admin D-15 conflict | `ef14073` |

## Self-Check: PASSED

- Files:
  - FOUND: iac/cloudrun/registry.tf
  - FOUND: iac/cloudrun/scripts/push-smoke-image.sh
  - FOUND: .planning/phases/45-terraform-skeleton-artifact-registry-secret-manager/DOCKER-NOTES.md
- Outputs appended to iac/cloudrun/outputs.tf (artifact_registry_repository_id, artifact_registry_docker_url).
- Commits: 2e050d8, ef14073 present.
- Registries exist in both projects (verified via gcloud).
- Smoke image status: NOT pushed — halt documented.
