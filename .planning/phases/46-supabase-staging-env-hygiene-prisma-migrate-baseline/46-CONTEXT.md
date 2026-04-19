# Phase 46: Supabase Staging + Env Hygiene + Prisma Migrate Baseline - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning
**Mode:** `--auto`

<domain>
## Phase Boundary

Phase 46 delivers **two isolated Supabase environments** (staging + prod) with correct key separation, idempotent demo seeding of staging, wiped-and-reserved prod, `prisma migrate deploy` wiring against both `DIRECT_URL`s, and environment-scoped auth redirect allowlists.

**In scope:** Supabase staging project activation, new anon + service-role key provisioning and storage in Secret Manager (Phase 45 infra), `scripts/seed-staging.ts`, prod Supabase pre-wipe backup + wipe, `prisma migrate deploy` validation against both envs, Supabase Auth redirect URL updates, local `.env` hygiene rule (developer checkouts point at staging only).

**Out of scope:** Cloud Run services (Phase 47), GH Actions wiring of `migrate deploy` into deploy workflows (Phase 48 — Phase 46 only proves the command runs), DNS (Phase 51-52), prod data re-population (prod is intentionally empty post-wipe until real users arrive), Supabase edge functions (none in use).

</domain>

<decisions>
## Implementation Decisions

### Supabase Project Setup
- **D-01:** Staging Supabase project ref `lzuqbpqmqlvzwebliptj` — already exists per discover. Phase 46 generates its own keys via Supabase CLI / dashboard; keys go into **staging Secret Manager** (Phase 45 provisioned the secret shells).
- **D-02:** Existing "prod" Supabase project — the current dirty-data project. **Not re-provisioned.** Pre-wipe backup taken, then wiped via SQL (truncate + migration re-apply), then reserved for real production users post-cutover (Phase 52).
- **D-03:** Key population is **out-of-band via `gcloud secrets versions add`** — D-10 from Phase 45. Phase 46 documents which secret names receive which values; no plaintext ever enters Terraform state or git.

### Prod Wipe Procedure
- **D-04:** Wipe path: (1) `pg_dump` full logical backup to a local timestamped `.sql.gz`, (2) upload backup to `gs://nlm-tfstate/backups/prod-pre-wipe-YYYYMMDD.sql.gz` (reusing the already-provisioned bucket), (3) run `TRUNCATE ... CASCADE` on every app table via a dedicated `scripts/wipe-prod.ts` with explicit user confirmation prompt (no auto-run in CI), (4) re-apply all migrations clean via `prisma migrate deploy`. Keeps schema but zero rows.
- **D-05:** `scripts/wipe-prod.ts` requires an explicit `--i-understand-this-wipes-prod` flag to execute. Dry-run default shows what would be truncated.
- **D-06:** Auth-side wipe: `auth.users` rows tied to test associates are deleted via Supabase admin API (service-role). Script documents which email addresses are "real" vs "test" (test = `*@example.com`, `test-*@gmail.com` heuristic confirmed in existing `scripts/list-associates.ts` output).

### Seeder Script (`scripts/seed-staging.ts`)
- **D-07:** **Idempotent** — re-runnable without duplicates. Uses `prisma.upsert()` keyed on stable IDs (slugs) across Associates, Cohorts, CurriculumWeeks, Sessions, CodingChallenges, and gap scores.
- **D-08:** Populated entities + approximate counts:
  - 3 Cohorts (`alpha-2026`, `beta-2026`, `gamma-2026`) with startDate 2026-01-15, 2026-02-15, 2026-03-15
  - 30 Associates (10 per cohort), emails in `@example.com` domain
  - 12 CurriculumWeeks per cohort (total 36) — React, Node, SQL, Next.js, Testing, etc., each with `skillSlug` matching the existing question-bank `skillSlug` values
  - 15 Sessions across various associates, mixed `mode` (`trainer-led` + `automated`)
  - 10 CodingChallenges (drawn from v1.4 bank) with 2-3 CodingAttempts each
  - Settings singleton with `readinessThreshold = 75`
- **D-09:** Script is **deterministic** — no `faker.random()` without a fixed seed. Uses `@faker-js/faker` with `faker.seed(1337)` so re-runs produce identical data; combined with upsert = fully idempotent.
- **D-10:** Script invocation: `npx tsx scripts/seed-staging.ts` (tsx, not ts-node — matches existing script style in repo). Requires `DATABASE_URL` + `DIRECT_URL` pointing at staging.
- **D-11:** Script has a **refuse-to-run-against-prod guard**: reads `DATABASE_URL`, asserts it contains the staging project ref `lzuqbpqmqlvzwebliptj`. Exits non-zero if ref doesn't match.

