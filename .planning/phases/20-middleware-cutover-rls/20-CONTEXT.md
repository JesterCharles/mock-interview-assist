# Phase 20: Middleware Cutover + RLS — Context

**Gathered:** 2026-04-16
**Status:** Ready for planning
**Source:** /gsd-discuss-phase --auto (all decisions auto-selected)

<domain>
## Phase Boundary

Deploy RLS policies as defense-in-depth on Supabase tables, audit all route handlers for explicit identity filtering, and document the BYPASSRLS + Transaction Pooler architecture in PROJECT.md.

**Middleware is already Supabase-primary** — Phase 18 rewrote `src/middleware.ts` and `src/lib/identity.ts` to use Supabase session as the sole identity source. Phase 20 does NOT touch middleware or identity resolution. It focuses on the database layer (RLS) and the route handler audit.

**PIN grace window is NOT in scope** — Phase 18 explicitly removed PIN grace from scope ("The PIN-based associate flow never shipped to production. Delete ENABLE_ASSOCIATE_AUTH coexistence logic from AUTH-08 scope."). SC 2 from the roadmap is superseded by this decision. Phase 25 owns PIN deletion.

**Out of scope:** Middleware changes (already done P18), PIN grace window (removed P18), new auth flows, route restructuring (P21).

</domain>

<decisions>
## Implementation Decisions

### PIN Grace Window (SC 2 Reconciliation)
- **D-01:** SC 2 ("Legacy PIN cookie still authorizes during the 2-week grace window") is **superseded** by Phase 18 decision. PIN never shipped to production. `getCallerIdentity()` already reads Supabase session only (no PIN fallback). No grace window code needed. SC 2 is satisfied vacuously — there are no legacy PIN sessions to support.

### RLS Policy Design (AUTH-10)
- **D-02:** RLS policies are **defense-in-depth only**. Prisma runs on the service-role connection (BYPASSRLS via Transaction Pooler). RLS catches unauthorized direct `supabase-js` reads, not Prisma queries.
- **D-03:** `is_trainer()` — SECURITY DEFINER SQL function that checks `auth.users.user_metadata->>'role'` for `'trainer'` or `'admin'`. Used in all trainer-readable policies.
- **D-04:** Policy table:

| Table | SELECT policy | INSERT/UPDATE/DELETE policy |
|-------|--------------|---------------------------|
| Session | Owner (associateId matches auth.users FK) OR trainer | Trainer only (app creates via Prisma) |
| GapScore | Owner (associateId matches) OR trainer | Trainer only |
| Associate | Self (authUserId = auth.uid()) OR trainer | Trainer only |
| Cohort | Trainer only | Trainer only |
| CurriculumWeek | Trainer only | Trainer only |

- **D-05:** `auth.uid()` resolves the Supabase session user. Associate ownership is checked via `Associate.authUserId = auth.uid()` then joining to the target table's `associateId`.
- **D-06:** Policies deployed via Prisma migration (raw SQL in migration file). Not a schema change — `prisma db push` not needed.

### Route Handler Identity Filter Audit
- **D-07:** Audit every route handler that reads from DB. Verify each explicitly filters by caller identity from `getCallerIdentity()`. Routes that already gate correctly get a "verified" annotation in the audit. Routes missing explicit filtering get a WHERE clause added.
- **D-08:** The audit produces a checklist table in the plan showing each route, its current filter status, and what action (if any) is needed.
- **D-09:** Public API routes (`/api/public/interview/*`, `/api/health`, `/api/associate/status`) are exempt from identity filtering — they're intentionally anonymous.

### PROJECT.md Documentation
- **D-10:** Add a "Database Access Architecture" section to PROJECT.md documenting:
  - Prisma uses service-role (BYPASSRLS) via Transaction Pooler
  - RLS is defense-in-depth, not the primary access control
  - Every route handler MUST filter by identity (explicit-filter requirement)
  - RLS catches direct supabase-js access from client-side or edge functions

