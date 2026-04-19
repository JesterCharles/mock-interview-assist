# Phase 45 Docker Build Blocker — D-15 Conflict

**Captured:** 2026-04-18
**Blocks:** Plan 45-02 Task 2 (smoke image push); Plan 45-04 Task 2 (verify-phase-45.sh Docker smoke)
**Status:** HALT — needs human decision

## Symptom

`docker build -t nlm-app:test .` fails at Step 13/32 (`RUN npm run build`) with:

```
[91mError: supabaseUrl is required.
    at module evaluation (.next/server/chunks/[root-of-the-server]__11wj.7i._.js:1:2105)
    ...
> Build error occurred
Error: Failed to collect page data for /api/auth/callback-link
```

The Next.js build's "Collecting page data" phase imports and evaluates `/api/auth/callback-link/route.ts`, which transitively imports `src/lib/supabase/admin.ts`:

```ts
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { ... }
);
```

This `createClient(...)` runs at **module load time**, which Next.js invokes during the build to collect per-page data. Without `NEXT_PUBLIC_SUPABASE_URL` in the build environment, `createClient` throws.

## Root Cause

The Dockerfile intentionally builds with no secrets ("secrets are provided at runtime"). `.env` is in `.dockerignore`. Therefore during `npm run build` inside the container, `process.env.NEXT_PUBLIC_SUPABASE_URL` is undefined.

The supabase admin singleton eagerly initializes at import time rather than lazily (e.g., on first method call), so the build fails to produce `.next/standalone/` output.

## Why v1.4 Worked (Hypothesis)

This exact Dockerfile was used in v1.4 for GCE deploys. Two possibilities:

1. **v1.4 had different callback-link wiring** that didn't pull `supabaseAdmin` into the build graph for static page-data collection.
2. **v1.4 builds were run with env vars present** (not inside a clean Docker context). v1.4 lived on the GCE VM where someone `docker compose build --env-file`'d with a live `.env.docker`.

The Phase 45 plan's D-15 assumption ("current Dockerfile already produces Next.js standalone output") may have been correct for the v1.4 flow but regressed as Phase 19+ added the Supabase admin singleton.

## D-15 Conflict

Phase 45 Context D-15 locks:

> No Dockerfile changes in Phase 45. Current Dockerfile already produces Next.js standalone output + runs on node:22-alpine.

D-15 also prohibits code changes (implicitly — "no Dockerfile changes" + phase scope is IaC only). The minimal fix would be:

- **Option A (code change):** Lazy-init `supabaseAdmin` via a getter function — change in `src/lib/supabase/admin.ts` + all call sites. Scope: ~10 files. **Violates phase scope** (touches app code in an IaC phase).
- **Option B (Dockerfile change):** Accept placeholder `NEXT_PUBLIC_SUPABASE_URL` as build ARG, pipe into `ENV`. **Violates D-15.**
- **Option C (build-time env):** Run `docker build --build-arg NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co ...` + add `ARG` + `ENV` lines to Dockerfile. **Violates D-15.**
- **Option D (defer):** Skip Plan 45-02 Task 2 (smoke image) and Plan 45-04 Task 2 Docker assertions. Document the Dockerfile bug and assign to Phase 47 where Cloud Run deploy will exercise the real build with real Cloud Build-injected env via CI/CD (Phase 48).

## Recommended Path — Option D

Rationale:
- Phase 45's real deliverable is IaC foundation (Artifact Registry, Secret Manager, API enablement, service accounts). Those all succeed.
- The smoke image is *auxiliary* — it verifies Docker → AR push wiring, but the push wiring is also exercised when Phase 48 CI pipeline does its first real push. Deferring to Phase 48 costs little.
- Fixing the Supabase admin singleton is a legitimate Phase 46/47 concern (Cloud Run startup needs lazy init anyway to avoid crash-looping on missing secrets).
- Option A (lazy-init) is the Right Fix but requires app-code changes outside phase scope.

## Halt Decision (auto — unattended mode)

**HALT: needs human.**

Unattended mode made the following calls:
- **Did execute:** Plan 45-01 (bootstrap + skeleton), Plan 45-02 Task 1 (registry.tf + apply), Plan 45-03 (secrets + IAM — does not depend on Docker).
- **Did NOT execute:** Plan 45-02 Task 2 (smoke image push — Docker build fails), Plan 45-04 Task 2 Docker-smoke assertions (skipped; remaining assertions for terraform/registry/secrets/IAM still run).
- **Human decision needed:** Accept Option D (defer Docker smoke to Phase 47/48) OR approve a scope-expansion to fix `src/lib/supabase/admin.ts` (Option A) in Phase 45.

## Evidence

```
$ bash iac/cloudrun/scripts/push-smoke-image.sh
...
Step 13/32 : RUN npm run build
 ---> Running in <id>
> nlm-mock-interview@1.0.0 build
> next build

Error: supabaseUrl is required.
    at module evaluation (.next/server/chunks/[root-of-the-server]__11wj.7i._.js:1:2105)
    ...
The command '/bin/sh -c npm run build' returned a non-zero code: 1
```

Exit code 1. No image produced. AR push never attempted. Registry shows no image:

```
$ gcloud artifacts docker images list us-central1-docker.pkg.dev/nlm-staging-493715/nlm-app/nlm-app --include-tags --project=nlm-staging-493715
Listing items under project nlm-staging-493715, location us-central1, repository nlm-app.
(empty)
```
