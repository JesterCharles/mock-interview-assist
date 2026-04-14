---
phase: 01-db-foundation
plan: "02"
subsystem: infrastructure
tags: [docker, prisma, next.js, standalone, build]
dependency_graph:
  requires: [01-01]
  provides: [docker-prisma-binary-inclusion, next-standalone-build]
  affects: [all-phases-using-docker]
tech_stack:
  added: [dotenv]
  patterns: [outputFileTracingIncludes, transpilePackages, outputFileTracingRoot, prisma-generate-in-builder]
key_files:
  created: []
  modified:
    - next.config.ts
    - Dockerfile
    - docker-compose.yml
    - package.json
    - package-lock.json
decisions:
  - "Added transpilePackages for @react-pdf/renderer to fix pre-existing ESM/webpack build failure (Rule 3)"
  - "Added outputFileTracingRoot to prevent nested standalone path in git worktree environments"
  - "outputFileTracingIncludes uses three paths: prisma, @prisma, .bin — required for binary discovery"
  - "HEALTHCHECK start-period set to 15s to allow Prisma cold-start Supabase connection"
  - "dotenv installed as runtime dep (required by prisma.config.ts during prisma generate)"
metrics:
  duration: "~20 minutes"
  completed: "2026-04-13"
  tasks_completed: 2
  tasks_total: 3
  files_modified: 5
---

# Phase 01 Plan 02: Docker + Prisma Build Integration Summary

**One-liner:** Next.js standalone build now includes Prisma binaries via `outputFileTracingIncludes`, Dockerfile generates Prisma client in builder stage, and HEALTHCHECK uses `/api/health` endpoint.

## What Was Built

This plan closes the Docker integration gap for Prisma 7. Without these changes, a production Docker container would crash on the first database operation because Prisma's native binaries are excluded from Next.js standalone output by default.

### Changes Made

**`next.config.ts`:**
- Added `outputFileTracingIncludes` with three paths (`prisma/**/*`, `@prisma/**/*`, `.bin/**/*`) to force Prisma binaries into the standalone trace (PERSIST-06)
- Added `outputFileTracingRoot: path.join(__dirname)` to prevent workspace root misdetection in git worktree environments
- Added `transpilePackages: ['@react-pdf/renderer']` to fix pre-existing ESM build failure (deviation, Rule 3)

**`Dockerfile`:**
- Added `RUN npx prisma generate` in the builder stage BEFORE `RUN npm run build` — Prisma 7 no longer auto-generates on migrate commands, so this is mandatory
- Updated HEALTHCHECK from `http://localhost:3000` to `http://localhost:3000/api/health` (D-02)
- Increased HEALTHCHECK `start-period` from 5s to 15s to allow Prisma's first Supabase cold-start connection

**`docker-compose.yml`:**
- Updated healthcheck test URL to `http://localhost:3000/api/health`
- Updated `start_period` from 10s to 15s to match Dockerfile

**`package.json` / `package-lock.json`:**
- Installed `dotenv` (required by `prisma.config.ts` at `prisma generate` time — `import 'dotenv/config'`)

### Build Verification

`npm run build` passes with exit code 0. The standalone output at `.next/standalone/node_modules/` contains:
- `@prisma/` — engine binaries, adapter packages
- `prisma/` — CLI package

The generated Prisma client is also present at `.next/standalone/src/generated/prisma/`.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Configure next.config.ts, Dockerfile, docker-compose.yml | c2968ae | next.config.ts, Dockerfile, docker-compose.yml |
| 2 | Verify Next.js build with Prisma integration | 90749ee | next.config.ts, package.json, package-lock.json |
| 3 | Docker build + health endpoint verification | checkpoint | human-verify pending |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Pre-existing ESM build failure for @react-pdf/renderer**
- **Found during:** Task 2 (npm run build attempt)
- **Issue:** `@react-pdf/renderer` v4 is ESM-only. With `--webpack` flag, webpack cannot bundle it without `transpilePackages`. Error: `Module not found: ESM packages (@react-pdf/renderer) need to be imported`. This failure existed before any Plan 02 changes (confirmed by reverting next.config.ts and re-running build).
- **Fix:** Added `transpilePackages: ['@react-pdf/renderer']` to `next.config.ts`
- **Files modified:** `next.config.ts`
- **Commit:** 90749ee

**2. [Rule 3 - Blocking] Workspace root misdetection in git worktree**
- **Found during:** Task 2 (verifying standalone output paths)
- **Issue:** Next.js detects multiple `package-lock.json` files (worktree + parent repo) and selects the parent repo as workspace root, causing standalone output to be nested at `.next/standalone/.claude/worktrees/agent-a638aa67/` instead of `.next/standalone/`. This would cause incorrect Docker COPY paths.
- **Fix:** Added `outputFileTracingRoot: path.join(__dirname)` to `next.config.ts` to anchor tracing to the project directory
- **Files modified:** `next.config.ts`
- **Commit:** 90749ee

**3. [Rule 3 - Blocking] Missing dotenv dependency**
- **Found during:** Task 2 (running prisma generate locally)
- **Issue:** `prisma.config.ts` has `import 'dotenv/config'` but `dotenv` was not in `package.json`. `npx prisma generate` failed with `Cannot find module 'dotenv/config'`.
- **Fix:** `npm install dotenv`
- **Files modified:** `package.json`, `package-lock.json`
- **Commit:** 90749ee

## Task 3: Checkpoint Pending

Task 3 is a `checkpoint:human-verify` requiring Docker build and container runtime verification:

```bash
docker compose up --build -d
# wait ~15 seconds
curl http://localhost/api/health
# expected: {"status":"ok","db":"connected"}
docker compose ps  # should show (healthy)
docker compose down
```

Prerequisite: `.env.docker` must have `DATABASE_URL` (port 6543) and `DIRECT_URL` (port 5432) from Supabase dashboard.

## Known Stubs

None — this plan modifies infrastructure config only, no UI or data rendering.

## Threat Flags

No new threat surface introduced. All threat mitigations from the plan's STRIDE register are implemented:
- T-01-05: Credentials provided via `env_file` at runtime, not baked into image
- T-01-06: `outputFileTracingIncludes` with 3 paths ensures binary inclusion
- T-01-07: No `prisma migrate` in Dockerfile CMD/entrypoint (confirmed by grep)

## Self-Check: PASSED

- `next.config.ts` contains `outputFileTracingIncludes` — confirmed
- `Dockerfile` contains `RUN npx prisma generate` — confirmed
- `Dockerfile` HEALTHCHECK uses `/api/health` — confirmed
- `.next/standalone/node_modules/@prisma/` exists — confirmed
- `.next/standalone/node_modules/prisma/` exists — confirmed
- No `prisma migrate` in Dockerfile — confirmed
- Commits c2968ae and 90749ee exist — confirmed