### Claude's Discretion
- Exact SQL syntax for RLS policies (standard Postgres RLS CREATE POLICY)
- Whether to use a single migration file or split by table
- Helper function naming conventions
- Audit output format in SUMMARY.md

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap + Requirements
- `.planning/ROADMAP.md` — Phase 20 section, SC 1-5
- `.planning/REQUIREMENTS.md` — AUTH-09, AUTH-10

### Prior Phase Context
- `.planning/phases/18-supabase-auth-install/18-CONTEXT.md` — Auth decisions: three-role model, PIN grace removed, getCallerIdentity Supabase-only, middleware rewrite
- `.planning/phases/19-bulk-invite/19-CONTEXT.md` — Bulk invite uses inviteHelper + getCallerIdentity pattern

### Existing Code (must honor)
- `src/middleware.ts` — Already Supabase-primary (P18). Phase 20 does NOT modify this.
- `src/lib/identity.ts` — `getCallerIdentity()` already Supabase-only. Phase 20 does NOT modify this.
- `src/lib/supabase/admin.ts` — Service-role client (BYPASSRLS)
- `src/lib/supabase/server.ts` — Server client (respects RLS when used with anon key)
- `prisma/schema.prisma` — All table models (Associate, Session, GapScore, Cohort, CurriculumWeek)

### All Route Handlers (audit targets)
- `src/app/api/trainer/route.ts` — Roster endpoint
- `src/app/api/trainer/[slug]/route.ts` — Associate detail
- `src/app/api/associates/[slug]/gap-scores/route.ts` — Gap scores
- `src/app/api/cohorts/route.ts` — Cohort CRUD
- `src/app/api/cohorts/[id]/route.ts` — Cohort detail
- `src/app/api/cohorts/[id]/curriculum/route.ts` — Curriculum CRUD
- `src/app/api/cohorts/[id]/curriculum/[weekId]/route.ts` — Curriculum week
- `src/app/api/settings/route.ts` — Settings
- `src/app/api/history/route.ts` — Interview history
- `src/app/api/sync-check/route.ts` — Sync check
- `src/app/api/admin/readiness-sweep/route.ts` — Admin sweep
- `src/app/api/trainer/invites/bulk/route.ts` — Bulk invite
- `src/app/api/trainer/associates/route.ts` — Associates management
- `src/app/api/trainer/associates/[id]/route.ts` — Associate by ID
- `src/app/api/trainer/associates/[id]/invite/route.ts` — Single invite
- `src/app/api/github/cache/invalidate/route.ts` — Cache invalidate

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `getCallerIdentity()` — Already returns `{ kind, userId, email, associateId?, associateSlug? }`. All route handlers already call this.
- `supabaseAdmin` — Service-role client for admin operations. BYPASSRLS.
- Prisma singleton — All DB access goes through `prisma` import.

### Established Patterns
- Route handlers call `getCallerIdentity()` first, then gate on `caller.kind`
- Most trainer routes already check `caller.kind !== 'trainer' && caller.kind !== 'admin'` → 401
- Associate routes check `caller.kind === 'associate'` and verify slug match

### Integration Points
- New Prisma migration file for RLS SQL
- PROJECT.md update (documentation only)
- No new routes, no new components, no new dependencies

</code_context>

<specifics>
## Specific Ideas

- RLS policies are additive — they don't change any existing behavior since Prisma uses BYPASSRLS.
- The audit is the most valuable part: ensures every route explicitly filters, creating a defense-in-depth layer at the application level that's independent of RLS.
- `is_trainer()` function is reusable across all trainer-scoped policies.
- Migration file uses raw SQL within Prisma migration framework (same pattern as P17 idempotent migration).

</specifics>

<deferred>
## Deferred Ideas

- **Row-level audit logging** — Track who accessed what via RLS. Adds complexity, defer to v1.3.
- **Column-level security** — Hide sensitive fields from associates. Not needed for current data model.
- **Client-side Supabase queries** — Currently all queries go through Prisma on server. If future features use `supabase-js` client-side, RLS becomes the primary guard. Deferred.

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 20-middleware-cutover-rls*
*Context gathered: 2026-04-16 via /gsd-discuss-phase --auto*
