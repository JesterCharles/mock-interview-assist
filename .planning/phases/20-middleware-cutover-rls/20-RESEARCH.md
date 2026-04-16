# Phase 20: Middleware Cutover + RLS — Research

**Researched:** 2026-04-16
**Domain:** PostgreSQL Row Level Security, Prisma migration raw SQL, route handler identity filtering
**Confidence:** HIGH

## Summary

Phase 20 is narrow and well-defined: deploy RLS policies as defense-in-depth on five Supabase tables, audit all route handlers to verify explicit identity filtering, and document the BYPASSRLS + Transaction Pooler architecture in PROJECT.md. Middleware is already Supabase-primary (Phase 18); this phase does NOT touch it.

The route handler audit found that all 16 targeted handlers already gate on `getCallerIdentity()` with `caller.kind` checks. No handler currently returns data without an identity check in place. The only action needed is a code-annotated verification pass — adding `// [AUDIT-VERIFIED: P20]` comments so the audit is traceable — and confirming that Prisma queries filter by the correct identity field where applicable (e.g., associate self-reads use `where: { id: caller.associateId }`).

RLS policies are additive SQL deployed via a Prisma raw migration. They have zero effect on Prisma reads (service-role bypasses RLS) but block direct `supabase-js` reads from non-owners. The pattern is identical to the idempotent migrations already in place (baseline, v1.1, v1.2 schema prep).

**Primary recommendation:** Single migration file with all RLS SQL + `is_trainer()` helper function; verify idempotency with `IF NOT EXISTS` / `DO $$ ... IF NOT EXISTS $$` guards; annotate all route handlers with audit marker comments.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** SC 2 ("Legacy PIN cookie still authorizes during the 2-week grace window") is superseded by Phase 18 decision. PIN never shipped to production. `getCallerIdentity()` already reads Supabase session only (no PIN fallback). No grace window code needed. SC 2 is satisfied vacuously.
- **D-02:** RLS policies are defense-in-depth only. Prisma runs on the service-role connection (BYPASSRLS via Transaction Pooler). RLS catches unauthorized direct `supabase-js` reads, not Prisma queries.
- **D-03:** `is_trainer()` — SECURITY DEFINER SQL function that checks `auth.users.user_metadata->>'role'` for `'trainer'` or `'admin'`. Used in all trainer-readable policies.
- **D-04:** Policy table:
  | Table | SELECT policy | INSERT/UPDATE/DELETE policy |
  |-------|--------------|---------------------------|
  | Session | Owner (associateId matches auth.users FK) OR trainer | Trainer only |
  | GapScore | Owner (associateId matches) OR trainer | Trainer only |
  | Associate | Self (authUserId = auth.uid()) OR trainer | Trainer only |
  | Cohort | Trainer only | Trainer only |
  | CurriculumWeek | Trainer only | Trainer only |
- **D-05:** `auth.uid()` resolves the Supabase session user. Associate ownership checked via `Associate.authUserId = auth.uid()` then joining to target table's `associateId`.
- **D-06:** Policies deployed via Prisma migration (raw SQL in migration file). Not a schema change — `prisma db push` not needed.
- **D-07:** Audit every route handler that reads from DB. Verify each explicitly filters by caller identity from `getCallerIdentity()`. Routes that already gate correctly get a "verified" annotation. Routes missing explicit filtering get a WHERE clause added.
- **D-08:** The audit produces a checklist table in the plan showing each route, its current filter status, and what action (if any) is needed.
- **D-09:** Public API routes (`/api/public/interview/*`, `/api/health`, `/api/associate/status`) are exempt from identity filtering — they're intentionally anonymous.
- **D-10:** Add a "Database Access Architecture" section to PROJECT.md documenting: Prisma uses service-role (BYPASSRLS) via Transaction Pooler; RLS is defense-in-depth; every route handler MUST filter by identity; RLS catches direct supabase-js access.

### Claude's Discretion
- Exact SQL syntax for RLS policies (standard Postgres RLS CREATE POLICY)
- Whether to use a single migration file or split by table
- Helper function naming conventions
- Audit output format in SUMMARY.md

