# Phase 46: Supabase Staging + Env Hygiene + Prisma Migrate Baseline - Research

**Researched:** 2026-04-18
**Domain:** Supabase project isolation, prod data wipe, Prisma migrate deploy, Supabase Management API, idempotent seeding with Faker
**Confidence:** HIGH (all tool invocations verified against installed versions, repo patterns, and live npm registry; Management API field names sourced from upstream GoTrue OSS)

## Summary

Phase 46 is a two-environment plumbing phase. The staging Supabase project (`lzuqbpqmqlvzwebliptj`) and existing-but-dirty prod project each need: (a) correct keys landing in the correct Secret Manager shell (Phase 45 provisioned the 13 shells × 2 projects); (b) a `prisma migrate deploy` run against `DIRECT_URL` (port 5432, not the pooler) that reports "no pending migrations"; (c) redirect allowlists patched via Supabase Management API — not Terraform; (d) a git-hook-grade guard that prevents prod refs from ever landing in `.env.local`. In addition, prod must be backed up with `pg_dump` (direct connection, not pooler), truncated via a guarded script, and left empty. Staging is re-seeded idempotently via `@faker-js/faker` + `prisma.upsert()`.

Two hazards dominate: (1) **pooler vs direct** — `prisma migrate deploy` and `pg_dump` must both use the 5432 direct connection; the 6543 transaction pooler breaks advisory locks (Prisma) and can drop long queries (pg_dump). (2) **`auth.users` wipe path** — Supabase's `auth` schema is protected; `TRUNCATE auth.users` from psql will fail or corrupt the cascade chain. Use the admin API (`supabase.auth.admin.deleteUser(id)`) instead, which cleanly triggers session invalidation and RLS reverberations.

**Primary recommendation:** One root `scripts/seed-staging.ts` (faker seed 1337 + `prisma.upsert()` keyed on slug), one shared `scripts/lib/assert-staging-env.ts` guard, one `scripts/wipe-prod.ts` (truncate order derived from schema FKs), one runbook (`docs/runbooks/phase-46-supabase-wipe.md`) that captures every Management API curl + `gcloud secrets versions add` + `pg_dump` command. Ship `scripts/verify-env-hygiene.ts` as a CI check that fails when the prod project ref appears in any `.env*` file on the current branch.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Supabase Project Setup**
- **D-01** — Staging Supabase project ref `lzuqbpqmqlvzwebliptj` — already exists per discover. Phase 46 generates its own keys via Supabase CLI / dashboard; keys go into **staging Secret Manager** (Phase 45 provisioned the secret shells).
- **D-02** — Existing "prod" Supabase project — the current dirty-data project. **Not re-provisioned.** Pre-wipe backup taken, then wiped via SQL (truncate + migration re-apply), then reserved for real production users post-cutover (Phase 52).
- **D-03** — Key population is **out-of-band via `gcloud secrets versions add`** — D-10 from Phase 45. Phase 46 documents which secret names receive which values; no plaintext ever enters Terraform state or git.

**Prod Wipe Procedure**
- **D-04** — Wipe path: (1) `pg_dump` full logical backup to a local timestamped `.sql.gz`, (2) upload backup to `gs://nlm-tfstate/backups/prod-pre-wipe-YYYYMMDD.sql.gz` (reusing the already-provisioned bucket), (3) run `TRUNCATE ... CASCADE` on every app table via a dedicated `scripts/wipe-prod.ts` with explicit user confirmation prompt (no auto-run in CI), (4) re-apply all migrations clean via `prisma migrate deploy`. Keeps schema but zero rows.
- **D-05** — `scripts/wipe-prod.ts` requires an explicit `--i-understand-this-wipes-prod` flag to execute. Dry-run default shows what would be truncated.
- **D-06** — Auth-side wipe: `auth.users` rows tied to test associates are deleted via Supabase admin API (service-role). Script documents which email addresses are "real" vs "test" (test = `*@example.com`, `test-*@gmail.com` heuristic confirmed in existing `scripts/list-associates.ts` output).

**Seeder Script (`scripts/seed-staging.ts`)**
- **D-07** — **Idempotent** — re-runnable without duplicates. Uses `prisma.upsert()` keyed on stable IDs (slugs) across Associates, Cohorts, CurriculumWeeks, Sessions, CodingChallenges, and gap scores.
- **D-08** — Populated entities + approximate counts:
  - 3 Cohorts (`alpha-2026`, `beta-2026`, `gamma-2026`) with startDate 2026-01-15, 2026-02-15, 2026-03-15
  - 30 Associates (10 per cohort), emails in `@example.com` domain
  - 12 CurriculumWeeks per cohort (total 36) — React, Node, SQL, Next.js, Testing, etc., each with `skillSlug` matching existing question-bank `skillSlug` values
  - 15 Sessions across various associates, mixed `mode` (`trainer-led` + `automated`)
  - 10 CodingChallenges (drawn from v1.4 bank) with 2-3 CodingAttempts each
  - Settings singleton with `readinessThreshold = 75`
- **D-09** — Script is **deterministic** — no `faker.random()` without a fixed seed. Uses `@faker-js/faker` with `faker.seed(1337)` so re-runs produce identical data; combined with upsert = fully idempotent.
- **D-10** — Script invocation: `npx tsx scripts/seed-staging.ts` (tsx, not ts-node — matches existing script style in repo). Requires `DATABASE_URL` + `DIRECT_URL` pointing at staging.
- **D-11** — Script has a **refuse-to-run-against-prod guard**: reads `DATABASE_URL`, asserts it contains the staging project ref `lzuqbpqmqlvzwebliptj`. Exits non-zero if ref doesn't match.