### Prisma Migrate Deploy Validation
- **D-12:** Phase 46 **does NOT wire `migrate deploy` into CI** (that's Phase 48). Phase 46 proves the command works end-to-end against both envs by running it from a developer machine with the correct `DIRECT_URL` exported.
- **D-13:** Migration list is the existing 10 migrations under `prisma/migrations/` (0000 baseline through 20260416000000 add_profile); no new migrations introduced in Phase 46.
- **D-14:** Verification = `prisma migrate status` reports "Database schema is up to date" against both envs after `migrate deploy` runs clean.

### Auth Redirect Allowlists
- **D-15:** Staging Supabase Auth redirect URL allowlist: `https://staging.nextlevelmock.com/**`, `http://localhost:3000/**`.
- **D-16:** Prod Supabase Auth redirect URL allowlist: `https://nextlevelmock.com/**`, `https://www.nextlevelmock.com/**`. No localhost, no staging.
- **D-17:** Updates applied via **Supabase Management API** (PATCH `/v1/projects/{ref}/config/auth`) using the personal access token — documented in the Phase 46 runbook. Not applied via Terraform (Supabase provider has limited support for this config; API is canonical).

### Env Hygiene Rule
- **D-18:** Local `.env.local` **points at staging Supabase only**. Prod keys never leave Secret Manager.
- **D-19:** `CONTRIBUTING.md` (or new `docs/ENV-HYGIENE.md`) documents the rule. Includes a shell snippet to pull the staging keys from `gcloud secrets versions access latest --secret=DATABASE_URL --project=nlm-staging-493715` and write them to `.env.local`.
- **D-20:** Git-hook / CI check (`scripts/verify-env-hygiene.ts`): scans current branch for any `.env` file containing the **prod** project ref string and fails if found. Exit 0 otherwise.

### Claude's Discretion
- Exact SQL for `TRUNCATE` — planner picks table order to respect FKs.
- `pg_dump` flags (`--no-owner --no-acl --clean` vs. minimal).
- Whether to delete `auth.users` test rows via the Supabase admin API in the same script or a separate step.
- `CONTRIBUTING.md` vs new `docs/ENV-HYGIENE.md` — planner picks based on existing repo doc structure.

### Folded Todos
None — no backlog matched Phase 46.

</decisions>

<canonical_refs>
## Canonical References

### Milestone anchor
- `.planning/REQUIREMENTS.md` §Data — DATA-01..06 full text
- `.planning/ROADMAP.md` §v1.5 Phase 46 — success criteria 1-5
- `.planning/PROJECT.md` — v1.5 env-hygiene decision context
- `.planning/PIPELINE-DISCOVER.md` — env-hygiene rule origin (discover 2026-04-18)
- `.planning/phases/45-terraform-skeleton-artifact-registry-secret-manager/45-CONTEXT.md` §D-09 — 13-secret list (this phase uses 7 of them: DATABASE_URL, DIRECT_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY, NEXT_PUBLIC_SITE_URL, ADMIN_EMAILS)

### Existing code + migrations
- `prisma/schema.prisma` — canonical DB schema (Associate, Session, Cohort, CurriculumWeek, CodingChallenge, etc.)
- `prisma/migrations/` — 10 existing migrations (baseline + v1.1 cohorts + v1.2 email/auth + RLS + v1.3 profile + v1.4 coding)
- `scripts/list-associates.ts` — existing CLI pattern for DB scripts
- `scripts/check-schema.mjs` — existing schema-validation script
- `scripts/__tests__/` — test patterns
- `src/lib/prisma.ts` — singleton client
- `src/lib/supabase*.ts` — Supabase client shapes
- `src/lib/auth-context.tsx`, `src/middleware.ts` — auth config (redirect URL implications)

### External specs
- Supabase Management API: `PATCH /v1/projects/{ref}/config/auth` — redirect URL allowlist config
- Supabase Auth: redirect URL allowlist semantics (glob `**` vs exact)
- Prisma 7: `migrate deploy` semantics (requires `DIRECT_URL`, advisory lock, shadow DB not used)
- `pg_dump` 16 — compatible with Supabase Postgres 15+; `--clean --if-exists --no-owner --no-acl` pattern

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`scripts/list-associates.ts` / `check-schema.mjs`** — reference for Prisma + env-loading pattern; tsx invocation.
- **`@faker-js/faker`** — NOT currently in `package.json`. Phase 46 adds it as a `devDependency` (confirmed absent via grep).
- **`prisma/schema.prisma` + `prisma.config.ts`** — Transaction Pooler + `DIRECT_URL` split already handled.
- **Existing migrations are idempotent** — `0000_baseline` uses `IF NOT EXISTS` + DO-block FK guards per CLAUDE.md notes.

### Established Patterns
- Scripts run via `npx tsx <path>` (matches existing `abuse-test-coding.ts`, `load-test-coding.ts`).
- Prisma client singleton from `src/lib/prisma.ts`.
- `.env.local` is the developer-machine file; gitignored.
- Tests live in `scripts/__tests__/` with Vitest.

### Integration Points
- Plan 47 will reference seeded data (staging smoke test).
- Plan 48 CI will reuse `prisma migrate deploy` command proven in Phase 46.
- Plan 51 (prod deploy) will reuse the same `DIRECT_URL` pattern against the prod Secret Manager values.

</code_context>

<specifics>
## Specific Ideas

- User explicitly wants prod Supabase **wiped clean + reserved** — not decommissioned. This project becomes the real prod once real users arrive post-cutover (Phase 52).
- Seeder must be **re-runnable on every staging redeploy** without duplicating rows — upsert-only.
- `@faker-js/faker` chosen over `@ngneat/falso` because it's the de-facto TypeScript standard with better type support.
- **Never set `DATABASE_URL=` to prod in `.env.local`** — D-18. Prod keys live only in Cloud Run env-var mounts (set up in Phase 47).

</specifics>

<deferred>
## Deferred Ideas

- **Automated backup rotation** (retain last 30 days of `pre-wipe` backups) — out of scope; one-time wipe only.
- **Supabase Realtime subscriptions for trainer dashboard** — deferred to v1.6+.
- **Prod data migration from v0.1 GCE to new prod Supabase** — there is no data to migrate (v0.1 was never meant to hold durable prod data; public-interview sessions are transient). Confirmed with discover notes.
- **Automated diff-detection when staging/prod schemas drift** — Phase 48 observability adds the dashboard; drift-alert deferred to v1.6.
- **Supabase connection pool tuning beyond existing `connection_limit=5`** — wait for Phase 49 k6 data.

### Reviewed Todos (not folded)
None.

</deferred>

---

*Phase: 46-supabase-staging-env-hygiene-prisma-migrate-baseline*
*Context gathered: 2026-04-18 (auto mode)*