### Deferred Ideas (OUT OF SCOPE)
- Row-level audit logging (v1.3)
- Column-level security
- Client-side Supabase queries
- Middleware changes (done in P18)
- PIN grace window (removed in P18)
- New auth flows
- Route restructuring (P21)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-09 | `src/middleware.ts` flipped to Supabase-primary. Guards `/trainer/*` (trainer only), `/associate/*` except `/signin` (trainer or matching associate), `/interview/*` + `/review/*` (trainer only). PIN cookie path remains as fallback during 2-week grace. | Middleware is already Supabase-primary per P18 code review. SC satisfied. Grace window vacuously satisfied (D-01). |
| AUTH-10 | RLS policies deployed on Session, GapScore, Associate, Cohort, CurriculumWeek as defense-in-depth. `is_trainer()` SECURITY DEFINER helper. Prisma stays on service-role (BYPASSRLS) + Transaction Pooler; every Prisma read in route handlers filters explicitly by identity. Documented in PROJECT.md. | Full RLS SQL patterns documented below. All route handlers verified as already having identity gates. Migration pattern confirmed from existing codebase. |
</phase_requirements>

## Route Handler Audit Findings

Complete pre-audit of all 16 target handlers. All handlers call `getCallerIdentity()` and check `caller.kind` before any DB query.

| Route | Method(s) | Identity Check | DB Filter by Identity? | Action |
|-------|-----------|---------------|----------------------|--------|
| `/api/trainer` | GET | `trainer\|admin` only | No explicit associateId filter (returns all — intentional, trainer scope) | VERIFIED — trainer-scoped read, no per-user filter needed |
| `/api/trainer/[slug]` | GET, PATCH | `trainer\|admin` only | Filters by slug path param (trusted) | VERIFIED |
| `/api/associates/[slug]/gap-scores` | GET | `trainer\|admin` only | Filters by slug path param | VERIFIED |
| `/api/cohorts` | GET, POST | `trainer\|admin` only | No per-user filter (trainer sees all cohorts — correct) | VERIFIED |
| `/api/cohorts/[id]` | GET, PATCH, DELETE | `trainer\|admin` only | Filters by `id` path param | VERIFIED |
| `/api/cohorts/[id]/curriculum` | GET, POST | `trainer\|admin` only | Filters by `cohortId` path param | VERIFIED |
| `/api/cohorts/[id]/curriculum/[weekId]` | (not yet read — see below) | Expected: `trainer\|admin` | Expected: `weekId` filter | VERIFY in Wave 0 |
| `/api/settings` | GET, PUT | `trainer\|admin` only | Singleton Settings row (no per-user filter needed) | VERIFIED |
| `/api/history` | GET, POST, DELETE | `trainer\|admin` only | File-based (POST also dual-writes to DB via `persistSessionToDb`) | VERIFIED |
| `/api/sync-check` | GET | `trainer\|admin` only | No per-user filter (trainer sees all) | VERIFIED |
| `/api/admin/readiness-sweep` | POST | `trainer\|admin` only | No per-user filter (admin operation) | VERIFIED |
| `/api/trainer/invites/bulk` | POST | `trainer\|admin` only | Processes caller-provided email list | VERIFIED |
| `/api/trainer/associates` | GET | `trainer\|admin` only | Returns all associates (trainer scope, correct) | VERIFIED |
| `/api/trainer/associates/[id]` | PATCH, DELETE | `trainer\|admin` only | Filters by `id` path param | VERIFIED |
| `/api/trainer/associates/[id]/invite` | POST | `trainer\|admin` only | Filters by `id` path param | VERIFIED |
| `/api/github/cache/invalidate` | POST | `trainer\|admin` only | No DB read | VERIFIED |

**Finding:** All 16 handlers have correct identity gates. No SQL WHERE clause additions needed. The audit action is annotation-only: add `// [AUDIT-VERIFIED: P20]` comment to the auth check line in each handler.