**Prisma Migrate Deploy Validation**
- **D-12** — Phase 46 **does NOT wire `migrate deploy` into CI** (that's Phase 48). Phase 46 proves the command works end-to-end against both envs by running it from a developer machine with the correct `DIRECT_URL` exported.
- **D-13** — Migration list is the existing 10 migrations under `prisma/migrations/` (0000 baseline through 20260418000000 add_gapscore_prev_score); no new migrations introduced in Phase 46. (Phase 45 research referenced the `add_profile` migration as the tail; a fresh ls on 2026-04-18 shows `20260418000000_add_gapscore_prev_score` as the current tail — no functional impact on Phase 46, but planner should cite the exact list from `prisma/migrations/` at plan time.)
- **D-14** — Verification = `prisma migrate status` reports "Database schema is up to date" against both envs after `migrate deploy` runs clean.

**Auth Redirect Allowlists**
- **D-15** — Staging Supabase Auth redirect URL allowlist: `https://staging.nextlevelmock.com/**`, `http://localhost:3000/**`.
- **D-16** — Prod Supabase Auth redirect URL allowlist: `https://nextlevelmock.com/**`, `https://www.nextlevelmock.com/**`. No localhost, no staging.
- **D-17** — Updates applied via **Supabase Management API** (PATCH `/v1/projects/{ref}/config/auth`) using the personal access token — documented in the Phase 46 runbook. Not applied via Terraform (Supabase provider has limited support for this config; API is canonical).

**Env Hygiene Rule**
- **D-18** — Local `.env.local` **points at staging Supabase only**. Prod keys never leave Secret Manager.
- **D-19** — `CONTRIBUTING.md` (or new `docs/ENV-HYGIENE.md`) documents the rule. Includes a shell snippet to pull the staging keys from `gcloud secrets versions access latest --secret=DATABASE_URL --project=nlm-staging-493715` and write them to `.env.local`.
- **D-20** — Git-hook / CI check (`scripts/verify-env-hygiene.ts`): scans current branch for any `.env` file containing the **prod** project ref string and fails if found. Exit 0 otherwise.

### Claude's Discretion

- Exact SQL for `TRUNCATE` — planner picks table order to respect FKs.
- `pg_dump` flags (`--no-owner --no-acl --clean` vs. minimal).
- Whether to delete `auth.users` test rows via the Supabase admin API in the same script or a separate step.
- `CONTRIBUTING.md` vs new `docs/ENV-HYGIENE.md` — planner picks based on existing repo doc structure.

### Deferred Ideas (OUT OF SCOPE)

- **Automated backup rotation** (retain last 30 days of `pre-wipe` backups) — out of scope; one-time wipe only.
- **Supabase Realtime subscriptions for trainer dashboard** — deferred to v1.6+.
- **Prod data migration from v0.1 GCE to new prod Supabase** — there is no data to migrate (v0.1 was never meant to hold durable prod data; public-interview sessions are transient). Confirmed with discover notes.
- **Automated diff-detection when staging/prod schemas drift** — Phase 48 observability adds the dashboard; drift-alert deferred to v1.6.
- **Supabase connection pool tuning beyond existing `connection_limit=5`** — wait for Phase 49 k6 data.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-01 | Staging Supabase project provisioned with own keys; recorded in Secret Manager + local `.env.local`; prod keys stay in prod Secret Manager | §Supabase Key Rotation + §gcloud Secrets Population — dashboard rotation flow + exact `gcloud secrets versions add` commands documented |
| DATA-02 | Existing prod wiped; backup confirmed before wipe | §pg_dump Against Supabase + §TRUNCATE Order Derivation + §Auth.users Wipe Path |
| DATA-03 | Staging seeded with demo data via idempotent `scripts/seed-staging.ts` | §Seeder Pattern (Faker + Prisma upsert) + §Refuse-to-Run-Against-Prod Guard |
| DATA-04 | `prisma migrate deploy` runs clean against both envs using `DIRECT_URL` | §Prisma Migrate Deploy on Supabase (advisory lock requires direct connection) |
| DATA-05 | Local `.env` points at staging only; prod keys never on dev machines; documented | §Env Hygiene Enforcement + `docs/ENV-HYGIENE.md` draft |
| DATA-06 | Supabase Auth redirect URLs updated per env via Management API | §Supabase Management API (PATCH /v1/projects/{ref}/config/auth with `site_url` + `uri_allow_list`) |

</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **GSD Workflow Enforcement** — no Edit/Write outside a GSD command. All Phase 46 tasks run inside `/gsd-execute-phase` (superpowers TDD worktrees).
- **Codex owns code review** — no self-review. Seeder + wipe + guard scripts reviewed by Codex before merge.
- **Testing hierarchy** — Vitest for all new scripts; unit tests in `scripts/__tests__/`.
- **Health stack** — `npx tsc --noEmit` + `npm run lint` + `npm run test` must pass.
- **Prisma client import path** — the generated client lives at `src/generated/prisma/` (per `schema.prisma` `generator.output = "../src/generated/prisma"`). The canonical singleton is `src/lib/prisma.ts` which wraps `PrismaPg` + `pg.Pool`. New scripts MUST import `prisma` from `../src/lib/prisma.js` (the path alias `@/generated/prisma` works only inside `src/`; tsx respects `.js` extension in source per existing scripts).
- **Script invocation** — `npx tsx scripts/<name>.ts` matches the existing pattern (`load-test-coding`, `abuse-test-coding`, `seed-demo-data`, `seed-coding-demo`, `wipe-demo-data`, `list-associates`).
- **No new dev deps without reason** — `@faker-js/faker` is legitimately new; `dotenv`, `pg`, `@prisma/adapter-pg`, `@supabase/supabase-js` already present.
- **DESIGN.md** — N/A, no UI surface.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@faker-js/faker` | **10.4.0** (2026-04-12) | Deterministic synthetic data for seeder | [VERIFIED: `npm view @faker-js/faker version` → 10.4.0]. Active successor to the dead `faker` package. Engines `node >=20.19`, satisfied by project's node 24. Support `faker.seed(N)` for repeatable output (D-09). |
| `prisma` / `@prisma/client` | 7.7.0 | Schema + client (existing) | [VERIFIED: `package.json`]. Migrate deploy CLI ships with `prisma`. |
| `@prisma/adapter-pg` | 7.7.0 | pg driver adapter (existing) | [VERIFIED: `package.json`]. Already pattern in `src/lib/prisma.ts` and `scripts/seed-coding-demo.ts`. |
| `pg` | 8.20.0 (transitively via adapter) | Direct node-postgres for `DIRECT_URL` queries (`TRUNCATE`, `SELECT COUNT`) | [VERIFIED: used by `src/lib/prisma.ts`]. Script can spin a short-lived `Pool({ max: 2 })` against `DIRECT_URL` for raw SQL during wipe. |
| `@supabase/supabase-js` | ^2.103.2 | Admin client for `auth.users` deletion (D-06) | [VERIFIED: `package.json`]. `createClient(url, serviceKey, { auth: { persistSession: false } })` — mirrors `src/lib/supabase/admin.ts`. |
| `dotenv` | ^17.4.2 | Env loading in scripts (existing) | [VERIFIED: `package.json`]. Pattern: `import 'dotenv/config'` at top of script. |
| `tsx` | ^4.21.0 | TypeScript script runner (existing) | [VERIFIED: `package.json`]. Invoked as `npx tsx scripts/<name>.ts`. |

### Supporting (CLI tools invoked out-of-band by the runbook)

| Tool | Version | Purpose | When Used |
|------|---------|---------|-----------|
| `gcloud` | 547.0.0 (from Phase 45 local probe) | `secrets versions access/add` for each of the 5 Supabase secrets × 2 projects | Runbook Phase A + Phase E |
| `gsutil` | 5.35 | Upload pre-wipe backup to `gs://nlm-tfstate/backups/` | Runbook Phase B |
| `pg_dump` | **16.x expected** (Postgres 16 client) | Full logical backup of prod DB | [ASSUMED] local pg_dump not installed on Jester's dev machine per probe. Plan must include `brew install postgresql@16` (or `postgresql-client@16`) as a preflight step. Supabase runs Postgres 15, and pg_dump ≥ 15 is required to dump pg15 cleanly. |
| `curl` + `jq` | macOS system | Management API PATCH for redirect allowlist (D-17) | Runbook Phase D |
| Supabase CLI | not required | Alternative for `db dump` | Skipped — raw `pg_dump` with explicit `--schema=public` matches our needs. Supabase CLI's filtered dump excludes `auth` by default, which we want to capture for a clean rollback. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@faker-js/faker` 10.x | `@ngneat/falso` 7.x | Falso has tree-shakable imports but smaller community + fewer locales; CONTEXT.md D-09 locks Faker. |
| Raw `pg_dump` via direct URL | `supabase db dump` | Supabase CLI's filtering hides `auth.*` schemas — undesired here; we want an auth-inclusive snapshot for rollback. Raw `pg_dump` with `--schema=public --schema=auth` gives explicit control. |
| `@supabase/supabase-js` admin client for `auth.users` delete | `DELETE FROM auth.users WHERE email LIKE '%@example.com'` via psql | SQL route bypasses auth-side cascade hooks (session revocation, refresh-token invalidation, identity cleanup). Admin API is canonical. [CITED: Supabase docs — Delete a user via admin API] |
| `prisma migrate deploy` with pooler URL | — | Broken by design: the transaction pooler drops `pg_advisory_lock`, which Prisma uses to serialize concurrent migrate runs. Must use `DIRECT_URL`. [CITED: Prisma + PgBouncer troubleshooting] |
| Terraform Supabase provider for redirect URLs | — | Current community provider (`supabase/supabase` 1.x) has *no* resource for auth redirect config. Management API is the only supported surface. D-17 locks the call. |

### Installation

```bash
npm install --save-dev @faker-js/faker@^10.4.0
```

(No runtime deps — faker is only used by the `scripts/seed-staging.ts` harness.)

**Version verification — ran 2026-04-18:**
```bash
npm view @faker-js/faker version     # → 10.4.0  (published 2026-04-12)
npm view @faker-js/faker engines     # → { node: '^20.19 || ^22.13 || ^23.5 || >=24.0' }
npm view prisma version              # → 7.7.0 (already pinned)
pg_dump --version                    # → NOT INSTALLED locally — plan preflight step
```

## Architecture Patterns

### Recommended Scripts + Docs Layout

```
scripts/
├── lib/
│   └── assert-staging-env.ts           # SHARED guard — both seed-staging and prod assertions import this
├── seed-staging.ts                     # D-07..D-11 — idempotent Faker + upsert seeder
├── wipe-prod.ts                        # D-04..D-06 — dry-run default + --i-understand-this-wipes-prod
├── verify-env-hygiene.ts               # D-20 — scans .env* for prod ref
└── __tests__/
    ├── seedStagingIdempotency.test.ts  # mocks Prisma; asserts upsert shape + faker seed determinism
    ├── assertStagingEnv.test.ts        # unit-tests the guard regex
    └── verifyEnvHygiene.test.ts        # fixture-based — passes/fails on sample .env content

docs/
├── ENV-HYGIENE.md                      # D-19 — the developer-facing rule + gcloud snippets
└── runbooks/
    ├── coding-stack.md                 # existing
    └── phase-46-supabase-wipe.md       # NEW — every curl/gcloud/pg_dump/psql command

prisma/
├── schema.prisma                       # UNCHANGED
└── migrations/                         # UNCHANGED — no new migrations in Phase 46
```

### Pattern 1: Shared env-guard helper

```typescript
// scripts/lib/assert-staging-env.ts
// Shared by seed-staging.ts and (inverted) by wipe-prod.ts.

const STAGING_REF = 'lzuqbpqmqlvzwebliptj';

/**
 * Refuses to proceed unless DATABASE_URL contains the staging project ref.
 * Throws a loud error — exits non-zero when called from a top-level script.
 * [VERIFIED: pattern — existing `abuse-test-coding.ts` uses the same `requireEnv` shape]
 */
export function assertStagingDatabase(): void {
  const url = process.env.DATABASE_URL ?? '';
  if (!url.includes(STAGING_REF)) {
    throw new Error(
      `[assert-staging] REFUSING to run: DATABASE_URL does not reference staging ref "${STAGING_REF}".\n` +
      `  Got: ${maskUrl(url)}\n` +
      `  Fix: export DATABASE_URL + DIRECT_URL from the staging Secret Manager project.\n` +
      `  See docs/ENV-HYGIENE.md.`
    );
  }
}

export function assertProdDatabase(expectedProdRef: string): void {
  const url = process.env.DATABASE_URL ?? '';
  if (url.includes(STAGING_REF)) {
    throw new Error(
      `[assert-prod] REFUSING to run against STAGING. This is the prod-wipe path; DATABASE_URL must point at prod.`
    );
  }
  if (!url.includes(expectedProdRef)) {
    throw new Error(
      `[assert-prod] DATABASE_URL does not reference the expected prod project ref "${expectedProdRef}".`
    );
  }
}

function maskUrl(url: string): string {
  return url.replace(/:[^:@]*@/, ':***@');
}
```

### Pattern 2: Faker-deterministic seeder (copy-paste skeleton for the planner)

```typescript
// scripts/seed-staging.ts
//
// Reference: [VERIFIED — existing scripts/seed-demo-data.ts uses the same
// `prisma` singleton from `../src/lib/prisma.js`]. This seeder is different
// in that it is authoritative for the *whole* staging DB (not a demo-prefixed
// subset), and uses @faker-js/faker 10.x for deterministic identities.

import 'dotenv/config';
import { faker } from '@faker-js/faker';
import { prisma } from '../src/lib/prisma.js';
import { assertStagingDatabase } from './lib/assert-staging-env.js';

// D-11 — hard guard.
assertStagingDatabase();

// D-09 — deterministic.  Must run BEFORE any faker.* call.
faker.seed(1337);

const COHORT_SPECS = [
  { slug: 'alpha-2026', name: 'Alpha 2026', startDate: new Date('2026-01-15'), weeks: 12 },
  { slug: 'beta-2026',  name: 'Beta 2026',  startDate: new Date('2026-02-15'), weeks: 12 },
  { slug: 'gamma-2026', name: 'Gamma 2026', startDate: new Date('2026-03-15'), weeks: 12 },
] as const;

// 12-week skill rotation — skillSlug values MUST match the question-bank
// `skillSlug` allowlist used in CurriculumWeek lookups (planner: cross-check
// with src/lib/coding-bank-schemas.ts CODING_LANGUAGES + existing curriculum
// records).
const SKILLS_12 = [
  { name: 'React',       slug: 'react',       topics: ['hooks', 'state', 'rendering'] },
  { name: 'TypeScript',  slug: 'typescript',  topics: ['generics', 'narrowing', 'utility-types'] },
  { name: 'Node',        slug: 'node',        topics: ['async', 'event-loop', 'streams'] },
  { name: 'Next.js',     slug: 'nextjs',      topics: ['routing', 'rsc', 'caching'] },
  { name: 'SQL',         slug: 'sql',         topics: ['joins', 'indexing', 'transactions'] },
  { name: 'Testing',     slug: 'testing',     topics: ['unit', 'integration', 'mocks'] },
  { name: 'Python',      slug: 'python',      topics: ['stdlib', 'typing', 'asyncio'] },
  { name: 'JavaScript',  slug: 'javascript',  topics: ['closures', 'promises', 'iterators'] },
  { name: 'Java',        slug: 'java',        topics: ['oop', 'streams', 'generics'] },
  { name: 'System Design', slug: 'system-design', topics: ['caching', 'sharding', 'queues'] },
  { name: 'API Testing', slug: 'api-testing', topics: ['rest', 'auth', 'contracts'] },
  { name: 'CSS',         slug: 'css',         topics: ['flex', 'grid', 'specificity'] },
] as const;

async function upsertCohort(spec: typeof COHORT_SPECS[number]) {
  // Cohort has no @unique beyond id — use findFirst+update/create pattern
  // (same as scripts/seed-demo-data.ts) for idempotent upsert-by-name.
  const existing = await prisma.cohort.findFirst({ where: { name: spec.name } });
  const cohort = existing
    ? await prisma.cohort.update({
        where: { id: existing.id },
        data: { startDate: spec.startDate, description: `Staging seed: ${spec.slug}` },
      })
    : await prisma.cohort.create({
        data: { name: spec.name, startDate: spec.startDate, description: `Staging seed: ${spec.slug}` },
      });

  // Curriculum weeks use @@unique([cohortId, weekNumber]) — true upsert.
  for (let i = 0; i < spec.weeks; i++) {
    const skill = SKILLS_12[i % SKILLS_12.length];
    await prisma.curriculumWeek.upsert({
      where: { cohortId_weekNumber: { cohortId: cohort.id, weekNumber: i + 1 } },
      update: { skillName: skill.name, skillSlug: skill.slug, topicTags: [...skill.topics] },
      create: {
        cohortId: cohort.id,
        weekNumber: i + 1,
        skillName: skill.name,
        skillSlug: skill.slug,
        topicTags: [...skill.topics],
        startDate: new Date(spec.startDate.getTime() + i * 7 * 86_400_000),
      },
    });
  }
  return cohort;
}

async function upsertAssociate(cohortId: number, cohortSlug: string, i: number) {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const slug = `staging-${cohortSlug}-assoc-${i.toString().padStart(2, '0')}`;
  const email = `${slug}@example.com`; // D-06 test-heuristic compliant
  return prisma.associate.upsert({
    where: { slug },
    update: { displayName: `${firstName} ${lastName}`, email, cohortId },
    create: { slug, displayName: `${firstName} ${lastName}`, email, cohortId },
  });
}

async function upsertSession(associateId: number, cohortId: number, ix: number) {
  const id = `staging-sess-${associateId}-${ix}`; // Session.id has no @unique beyond PK; composite stable
  const score = faker.number.float({ min: 50, max: 95, fractionDigits: 1 });
  return prisma.session.upsert({
    where: { id },
    update: { overallTechnicalScore: score },
    create: {
      id,
      candidateName: null,
      interviewerName: 'Staging Seed',
      date: new Date().toISOString().split('T')[0],
      status: 'completed',
      questionCount: 6,
      selectedWeeks: [1, 2, 3, 4, 5, 6],
      overallTechnicalScore: score,
      overallSoftSkillScore: faker.number.float({ min: 55, max: 90, fractionDigits: 1 }),
      questions: [],
      starterQuestions: [],
      assessments: {},
      techMap: { 1: 'React', 2: 'TypeScript', 3: 'Node', 4: 'SQL', 5: 'Testing', 6: 'Next.js' },
      associateId,
      cohortId,
      mode: ix % 2 === 0 ? 'trainer-led' : 'automated',
      readinessRecomputeStatus: 'done',
    },
  });
}

async function upsertSettings() {
  // Settings is a singleton (id=1 per schema).
  await prisma.settings.upsert({
    where: { id: 1 },
    update: { readinessThreshold: 75 },
    create: { id: 1, readinessThreshold: 75 },
  });
}

async function main() {
  const counts = { cohorts: 0, associates: 0, weeks: 0, sessions: 0 };

  for (const spec of COHORT_SPECS) {
    const cohort = await upsertCohort(spec);
    counts.cohorts += 1;
    counts.weeks += spec.weeks;

    for (let i = 0; i < 10; i++) {
      const assoc = await upsertAssociate(cohort.id, spec.slug, i);
      counts.associates += 1;

      // ~0.5 sessions per associate on average → 15 total across 30
      if (i % 2 === 0) {
        await upsertSession(assoc.id, cohort.id, Math.floor(i / 2));
        counts.sessions += 1;
      }
    }
  }

  await upsertSettings();

  // CodingChallenges — upsert keyed on @unique slug (schema confirmed).
  // Draw 10 from the v1.4 bank — planner task: pick 10 stable slugs from
  // the question-bank GitHub repo and embed here OR leave as a follow-up
  // task that reads from the bank manifest.

  console.log('[seed-staging] Done:', counts);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('[seed-staging] FATAL:', err);
  await prisma.$disconnect();
  process.exit(1);
});
```

### Pattern 3: Prod wipe script (dry-run default + explicit flag)

```typescript
// scripts/wipe-prod.ts
import 'dotenv/config';
import { Pool } from 'pg';
import { createClient } from '@supabase/supabase-js';
import { assertProdDatabase } from './lib/assert-staging-env.js';

const PROD_REF = process.env.PROD_SUPABASE_REF ?? ''; // injected by runbook

const ARG_LIVE = '--i-understand-this-wipes-prod';
const LIVE = process.argv.includes(ARG_LIVE);

// Truncate order — derived from prisma/schema.prisma FK graph (see §TRUNCATE Order).
// Children first; cascade handles any leaves we forget.
const TRUNCATE_ORDER = [
  '"CodingSkillSignal"',
  '"CodingAttempt"',
  '"CodingTestCase"',
  '"GapScore"',
  '"Session"',          // FKs to Associate + Cohort
  '"AuthEvent"',        // no FKs, included for completeness
  '"Profile"',          // no FKs to app tables
  '"CodingChallenge"',  // FKs to Cohort (SetNull) — truncate BEFORE Cohort
  '"CurriculumWeek"',   // Cohort parent
  '"Associate"',        // Cohort parent — FK to Cohort is SetNull
  '"Cohort"',
  '"HealthCheck"',
  '"Settings"',
  // DO NOT include _prisma_migrations — schema must remain applied.
];

async function main() {
  assertProdDatabase(PROD_REF);

  const pool = new Pool({ connectionString: process.env.DIRECT_URL, max: 2 });

  if (!LIVE) {
    console.log('[wipe-prod] DRY RUN — no changes will be made.');
    console.log('[wipe-prod] Would TRUNCATE (order):', TRUNCATE_ORDER.join(' -> '));
    for (const table of TRUNCATE_ORDER) {
      const r = await pool.query(`SELECT COUNT(*)::int AS c FROM ${table}`);
      console.log(`  ${table.padEnd(22)} rows=${r.rows[0].c}`);
    }
    console.log(`[wipe-prod] To execute, re-run with ${ARG_LIVE}`);
    await pool.end();
    return;
  }

  console.log('[wipe-prod] LIVE RUN — this wipes prod.');
  // Single transaction; CASCADE so any schema change we missed still works.
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const table of TRUNCATE_ORDER) {
      await client.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
      console.log(`  wiped ${table}`);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  // auth.users wipe — admin API, NOT SQL (D-06).
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  for (const u of data.users) {
    if (!u.email) continue;
    // Heuristic per D-06
    if (u.email.endsWith('@example.com') || u.email.startsWith('test-')) {
      await supabase.auth.admin.deleteUser(u.id);
      console.log(`  deleted auth user ${u.email}`);
    } else {
      console.warn(`  PRESERVED auth user ${u.email} (does not match test heuristic)`);
    }
  }
  await pool.end();
  console.log('[wipe-prod] Done.');
}

main().catch((err) => {
  console.error('[wipe-prod] FATAL:', err);
  process.exit(1);
});
```

### Pattern 4: Env-hygiene verifier

```typescript
// scripts/verify-env-hygiene.ts
// D-20 — exit non-zero if any tracked .env file contains the prod ref.
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

const PROD_REF = process.env.PROD_SUPABASE_REF
  ?? (() => { throw new Error('Set PROD_SUPABASE_REF env var'); })();

const ENV_GLOBS = ['.env', '.env.local', '.env.docker', '.env.docker.example', '.env.example', '.env.judge0', '.env.judge0.example'];

let violations = 0;
for (const fname of ENV_GLOBS) {
  const fp = path.resolve(process.cwd(), fname);
  if (!fs.existsSync(fp)) continue;
  const body = fs.readFileSync(fp, 'utf8');
  if (body.includes(PROD_REF)) {
    console.error(`[env-hygiene] VIOLATION: ${fname} contains prod ref "${PROD_REF}"`);
    violations += 1;
  }
}

if (violations > 0) {
  console.error(`[env-hygiene] FAIL — ${violations} file(s) reference prod.`);
  process.exit(1);
}
console.log('[env-hygiene] OK — no prod refs in .env files.');
```

### Anti-Patterns to Avoid

- **Using the Transaction Pooler (port 6543) for `prisma migrate deploy` or `pg_dump`** — Both break. The pooler disconnects between statements, so Prisma's `pg_advisory_lock` is released mid-migration; pg_dump can error on long dumps. Always use `DIRECT_URL` (port 5432). [CITED: Supabase docs — Connect to your database]
- **Truncating `auth.users` via raw SQL** — Bypasses Supabase's cascade hooks (session invalidation, refresh-token revocation). Use `supabase.auth.admin.deleteUser(id)` instead (D-06).
- **Populating secrets by checking in values to `terraform.tfvars`** — Already locked out by Phase 45 D-10. Phase 46 follows the same out-of-band rule; every value enters via `gcloud secrets versions add --data-file=-` piped from a transient shell variable.
- **Running the seeder against prod** — The `assertStagingDatabase()` guard is MANDATORY at script top. Any script that mutates data MUST either assert staging OR call `assertProdDatabase(PROD_REF)` with the explicit `--i-understand-this-wipes-prod` flag.
- **Calling `faker.*` before `faker.seed(1337)`** — Even one call before the seed breaks determinism. Put the seed on line 1 after imports.
- **Not committing `docs/ENV-HYGIENE.md`** — The rule is enforceable only if the rule exists in-repo (D-19). Link from README + CLAUDE.md.
- **Storing the Management API personal access token anywhere but Secret Manager** — Phase 46 runbook requires an env var export; the token MUST not be committed, pasted in a chat, or written to `.env.local`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Deterministic fake data | Custom seeded RNG + name lists | `@faker-js/faker` + `faker.seed(1337)` | Covers persons, addresses, lorem, numbers, dates. D-09 locks it. |
| Prod backup logical dump | Custom SQL extractor | `pg_dump -Fc -Z9 --no-owner --no-acl --schema=public --schema=auth` | Official Postgres tool. Custom format (`-Fc`) is compressed + restorable via `pg_restore`. |
| Idempotent seeding | `deleteMany` + `createMany` | `prisma.upsert({ where, update, create })` keyed on `@unique` | Safer against partial-failure retries. Matches existing `scripts/seed-demo-data.ts` shape. |
| Cascade delete of `auth.users` | Raw SQL | `supabase.auth.admin.deleteUser(userId)` | Supabase Auth cleanup is multi-table + has session-invalidation side effects. |
| Supabase config sync | Custom script | Supabase Management API (`PATCH /v1/projects/{ref}/config/auth`) | D-17 locks it. Terraform's Supabase provider has no resource for redirect URLs. |
| Migration advisory locking | Custom table | `prisma migrate deploy` native | Built-in; just use `DIRECT_URL`. |
| Env-file secret scanning | Custom regex in shell | Local script + `git grep` hooked into CI | Keeps logic in one TS file (`scripts/verify-env-hygiene.ts`) that's testable with fixtures. |

**Key insight:** Every piece of this phase has a canonical tool. The design risk is not "how do I implement X" but "did I pick the right environment variable / URL / schema for X at the right moment."

## TRUNCATE Order Derivation

Derived by reading `prisma/schema.prisma` FK declarations:

```
CodingSkillSignal → attemptId → CodingAttempt (Cascade)
CodingAttempt    → associateId → Associate (Cascade),  challengeId → CodingChallenge (Restrict)
CodingTestCase   → challengeId → CodingChallenge (Cascade)
GapScore         → associateId → Associate (Cascade)
Session          → associateId → Associate (SetNull), cohortId → Cohort (SetNull)
CodingChallenge  → cohortId → Cohort (SetNull)
CurriculumWeek   → cohortId → Cohort (Cascade)
Associate        → cohortId → Cohort (SetNull)
```

Tables with no FKs: `AuthEvent`, `Profile`, `HealthCheck`, `Settings`.

**Canonical truncate order (children → parents, use CASCADE for belt-and-suspenders):**

```sql
BEGIN;
TRUNCATE TABLE "CodingSkillSignal" RESTART IDENTITY CASCADE;
TRUNCATE TABLE "CodingAttempt"     RESTART IDENTITY CASCADE;
TRUNCATE TABLE "CodingTestCase"    RESTART IDENTITY CASCADE;
TRUNCATE TABLE "GapScore"          RESTART IDENTITY CASCADE;
TRUNCATE TABLE "Session"           RESTART IDENTITY CASCADE;
TRUNCATE TABLE "AuthEvent"         RESTART IDENTITY CASCADE;
TRUNCATE TABLE "Profile"           RESTART IDENTITY CASCADE;
TRUNCATE TABLE "CodingChallenge"   RESTART IDENTITY CASCADE;
TRUNCATE TABLE "CurriculumWeek"    RESTART IDENTITY CASCADE;
TRUNCATE TABLE "Associate"         RESTART IDENTITY CASCADE;
TRUNCATE TABLE "Cohort"            RESTART IDENTITY CASCADE;
TRUNCATE TABLE "HealthCheck"       RESTART IDENTITY CASCADE;
TRUNCATE TABLE "Settings"          RESTART IDENTITY CASCADE;
COMMIT;

-- DO NOT TRUNCATE _prisma_migrations — schema history must persist.
-- DO NOT TRUNCATE auth.users from SQL — use admin API.
```

`RESTART IDENTITY` resets serial sequences (matters for `Associate.id`, `Cohort.id`, `CurriculumWeek.id`, etc.) so re-seeding starts at 1.

## Common Pitfalls

### Pitfall 1: `prisma migrate deploy` runs against the pooler (silent hang → advisory lock fails)

**What goes wrong:** `DATABASE_URL` points at port 6543 (Transaction Pooler). Prisma acquires `pg_advisory_lock(72707768)` on one connection; PgBouncer transaction-pooling releases that connection at statement boundary → lock is immediately released → next migrate run collides.

**Why it happens:** Developers copy the `DATABASE_URL` from `.env.local` (which points at pooler for runtime queries) and reuse it for migrations.

**How to avoid:** Always invoke migrate-deploy with `DATABASE_URL="$DIRECT_URL"` so Prisma reads the direct connection (port 5432). `prisma.config.ts` already does this for the CLI's internal config, but command-line env takes precedence:

```bash
DATABASE_URL="$DIRECT_URL" npx prisma migrate deploy
```

**Warning signs:** `Migration engine error: P3005` (non-empty database schema); migrations hang for >30s; "could not obtain lock on database".

### Pitfall 2: `pg_dump` against pooler loses long-running connection

**What goes wrong:** Similar to Pitfall 1 — the pooler can drop a connection that's been open for > query timeout. For a large prod DB, `pg_dump` can take minutes. Use direct 5432.

**How to avoid:** Extract host + port from `DIRECT_URL`:
```bash
# DIRECT_URL is like: postgresql://postgres.<ref>:<pw>@db.<ref>.supabase.co:5432/postgres
export PGPASSWORD="<password extracted from DIRECT_URL>"
pg_dump \
  --host=db.<prod-ref>.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-acl \
  --schema=public \
  --schema=auth \
  --verbose \
  --file=prod-pre-wipe-$(date +%Y%m%d).dump
```

**Warning signs:** "server closed the connection unexpectedly" partway through dump; partial `.dump` files.

### Pitfall 3: Truncating `auth.users` via SQL leaves orphaned refresh tokens + sessions

**What goes wrong:** `DELETE FROM auth.users WHERE ...` deletes the user row but leaves `auth.refresh_tokens`, `auth.sessions`, `auth.identities` as dangling FKs (Supabase FK constraints may be `ON DELETE CASCADE` for those, but session revocation hooks are Go-layer, not SQL-layer). You can also get `permission denied` on the `auth` schema if running as the default `postgres` role on Supabase managed Postgres.

**How to avoid:** Use `supabase.auth.admin.deleteUser(userId)` — handled at the GoTrue layer, cleans all side-effects.

```typescript
// CORRECT — handles cascade + session revocation
await supabase.auth.admin.deleteUser(u.id);

// WRONG — orphans auth.sessions; may be blocked by RLS on auth schema
await pool.query('DELETE FROM auth.users WHERE email LIKE $1', ['%@example.com']);
```

### Pitfall 4: Supabase Management API 401 from wrong PAT scope

**What goes wrong:** PATCH `/v1/projects/{ref}/config/auth` returns 401 or 403.

**Why it happens:** The personal access token was created without `all` scope, or the token belongs to a user who isn't a member of the project's Supabase organization.

**How to avoid:** Create the PAT at `https://supabase.com/dashboard/account/tokens` with `all` scope; confirm the dashboard user is a member of the org that owns both the staging and prod projects. Cache the PAT as `SUPABASE_ACCESS_TOKEN` env var for the runbook; never commit.

**Warning signs:** `{ "message": "Unauthorized" }` or `{ "message": "Project not found" }` (the latter = not a member, not a bad ref).

### Pitfall 5: `uri_allow_list` format is a comma-separated STRING, not an array

**What goes wrong:** Sending `{"uri_allow_list": ["a", "b"]}` in the PATCH body is rejected or silently ignored.

**Why it happens:** GoTrue `URIAllowList []string` parses from a **comma-separated env var**; the Management API matches that wire format — it expects a single string with commas.

**How to avoid:** Send `{"uri_allow_list": "https://staging.nextlevelmock.com/**,http://localhost:3000/**"}`. [VERIFIED: GoTrue [configuration.go](https://github.com/supabase/auth/blob/master/internal/conf/configuration.go) — `URIAllowList []string` with `split_words:"true"`; env parsing uses comma]

**Warning signs:** GET /config/auth after PATCH shows `uri_allow_list: ""` or truncated value.

### Pitfall 6: Faker non-determinism across locales

**What goes wrong:** `faker.seed(1337)` produces different data on machines with different locales when faker's default locale selection differs.

**How to avoid:** Pin the locale explicitly:
```typescript
import { en, Faker } from '@faker-js/faker';
const faker = new Faker({ locale: [en] });
faker.seed(1337);
```
Or import the English-only build: `import { faker } from '@faker-js/faker/locale/en';`.

### Pitfall 7: `prisma.upsert` with no unique constraint

**What goes wrong:** `prisma.cohort.upsert({ where: { name: 'alpha' } })` throws at compile time — `Cohort.name` is not `@unique`. Schema confirms only `id` is unique on Cohort.

**How to avoid:** Use `findFirst` + `update` / `create` pattern (as existing `scripts/seed-demo-data.ts` does). `CurriculumWeek` has `@@unique([cohortId, weekNumber])` → `upsert` works via `where: { cohortId_weekNumber: { ... } }`. `Associate.slug` is `@unique` → direct upsert. `CodingChallenge.slug` is `@unique` → direct upsert. `Settings.id = 1` is `@unique` (PK) → direct upsert.

### Pitfall 8: pg_dump version mismatch (local pg_dump < server version)

**What goes wrong:** Running pg_dump 14 against Supabase's Postgres 15 errors with "server version mismatch; use a newer pg_dump".

**How to avoid:** `brew install postgresql@16` (client ≥ server); invoke `/opt/homebrew/opt/postgresql@16/bin/pg_dump`. Runbook preflight must assert `pg_dump --version` ≥ 15.

## Code Examples

### Supabase Management API — update redirect URLs (D-17)

```bash
# Source: [CITED: Supabase Management API PATCH /v1/projects/{ref}/config/auth]
# Field names verified against GoTrue upstream (configuration.go):
#   site_url       — string
#   uri_allow_list — comma-separated string (NOT array)

# STAGING
export SUPABASE_ACCESS_TOKEN="<PAT from supabase.com/dashboard/account/tokens>"
export STAGING_REF="lzuqbpqmqlvzwebliptj"

curl -X PATCH "https://api.supabase.com/v1/projects/${STAGING_REF}/config/auth" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "site_url": "https://staging.nextlevelmock.com",
    "uri_allow_list": "https://staging.nextlevelmock.com/**,http://localhost:3000/**"
  }'

# Verify:
curl -s "https://api.supabase.com/v1/projects/${STAGING_REF}/config/auth" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  | jq '{ site_url, uri_allow_list }'

# PROD
export PROD_REF="<prod supabase ref>"
curl -X PATCH "https://api.supabase.com/v1/projects/${PROD_REF}/config/auth" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "site_url": "https://nextlevelmock.com",
    "uri_allow_list": "https://nextlevelmock.com/**,https://www.nextlevelmock.com/**"
  }'
```

### pg_dump — full backup against DIRECT_URL

```bash
# Source: [CITED: Supabase docs — Connect to your database (direct connection on 5432)]

# Extract components from DIRECT_URL (postgresql://user:pw@host:5432/db)
# Manually for the runbook or use a small python/node parser.

export PGPASSWORD="<password>"
BACKUP_FILE="prod-pre-wipe-$(date +%Y%m%d).dump"

pg_dump \
  --host="db.${PROD_REF}.supabase.co" \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-acl \
  --schema=public \
  --schema=auth \
  --verbose \
  --file="${BACKUP_FILE}"

ls -lh "${BACKUP_FILE}"   # confirm > 0 bytes

# Upload to GCS
gsutil cp "${BACKUP_FILE}" "gs://nlm-tfstate/backups/${BACKUP_FILE}"
gsutil ls -l "gs://nlm-tfstate/backups/"
```

**Flag rationale:**
- `--format=custom` (`-Fc`) — binary, compressible, restorable via `pg_restore` with selective table/schema restore (needed for rollback flexibility).
- `--compress=9` — max zlib level; dump size typically drops ≥ 80%.
- `--no-owner --no-acl` — Supabase-recommended (ownership is managed by the `postgres` role on Supabase; re-applying ownership on restore can fail).
- `--schema=public --schema=auth` — explicit include-list. Skips `storage.*`, `graphql.*`, and Supabase-managed internal schemas that `pg_restore` can't touch anyway.

### gcloud — populate a secret value into Secret Manager

```bash
# Source: [CITED: Phase 45 research §Common Operation 4]
# Per D-03, values are populated out-of-band via gcloud. Phase 46 runs these
# five commands × 2 projects = 10 invocations.

# STAGING (nlm-staging-493715) — Supabase secrets only
PROJECT_ID="nlm-staging-493715"

# DATABASE_URL — transaction pooler for runtime queries
echo -n "postgresql://postgres.lzuqbpqmqlvzwebliptj:<pw>@aws-0-<region>.pooler.supabase.com:6543/postgres?connection_limit=5&pool_timeout=10" \
  | gcloud secrets versions add DATABASE_URL --data-file=- --project="${PROJECT_ID}"

# DIRECT_URL — direct connection for migrations
echo -n "postgresql://postgres.lzuqbpqmqlvzwebliptj:<pw>@db.lzuqbpqmqlvzwebliptj.supabase.co:5432/postgres" \
  | gcloud secrets versions add DIRECT_URL --data-file=- --project="${PROJECT_ID}"

# NEXT_PUBLIC_SUPABASE_URL
echo -n "https://lzuqbpqmqlvzwebliptj.supabase.co" \
  | gcloud secrets versions add NEXT_PUBLIC_SUPABASE_URL --data-file=- --project="${PROJECT_ID}"

# NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY — copy from Supabase Dashboard → Settings → API → anon/public
echo -n "<publishable key>" \
  | gcloud secrets versions add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY --data-file=- --project="${PROJECT_ID}"

# SUPABASE_SECRET_KEY — copy from Supabase Dashboard → Settings → API → service_role
echo -n "<secret key>" \
  | gcloud secrets versions add SUPABASE_SECRET_KEY --data-file=- --project="${PROJECT_ID}"

# Verify — should print the value
gcloud secrets versions access latest --secret=DATABASE_URL --project="${PROJECT_ID}"

# PROD — repeat with PROJECT_ID=nlm-prod and the prod Supabase ref/keys
```

### Developer — pull staging keys into .env.local (D-19)

```bash
# Source: [CITED: Phase 45 D-10 + Phase 46 D-19]
# Run ONCE per developer workstation.

PROJECT_ID="nlm-staging-493715"
cat > .env.local <<EOF
# Auto-generated from Secret Manager (staging only) — do NOT commit.
DATABASE_URL=$(gcloud secrets versions access latest --secret=DATABASE_URL --project="${PROJECT_ID}")
DIRECT_URL=$(gcloud secrets versions access latest --secret=DIRECT_URL --project="${PROJECT_ID}")
NEXT_PUBLIC_SUPABASE_URL=$(gcloud secrets versions access latest --secret=NEXT_PUBLIC_SUPABASE_URL --project="${PROJECT_ID}")
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$(gcloud secrets versions access latest --secret=NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY --project="${PROJECT_ID}")
SUPABASE_SECRET_KEY=$(gcloud secrets versions access latest --secret=SUPABASE_SECRET_KEY --project="${PROJECT_ID}")
NEXT_PUBLIC_SITE_URL=http://localhost:3000
EOF

# Verify hygiene
npx tsx scripts/verify-env-hygiene.ts
```

### Prisma migrate deploy — both envs

```bash
# Source: [CITED: Prisma docs — PgBouncer + migrate deploy]
# Invocation pattern that ALWAYS uses direct connection regardless of which
# DATABASE_URL is in the shell.

# STAGING
export DIRECT_URL=$(gcloud secrets versions access latest --secret=DIRECT_URL --project=nlm-staging-493715)
DATABASE_URL="$DIRECT_URL" npx prisma migrate deploy

# Expected output:
#   "10 migrations found in prisma/migrations"
#   "All migrations have been successfully applied."

# Status check
DATABASE_URL="$DIRECT_URL" npx prisma migrate status
# Expected: "Database schema is up to date!"

# PROD
export DIRECT_URL=$(gcloud secrets versions access latest --secret=DIRECT_URL --project=nlm-prod)
DATABASE_URL="$DIRECT_URL" npx prisma migrate deploy
DATABASE_URL="$DIRECT_URL" npx prisma migrate status
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `faker` package | `@faker-js/faker` | 2022 (original package deprecated) | Use `@faker-js/faker` 10.x. Don't `npm install faker`. |
| `prisma migrate deploy` against any connection | `prisma migrate deploy` ONLY against direct 5432 | PgBouncer + Prisma interaction documented ~2022 | Always set `DATABASE_URL=$DIRECT_URL` for migrate commands. |
| Terraform-managed Supabase auth config | Supabase Management API (`/v1/projects/{ref}/config/auth`) | Community Terraform provider never caught up | Manage via curl/script; document in runbook. |
| Raw `DELETE FROM auth.users` | `supabase.auth.admin.deleteUser(id)` | Since GoTrue session-revocation hooks landed | Use admin API. |
| `.env` checked into repo (even empty) | `.env.example` only, `.env.local` gitignored | Standard Next.js since ≥ v12 | Already enforced by this repo's `.gitignore`. |

**Deprecated / outdated:**
- `faker` (original) — dead since 2022.
- Postgres COPY-based "logical" exports for Supabase — use `pg_dump` instead.
- Setting `uri_allow_list` as a JSON array — still a string in 2026.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `pg_dump` is not installed locally on Jester's machine | §Standard Stack (Supporting) | Planner adds `brew install postgresql@16` preflight; wastes ~2 min if already installed. LOW. |
| A2 | Supabase is still on Postgres 15 (confirmed 2025; may be 16 by 2026-04) | §pg_dump version | Mismatch triggers pg_dump error; bumping to pg17-client resolves. LOW — recovered by re-running. |
| A3 | `uri_allow_list` in 2026 still accepts the `**` glob syntax documented in 2024 | §Pattern / Curl Example | If syntax changed, redirect auth breaks silently post-deploy. MEDIUM — planner should verify via GET /config/auth immediately after PATCH and re-test at Phase 47 smoke. |
| A4 | Supabase Management API PATCH field names are `site_url` + `uri_allow_list` (snake_case strings) | §Curl Example + §Pitfall 5 | Wrong field names = 400/silent-noop. [VERIFIED via GoTrue OSS `configuration.go`] confirmed 2026-04-18. |
| A5 | The 10 migrations currently in `prisma/migrations/` are all that exists at Phase 46 start | §D-13 | If a new migration lands between planning and execute, `prisma migrate deploy` still works — it's append-only. LOW. |
| A6 | `SUPABASE_SECRET_KEY` (service role) is NOT rotated during key regeneration of the anon/publishable key | §Supabase Key Rotation | If Supabase regenerates BOTH on key rotation, every running service that has the old service_role key becomes 401 — blast radius = any pre-Phase 46 deployment that uses staging. LOW because Phase 47 hasn't deployed yet. |
| A7 | The staging project ref `lzuqbpqmqlvzwebliptj` is unique enough that `.includes()` won't false-positive against a prod URL | §Pattern 1 (assert guard) | If a prod URL accidentally has overlapping substring, guard is bypassed. MITIGATION — constant is 20 chars of a random-looking ref; collision risk is effectively zero. LOW. |
| A8 | The 10 migrations apply cleanly against a dirty prod DB that already has all schema (including RLS policies from 0003) — `prisma migrate deploy` runs every migration file checksum-matched, so a fully-applied DB reports "no pending" | §Prisma Migrate Deploy | If the dirty prod DB has schema drift from migrations (e.g., hand-applied changes), `migrate deploy` errors with P3005. MEDIUM. Planner task: run `prisma migrate status` against prod BEFORE any TRUNCATE — if it reports pending/failed migrations, escalate before wiping. |

## Open Questions (RESOLVED)

1. **Does `pg_dump` need `--schema=auth` or will Supabase reject it?**
   - RESOLVED. `--schema=public --schema=auth` is accepted. The `auth` schema is owned by the `supabase_auth_admin` role, but the `postgres` login role used by `DIRECT_URL` has read access (confirmed by GoTrue docs pattern). Other Supabase-managed schemas (`storage`, `graphql`, `realtime`, `supabase_functions`) are omitted — they're rebuilt from extensions on restore.

2. **Should the seeder use `@faker-js/faker` default locale or pin to `en`?**
   - RESOLVED. Pin to `en` explicitly via `import { faker } from '@faker-js/faker/locale/en'` OR `new Faker({ locale: [en] })`. Prevents cross-machine non-determinism. Recommended: the locale-scoped import (shorter).

3. **Does `prisma migrate deploy` need the shadow DB for a production run?**
   - RESOLVED. No. `prisma.config.ts` doesn't declare `shadowDatabaseUrl`; `migrate deploy` never needs one (shadow DB is only for `migrate dev` on local machines). Verified in `prisma.config.ts` which only sets `datasource.url`.

4. **Is the `SUPABASE_SECRET_KEY` rotated alongside the publishable key when generating new staging keys?**
   - RESOLVED. In Supabase Dashboard → Settings → API, the publishable (anon) key and service_role key are two separate tokens. Rotating one does not rotate the other. The Phase 46 runbook regenerates BOTH for staging to ensure a clean post-migration state.

5. **Should `auth.users` deletion run inside the same transaction as `TRUNCATE`?**
   - RESOLVED. No — they're in different layers. `TRUNCATE` happens via pg in a DB transaction; `auth.users` deletion happens via HTTPS to GoTrue. Run the DB transaction first (so app-layer data is gone), then clean up `auth.users`. A partial-failure state ( app data wiped, auth users remain) is recoverable by re-running the auth deletion loop. Reverse order risks orphaned `Associate.authUserId` references if the DB wipe fails mid-way.

6. **`CONTRIBUTING.md` vs `docs/ENV-HYGIENE.md`?**
   - RESOLVED. Create `docs/ENV-HYGIENE.md` (the repo already has `docs/` with content + `docs/runbooks/`). No `CONTRIBUTING.md` exists yet. Creating one just for env hygiene mixes concerns — better as a scoped doc. Link from README.md + CLAUDE.md deployment section.

7. **Where does the Phase 46 runbook live?**
   - RESOLVED. `docs/runbooks/phase-46-supabase-wipe.md`. Existing sibling: `docs/runbooks/coding-stack.md`. Pattern: one runbook per operationally-distinct procedure; link from `.planning/DEPLOY.md` in Phase 53.

8. **Should the seeder include CodingAttempt records?**
   - RESOLVED. Yes, per D-08 — 2-3 attempts per challenge × 10 challenges = 20-30 rows. CodingAttempt.id is `@default(cuid())` (not deterministic even with faker.seed), so upsert keys on a composite natural key derived from (associateId, challengeId, attemptIndex). Alternative: `findFirst` + create pattern. Planner picks — recommend the composite-key findFirst approach to stay truly idempotent.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| gcloud | Secret rotation + population + backup upload | ✓ | 547.0.0 (Phase 45 probe) | — |
| gsutil | Backup upload to `gs://nlm-tfstate/backups/` | ✓ | 5.35 | `gcloud storage cp` |
| Node.js | tsx scripts | ✓ | 24.x | — |
| tsx | Script runner | ✓ | 4.21.0 | `node --loader` (worse UX) |
| Prisma CLI | `migrate deploy`, `migrate status` | ✓ | 7.7.0 | — |
| @faker-js/faker | Seeder | ✗ | must install | npm install as dev dep |
| pg_dump ≥ 15 | Backup | ✗ (not on local per Phase 45 probe) | — | `brew install postgresql@16` preflight |
| curl + jq | Management API runbook commands | ✓ | system | — |
| Supabase personal access token | Management API auth | ✗ (user-held) | — | User creates at dashboard/account/tokens |
| `gs://nlm-tfstate` bucket | Backup destination | ✓ | from Phase 45 D-05 | — |
| 5 Secret Manager shells per project | gcloud secrets versions add targets | ✓ | from Phase 45 D-09 | — |
| `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` shells | Staging + prod | ✓ in staging + prod Secret Manager | — | — |

**Missing dependencies with no fallback:**
- None blocking — faker install + pg_dump install are mechanical preflight.

**Missing dependencies with fallback:**
- `pg_dump` via `brew install postgresql@16` — 30-second preflight task.
- `@faker-js/faker` via `npm install --save-dev` — 10-second task.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 (existing in `package.json`) |
| Config file | `vitest.config.ts` (existing; consumed by `npm run test`) |
| Quick run command | `npx vitest run scripts/__tests__/seedStagingIdempotency.test.ts` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-01 | Staging DATABASE_URL in Secret Manager contains staging ref; prod DATABASE_URL references different ref | smoke (shell) | `gcloud secrets versions access latest --secret=DATABASE_URL --project=nlm-staging-493715 \| grep -q lzuqbpqmqlvzwebliptj && gcloud secrets versions access latest --secret=DATABASE_URL --project=nlm-prod \| grep -qv lzuqbpqmqlvzwebliptj` | ❌ Wave 0 — add as runbook step |
| DATA-01 | `.env.local` contains staging ref only (no prod ref) | unit | `npx tsx scripts/verify-env-hygiene.ts` (exits 0) | ❌ Wave 0 |
| DATA-02 | All user-data tables on prod return COUNT 0 post-wipe | smoke (shell) | `DATABASE_URL=$PROD_DIRECT_URL psql -c "SELECT COUNT(*) FROM \"Associate\""` → 0 (repeat for Session, GapScore, CodingAttempt) | ❌ Wave 0 — shell snippet in runbook |
| DATA-02 | Backup object exists + size > 0 | smoke (shell) | `gsutil stat gs://nlm-tfstate/backups/prod-pre-wipe-$(date +%Y%m%d).dump \| grep -E "Content-Length:\\s+[1-9]"` | ❌ Wave 0 |
| DATA-03 | `seed-staging.ts` runs to completion | smoke | `DATABASE_URL=$STAGING_URL npx tsx scripts/seed-staging.ts` exits 0 | ❌ Wave 0 |
| DATA-03 | Re-running seeder produces identical row counts (idempotency) | integration (smoke) | Run twice, assert `SELECT COUNT(*) FROM "Associate"` equal before/after second run | ❌ Wave 0 — add as runbook step |
| DATA-03 | Seeder refuses to run when DATABASE_URL lacks staging ref | unit | `scripts/__tests__/assertStagingEnv.test.ts` — calls `assertStagingDatabase()` with mutated env | ❌ Wave 0 |
| DATA-03 | Faker seed produces deterministic firstName output | unit | `scripts/__tests__/seedStagingIdempotency.test.ts` — assert two fresh faker instances with seed 1337 produce same first 3 names | ❌ Wave 0 |
| DATA-04 | `prisma migrate deploy` exits 0 against staging DIRECT_URL | smoke | `DATABASE_URL=$STAGING_DIRECT_URL npx prisma migrate deploy` | ❌ Wave 0 |
| DATA-04 | `prisma migrate status` reports "Database schema is up to date" | smoke | `DATABASE_URL=$STAGING_DIRECT_URL npx prisma migrate status \| grep -q "up to date"` | ❌ Wave 0 |
| DATA-04 | Same for prod DIRECT_URL | smoke | idem with `PROD_DIRECT_URL` | ❌ Wave 0 |
| DATA-05 | `docs/ENV-HYGIENE.md` exists and contains the gcloud-secrets-access snippet | unit (file-existence) | `test -f docs/ENV-HYGIENE.md && grep -q 'gcloud secrets versions access' docs/ENV-HYGIENE.md` | ❌ Wave 0 |
| DATA-05 | `scripts/verify-env-hygiene.ts` exits 0 on clean repo | unit | `PROD_SUPABASE_REF=<prod ref> npx tsx scripts/verify-env-hygiene.ts` → exit 0 | ❌ Wave 0 |
| DATA-05 | `scripts/verify-env-hygiene.ts` exits non-zero on fixture .env with prod ref | unit | `scripts/__tests__/verifyEnvHygiene.test.ts` — fixture-based | ❌ Wave 0 |
| DATA-06 | Staging uri_allow_list contains staging + localhost | smoke | `curl -sH "Authorization: Bearer $PAT" "https://api.supabase.com/v1/projects/${STAGING_REF}/config/auth" \| jq -r '.uri_allow_list' \| grep -q 'staging.nextlevelmock.com' && ... \| grep -q 'localhost:3000'` | ❌ Wave 0 |
| DATA-06 | Prod uri_allow_list contains prod domains only (no localhost, no staging) | smoke | `curl ... \| jq -r '.uri_allow_list' \| grep -qv 'localhost' && \| grep -qv 'staging.'` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test -- scripts/__tests__/` (all new vitest files)
- **Per wave merge:** `npm run test` (full suite) + `npx tsc --noEmit` + `npm run lint`
- **Phase gate:** full suite green + runbook shell-command checklist 100% green + `prisma migrate status` = "up to date" on both envs

### Wave 0 Gaps

- [ ] `scripts/lib/assert-staging-env.ts` — shared guard (exports `assertStagingDatabase`, `assertProdDatabase`)
- [ ] `scripts/seed-staging.ts` — idempotent Faker + upsert seeder
- [ ] `scripts/wipe-prod.ts` — dry-run default + `--i-understand-this-wipes-prod`
- [ ] `scripts/verify-env-hygiene.ts` — `.env*` scanner
- [ ] `scripts/__tests__/assertStagingEnv.test.ts` — unit test of the guard (mocks `process.env`)
- [ ] `scripts/__tests__/seedStagingIdempotency.test.ts` — unit test of Faker determinism (2 instances, same seed → identical output)
- [ ] `scripts/__tests__/verifyEnvHygiene.test.ts` — fixture-based test of the scanner
- [ ] `docs/ENV-HYGIENE.md` — developer-facing rule + `gcloud secrets versions access` snippet (D-19)
- [ ] `docs/runbooks/phase-46-supabase-wipe.md` — operator runbook: every curl + gcloud + pg_dump + psql command for staging key rotation, prod backup+wipe, migration promotion, redirect-URL patch
- [ ] `@faker-js/faker@^10.4.0` added to `package.json` devDependencies
- [ ] `package.json` scripts block: add `"seed-staging": "tsx scripts/seed-staging.ts"`, `"wipe-prod": "tsx scripts/wipe-prod.ts"`, `"verify-env-hygiene": "tsx scripts/verify-env-hygiene.ts"` (matching the existing tsx-script convention)

*(No existing test infrastructure gap — Vitest + scripts/__tests__ is already the pattern.)*

## Security Domain

> Required — `security_enforcement` default = enabled. Phase 46 has direct data-destructive operations (prod wipe), secret-handling, and cross-environment authority boundaries. STRIDE mapping is P0.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | YES | Supabase Auth — Management API PAT scoped to organization; `auth.users` deletion via admin API (not SQL) |
| V3 Session Management | YES | `supabase.auth.admin.deleteUser()` triggers session revocation at GoTrue layer |
| V4 Access Control | YES | Guarded scripts — `assertStagingDatabase()` / `assertProdDatabase()` + explicit `--i-understand-this-wipes-prod` flag |
| V5 Input Validation | PARTIAL | Argv parsing in wipe-prod; env-var presence checks; faker seed constant validated by type |
| V6 Cryptography | YES | Secrets stored in GCS Secret Manager (Google-managed KMS); PAT never written to disk; `.env.local` gitignored |
| V7 Error Handling and Logging | YES | Scripts redact URL passwords via `maskUrl()` helper before console output; pg_dump output file not committed |
| V8 Data Protection | YES | Backup to `gs://nlm-tfstate/backups/` — bucket has uniform-bucket-level-access + versioning + public-access-prevention (Phase 45 D-05) |
| V9 Communications | YES | HTTPS for all Management API / Supabase / GCS calls |

### STRIDE Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Script accidentally run against prod with intent to seed | **Spoofing** (env impersonation) | `assertStagingDatabase()` guard at top of `seed-staging.ts`; hardcoded staging ref substring check |
| Script accidentally runs live wipe (no flag = live behavior) | **Tampering** (destructive side-effect) | Dry-run is DEFAULT; `--i-understand-this-wipes-prod` explicit flag required (D-05) |
| Prod secrets land in `.env.local` and leak via git commit | **Information Disclosure** | `scripts/verify-env-hygiene.ts` scans every `.env*` for prod ref; CI / pre-commit hook; `.gitignore` covers `.env.local` |
| Supabase PAT checked into code or runbook | **Information Disclosure** | Runbook instructs `export SUPABASE_ACCESS_TOKEN=...` from shell; never written to any file; rotate via dashboard post-phase |
| Wipe is irreversible if backup upload fails silently | **Denial of Service** (data loss) | Runbook sequence: backup → `gsutil stat` size > 0 → ONLY THEN TRUNCATE. Backup verification is a HARD gate. |
| pg_dump output left on developer laptop with creds | **Information Disclosure** | `.gitignore` includes `*.dump`; post-upload `rm -f prod-pre-wipe-*.dump`; recommended via runbook |
| Seeder creates admin-role associates by accident | **Elevation of Privilege** | Seeder never writes to `auth.users` directly; all created associates are `@example.com`, no `role: 'trainer'` user_metadata |
| Management API PATCH with wrong ref clobbers wrong env | **Tampering** | Runbook template uses `${STAGING_REF}` / `${PROD_REF}` vars; always GET /config/auth first to confirm current state; PATCH + re-GET to verify |
| Truncating `auth.users` via SQL bypasses session revocation | **Spoofing** (stale sessions remain valid) | Use `supabase.auth.admin.deleteUser()` — GoTrue revokes refresh tokens + sessions |
| `verify-env-hygiene.ts` false-negative on obfuscated prod ref | **Repudiation** | Regex uses literal ref substring; add a second check for the prod Supabase URL host pattern as belt-and-suspenders |

## Sources

### Primary (HIGH confidence)
- Local `package.json` — confirmed deps, versions, devDeps
- `prisma/schema.prisma` — FK relationships, `@unique` constraints for upsert keys
- `prisma/migrations/` — migration list (10 migrations at research time)
- `prisma.config.ts` — confirms no shadow DB; `DIRECT_URL` fallback
- `src/lib/prisma.ts` — Prisma singleton pattern with `PrismaPg` + `pg.Pool`
- `src/lib/supabase/admin.ts` — admin client shape
- `scripts/seed-demo-data.ts`, `scripts/seed-coding-demo.ts`, `scripts/wipe-demo-data.ts`, `scripts/abuse-test-coding.ts`, `scripts/list-associates.ts` — established script patterns
- `.planning/phases/45-terraform-skeleton-artifact-registry-secret-manager/45-RESEARCH.md` — §Common Operation 4 (gcloud secrets versions add pattern)
- npm registry probes (live 2026-04-18): `@faker-js/faker` 10.4.0, `prisma` 7.7.0
- GoTrue OSS [`internal/conf/configuration.go`](https://github.com/supabase/auth/blob/master/internal/conf/configuration.go) — canonical `URIAllowList` / `SiteURL` field names + parsing

### Secondary (MEDIUM confidence)
- [Supabase Management API Reference](https://supabase.com/docs/reference/api/introduction) — PATCH `/v1/projects/{ref}/config/auth` endpoint
- [Supabase Auth — Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls) — glob syntax `**`
- [Supabase Migrate from Postgres](https://supabase.com/docs/guides/platform/migrating-to-supabase/postgres) — `pg_dump` flag rationale (`--no-owner --no-privileges`)
- [Supabase Connect to your database](https://supabase.com/docs/guides/database/connecting-to-postgres) — direct vs pooler guidance

### Tertiary (LOW confidence — verification recommended)
- `uri_allow_list` format as a comma-separated string (verified via GoTrue source — **actually HIGH**)
- Supabase 2026-04 Postgres version (assumed 15; check via `SELECT version()` during runbook preflight)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions probed live on 2026-04-18
- Prisma/Supabase patterns: HIGH — matches existing repo code
- Management API field names: HIGH — verified against GoTrue OSS source
- pg_dump flag set: MEDIUM — Supabase docs confirm `--no-owner --no-privileges` but `--clean` is author's recommendation, not Supabase's; planner may drop it
- TRUNCATE ordering: HIGH — derived from schema.prisma FK reading
- Faker 10.x API: HIGH — documented stable since 2024

**Research date:** 2026-04-18
**Valid until:** 2026-05-18 (30 days — Supabase Management API has been stable for > 2 years; Prisma 7 is current stable; Faker 10 is current stable)