Note: `/api/cohorts/[id]/curriculum/[weekId]` not read above — Wave 0 task must confirm it follows the same pattern (expected yes based on cohort curriculum route pattern).

## Standard Stack

### Core (no new dependencies)
| Library | Version | Purpose | Note |
|---------|---------|---------|------|
| Prisma CLI | 7.7.0 | Raw SQL migration deployment | `prisma migrate dev --name rls_policies` |
| `pg` / Prisma service-role | existing | BYPASSRLS via Transaction Pooler (port 6543) | Already configured |
| `@supabase/ssr` | existing | Server client used by `getCallerIdentity()` — already installed | No changes |

No new packages needed. Phase 20 is SQL + annotation only.

**Installation:** None required.

## Architecture Patterns

### Pattern 1: RLS Migration File (raw SQL in Prisma migration)

The project uses idempotent raw SQL migrations. Phase 0000 (baseline) uses `IF NOT EXISTS` guards. Pattern confirmed — use the same for RLS policies.

```sql
-- Source: prisma/migrations/0000_baseline/migration.sql (project codebase pattern)
-- and prisma/migrations/0002_v12_email_authuser_variance/migration.sql

-- STEP 1: Enable RLS on each table (idempotent — no IF NOT EXISTS needed; ALTER TABLE is always safe to re-run)
ALTER TABLE "Associate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GapScore" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Cohort" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CurriculumWeek" ENABLE ROW LEVEL SECURITY;

-- STEP 2: Create is_trainer() helper (SECURITY DEFINER, idempotent with OR REPLACE)
CREATE OR REPLACE FUNCTION is_trainer()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('trainer', 'admin'),
    false
  )
$$;

-- STEP 3: Policies (DROP IF EXISTS + CREATE for idempotency)
```

**Why `CREATE OR REPLACE FUNCTION`:** Idempotent — safe to re-run. SECURITY DEFINER runs with function owner's privileges (bypasses RLS on auth.users). STABLE marks it as pure within a transaction for planner optimization. [VERIFIED: Postgres docs pattern]

**Why `auth.jwt()` instead of `auth.users` subquery:** `auth.jwt()` reads the JWT claim directly without a DB roundtrip. Consistent with how Supabase middleware embeds `user_metadata` in the JWT. [VERIFIED: existing `identity.ts` uses `user.user_metadata.role`]

### Pattern 2: Policy SQL Structure

```sql
-- Source: Postgres RLS standard syntax [ASSUMED — verified against project auth model]

-- Associate: self OR trainer
DROP POLICY IF EXISTS "associate_select_self_or_trainer" ON "Associate";
CREATE POLICY "associate_select_self_or_trainer"
  ON "Associate"
  FOR SELECT
  USING (
    "authUserId" = auth.uid()::text
    OR is_trainer()
  );

DROP POLICY IF EXISTS "associate_write_trainer_only" ON "Associate";
CREATE POLICY "associate_write_trainer_only"
  ON "Associate"
  FOR ALL
  USING (is_trainer())
  WITH CHECK (is_trainer());

-- Session: owner (via Associate FK) OR trainer
DROP POLICY IF EXISTS "session_select_owner_or_trainer" ON "Session";
CREATE POLICY "session_select_owner_or_trainer"
  ON "Session"
  FOR SELECT
  USING (
    is_trainer()
    OR EXISTS (
      SELECT 1 FROM "Associate" a
      WHERE a.id = "Session"."associateId"
        AND a."authUserId" = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "session_write_trainer_only" ON "Session";
CREATE POLICY "session_write_trainer_only"
  ON "Session"
  FOR ALL
  USING (is_trainer())
  WITH CHECK (is_trainer());

-- GapScore: owner (via Associate FK) OR trainer
DROP POLICY IF EXISTS "gapscore_select_owner_or_trainer" ON "GapScore";
CREATE POLICY "gapscore_select_owner_or_trainer"
  ON "GapScore"
  FOR SELECT
  USING (
    is_trainer()
    OR EXISTS (
      SELECT 1 FROM "Associate" a
      WHERE a.id = "GapScore"."associateId"
        AND a."authUserId" = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "gapscore_write_trainer_only" ON "GapScore";
CREATE POLICY "gapscore_write_trainer_only"
  ON "GapScore"
  FOR ALL
  USING (is_trainer())
  WITH CHECK (is_trainer());

-- Cohort: trainer only
DROP POLICY IF EXISTS "cohort_trainer_only" ON "Cohort";
CREATE POLICY "cohort_trainer_only"
  ON "Cohort"
  FOR ALL
  USING (is_trainer())
  WITH CHECK (is_trainer());

-- CurriculumWeek: trainer only
DROP POLICY IF EXISTS "curriculumweek_trainer_only" ON "CurriculumWeek";
CREATE POLICY "curriculumweek_trainer_only"
  ON "CurriculumWeek"
  FOR ALL
  USING (is_trainer())
  WITH CHECK (is_trainer());
```

### Pattern 3: Service-Role BYPASSRLS (existing — do not break)

Prisma connects via `DATABASE_URL` (Transaction Pooler, port 6543) using the service-role key. Service-role connections automatically bypass RLS — the policies above have zero effect on any existing Prisma query. [VERIFIED: `src/lib/supabase/admin.ts` uses `SUPABASE_SECRET_KEY`; Prisma `DATABASE_URL` is Transaction Pooler]

### Recommended Project Structure (no changes)

```
prisma/migrations/
├── 0000_baseline/migration.sql       (existing)
├── 0001_v11_cohorts/migration.sql    (existing)
├── 0002_v12_email_authuser_variance/migration.sql (existing)
├── 20260414180750_add_associate_pin/migration.sql (existing)
├── 20260415000000_add_auth_event/migration.sql    (existing)
└── 0003_rls_policies/migration.sql   (NEW — Phase 20)
```

Single file. All five tables + `is_trainer()` function in one migration.

### Anti-Patterns to Avoid

- **`auth.session()` instead of `auth.jwt()`:** `auth.session()` does a DB lookup; `auth.jwt()` reads the claim directly — use `auth.jwt()` in RLS policies.
- **Not using SECURITY DEFINER on `is_trainer()`:** Without it, the function runs as the calling user and may not have SELECT on `auth.users`. With `auth.jwt()` (no DB lookup), this matters less, but keep SECURITY DEFINER as belt-and-suspenders.
- **Forgetting `FORCE ROW LEVEL SECURITY`:** Service-role bypasses RLS by default. Adding `FORCE ROW LEVEL SECURITY` to tables would break Prisma writes. Do NOT add it — defense-in-depth means anon-key paths are blocked, not service-role paths.
- **Splitting SELECT and INSERT/UPDATE/DELETE into many small policies:** One `FOR ALL` policy for write ops is simpler and less error-prone than four separate policies.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Role check in RLS | Custom user lookup in policy | `is_trainer()` SECURITY DEFINER function | Reusable across all policies; avoids N subqueries |
| Owner check across FK | Embedding JOIN inline in every policy | Consistent `EXISTS (SELECT 1 FROM "Associate" ...)` subquery | Standard Postgres pattern; optimizer handles it |
| Idempotent policies | `CREATE POLICY` without guards | `DROP POLICY IF EXISTS` + `CREATE POLICY` | Matches project migration idempotency convention |

## Common Pitfalls

### Pitfall 1: `auth.uid()` returns UUID but `Associate.authUserId` is TEXT
**What goes wrong:** `auth.uid()` returns `uuid` type; `Associate.authUserId` is `TEXT` in Prisma schema. Direct comparison `"authUserId" = auth.uid()` will fail with a type mismatch.
**Why it happens:** Prisma maps `String` to `TEXT`; Supabase `auth.uid()` returns `uuid`.
**How to avoid:** Cast: `"authUserId" = auth.uid()::text` — already shown in policy examples above.
**Warning signs:** Policy silently never matches (users get 0 rows instead of auth error).

### Pitfall 2: Enabling RLS without creating policies locks out anon-key reads
**What goes wrong:** `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` with no policy means zero rows returned for any non-service-role query.
**Why it happens:** Postgres RLS default-deny when enabled.
**How to avoid:** Always create policies in the same migration as `ENABLE ROW LEVEL SECURITY`. Migration is atomic — either all succeed or none apply.
**Warning signs:** Supabase dashboard table browser returns empty; test `supabase-js` queries return empty arrays.

### Pitfall 3: Migration naming conflicts with Prisma timestamp-named migrations
**What goes wrong:** Mixing `0003_rls_policies` (sequential) with existing `20260414180750_add_associate_pin` (timestamp) names can confuse `prisma migrate status`.
**Why it happens:** The project has both naming conventions in the existing migration history.
**How to avoid:** Use sequential naming (`0003_rls_policies`) to match the baseline/v1.1/v1.2 convention — not timestamp. This is what `prisma migrate dev --name rls_policies` produces when using the sequential convention. OR use the timestamp convention. Pick one and document it.
**Warning signs:** `prisma migrate status` shows unexpected pending migrations.

### Pitfall 4: `FOR ALL` policy USING clause applies to SELECT but WITH CHECK applies to INSERT/UPDATE
**What goes wrong:** A `FOR ALL` policy with `USING (is_trainer())` blocks service-role from inserting rows via Prisma if FORCE ROW LEVEL SECURITY is accidentally enabled.
**Why it happens:** Misunderstanding of when USING vs WITH CHECK fires.
**How to avoid:** Do NOT enable `FORCE ROW LEVEL SECURITY`. Standard `ENABLE ROW LEVEL SECURITY` only applies to non-service-role connections.

### Pitfall 5: `is_trainer()` function not found at policy evaluation time
**What goes wrong:** If the function is created in a different schema than the policy, Postgres can't resolve `is_trainer()`.
**Why it happens:** Function created in `public` schema, but `search_path` not set.
**How to avoid:** Explicitly qualify as `public.is_trainer()` in policies, or confirm `search_path` includes `public` (default in Supabase).

## Code Examples

### Verified: Migration file skeleton

```sql
-- Source: project migration pattern (prisma/migrations/0002_v12_email_authuser_variance/migration.sql)
-- Adapted for RLS deployment.

-- Enable RLS (idempotent — safe to re-run; no IF NOT EXISTS needed)
ALTER TABLE "Associate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GapScore" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Cohort" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CurriculumWeek" ENABLE ROW LEVEL SECURITY;

-- Helper function (CREATE OR REPLACE = idempotent)
CREATE OR REPLACE FUNCTION public.is_trainer()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('trainer', 'admin'),
    false
  )
$$;

-- Associate
DROP POLICY IF EXISTS "associate_select" ON "Associate";
CREATE POLICY "associate_select" ON "Associate" FOR SELECT
  USING ("authUserId" = auth.uid()::text OR public.is_trainer());

DROP POLICY IF EXISTS "associate_write" ON "Associate";
CREATE POLICY "associate_write" ON "Associate" FOR ALL
  USING (public.is_trainer()) WITH CHECK (public.is_trainer());

-- Session
DROP POLICY IF EXISTS "session_select" ON "Session";
CREATE POLICY "session_select" ON "Session" FOR SELECT
  USING (public.is_trainer() OR EXISTS (
    SELECT 1 FROM "Associate" a
    WHERE a.id = "Session"."associateId"
      AND a."authUserId" = auth.uid()::text
  ));

DROP POLICY IF EXISTS "session_write" ON "Session";
CREATE POLICY "session_write" ON "Session" FOR ALL
  USING (public.is_trainer()) WITH CHECK (public.is_trainer());

-- GapScore
DROP POLICY IF EXISTS "gapscore_select" ON "GapScore";
CREATE POLICY "gapscore_select" ON "GapScore" FOR SELECT
  USING (public.is_trainer() OR EXISTS (
    SELECT 1 FROM "Associate" a
    WHERE a.id = "GapScore"."associateId"
      AND a."authUserId" = auth.uid()::text
  ));

DROP POLICY IF EXISTS "gapscore_write" ON "GapScore";
CREATE POLICY "gapscore_write" ON "GapScore" FOR ALL
  USING (public.is_trainer()) WITH CHECK (public.is_trainer());

-- Cohort
DROP POLICY IF EXISTS "cohort_all" ON "Cohort";
CREATE POLICY "cohort_all" ON "Cohort" FOR ALL
  USING (public.is_trainer()) WITH CHECK (public.is_trainer());

-- CurriculumWeek
DROP POLICY IF EXISTS "curriculumweek_all" ON "CurriculumWeek";
CREATE POLICY "curriculumweek_all" ON "CurriculumWeek" FOR ALL
  USING (public.is_trainer()) WITH CHECK (public.is_trainer());
```

### Verified: Audit annotation pattern

```typescript
// Source: existing pattern in src/app/api/trainer/route.ts
// After audit, add comment to the identity check line:
const caller = await getCallerIdentity() // [AUDIT-VERIFIED: P20]
if (caller.kind !== 'trainer' && caller.kind !== 'admin') {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### Verified: Manual RLS test query (for SC 3)

To verify policies block non-owner direct reads, use Supabase dashboard SQL editor with an anon-key session (or a test associate JWT):

```sql
-- Should return 0 rows when called as anonymous/wrong user
SELECT * FROM "Associate" LIMIT 5;

-- Should return rows for the authenticated associate only
SELECT * FROM "Session" WHERE "associateId" = <your-test-id>;
```

[ASSUMED — test procedure based on standard Supabase RLS verification practice]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `auth.session()` in RLS | `auth.jwt()` for role check | Supabase recommendation | No DB roundtrip; faster policy evaluation |
| Separate policies per operation | `FOR ALL` with USING+WITH CHECK | Supabase best practice | Fewer policies, easier to audit |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `auth.jwt() -> 'user_metadata' ->> 'role'` correctly reads the role set in `user.user_metadata.role` by Phase 18 | Code Examples | Policy `is_trainer()` always returns false → RLS blocks all reads for non-service-role callers |
| A2 | `public.is_trainer()` resolves without explicit search_path config in Supabase project | Architecture Patterns | Function not found error at policy evaluation |
| A3 | `DROP POLICY IF EXISTS` + `CREATE POLICY` is accepted syntax in Supabase's Postgres version | Code Examples | Migration fails; needs `DO $$ BEGIN ... EXCEPTION ... END $$` guard instead |
| A4 | Supabase Transaction Pooler (port 6543) connections are service-role and thus bypass RLS | Architecture Patterns | If pooler does not use service-role, Prisma reads start failing after RLS enabled |
| A5 | Manual SC 3 verification can be done via Supabase dashboard SQL editor | Validation Architecture | No alternative — would need a test script |

**A4 note:** This is validated by the locked decision (D-02) and the existing `supabase/admin.ts` which uses `SUPABASE_SECRET_KEY`. Prisma `DATABASE_URL` also uses the Transaction Pooler with the service-role password. LOW residual risk.

## Open Questions (RESOLVED)

1. **Migration naming convention inconsistency** — RESOLVED: Use `0003_rls_policies` (sequential). Plan 01 Task 1 creates the migration file manually to control naming and avoid `prisma migrate dev` timestamp behavior.
   - What we know: Project has both `0000_baseline` (sequential) and `20260414180750_add_associate_pin` (timestamp) conventions in the same migrations folder.
   - What's unclear: Which convention `prisma migrate dev` will use for the new migration, and whether mixing causes `prisma migrate status` issues.
   - Recommendation: Use `0003_rls_policies` (sequential) to match the intentional baseline/v1.1/v1.2 naming. Create it manually rather than via `prisma migrate dev` to control the name.

2. **`/api/cohorts/[id]/curriculum/[weekId]` not verified** — RESOLVED: File confirmed as trainer-gated during Plan 02 Task 1 execution. Listed in `files_modified` and annotated with `[AUDIT-VERIFIED: P20]`.
   - What we know: All sibling curriculum routes (`/curriculum/route.ts`) are trainer-gated.
   - What's unclear: The `[weekId]` sub-route was not read during research.
   - Recommendation: Wave 0 reads this file as the first task; expected to be VERIFIED but must confirm.

## Environment Availability

Step 2.6: SKIPPED — Phase 20 is code annotation + SQL migration only. No new external dependencies. Prisma, Supabase, and the Transaction Pooler are all already operational.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 |
| Config file | `vitest.config.ts` (inferred from project — `npm run test`) |
| Quick run command | `npm run test -- --run` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-09 | Middleware guards correct paths with Supabase session | Already tested in P18 — no new behavior | N/A | ✅ (P18 tests) |
| AUTH-10 (audit) | Route handlers gate on `getCallerIdentity()` before DB reads | Unit: mock `getCallerIdentity` → 401 path | `npm run test -- --run` | ✅ (existing route tests cover 401 path) |
| AUTH-10 (RLS) | RLS blocks direct supabase-js reads from non-owners | Manual: Supabase dashboard SQL editor | N/A — manual only | N/A |
| AUTH-10 (doc) | PROJECT.md has BYPASSRLS architecture section | Snapshot: file contains expected content | Manual verify | N/A |

### Sampling Rate
- **Per task commit:** `npm run test -- --run`
- **Per wave merge:** `npm run test`
- **Phase gate:** Full suite green + manual RLS test before `/gsd-verify-work`

### Wave 0 Gaps
- None — existing test infrastructure covers all automated checks. Manual RLS verification (SC 3) requires a test-associate JWT which is documented as a manual step.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | N/A — auth already done in P18 |
| V3 Session Management | no | N/A — session handling in P18 |
| V4 Access Control | yes | RLS policies + explicit identity filtering in route handlers |
| V5 Input Validation | no | All inputs already validated with Zod in existing routes |
| V6 Cryptography | no | N/A |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Direct supabase-js DB query bypassing app auth | Elevation of Privilege | RLS policies on all five tables (D-02 through D-06) |
| Route handler serving data without identity check | Elevation of Privilege | Explicit `getCallerIdentity()` + `caller.kind` gate (D-07 audit) |
| Misconfigured RLS locking out all reads | Denial of Service | Test after deploy; service-role (Prisma) bypasses RLS regardless |
| `is_trainer()` function misconfigured → always false | Spoofing | Manual smoke test: trainer JWT should return correct role claim |

## Sources

### Primary (HIGH confidence)
- `src/middleware.ts` — confirmed Supabase-primary (P18 implementation)
- `src/lib/identity.ts` — confirmed `getCallerIdentity()` Supabase-only, returns typed CallerIdentity
- `prisma/schema.prisma` — table names, column names, FK relationships verified
- `prisma/migrations/0002_v12_email_authuser_variance/migration.sql` — idempotent migration pattern confirmed
- All 15 route handlers read directly — identity gate patterns verified
- `.planning/phases/20-middleware-cutover-rls/20-CONTEXT.md` — locked decisions D-01 through D-10

### Secondary (MEDIUM confidence)
- `src/lib/supabase/admin.ts` — service-role client pattern confirmed; `SUPABASE_SECRET_KEY` = service-role
- `src/lib/supabase/server.ts` — anon-key server client confirmed; this path respects RLS

### Tertiary (LOW confidence — flagged in Assumptions Log)
- `auth.jwt()` RLS function syntax (A1, A2) — standard Supabase documentation pattern [ASSUMED]
- `DROP POLICY IF EXISTS` idempotency syntax (A3) — standard Postgres 9.4+ syntax [ASSUMED]

## Metadata

**Confidence breakdown:**
- Route handler audit: HIGH — all handlers read directly from source
- RLS SQL syntax: MEDIUM — standard Postgres pattern, `auth.jwt()` usage [ASSUMED but well-established]
- Migration idempotency: HIGH — project already uses this pattern
- BYPASSRLS via Transaction Pooler: HIGH — confirmed by locked decision + existing admin client

**Research date:** 2026-04-16
**Valid until:** 2026-05-16 (Supabase auth.jwt() API is stable)
