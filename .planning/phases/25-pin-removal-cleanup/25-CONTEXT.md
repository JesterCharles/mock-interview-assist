# Phase 25: PIN Removal + Cleanup — Context

**Gathered:** 2026-04-16
**Status:** Ready for planning
**Source:** /gsd-discuss-phase --auto

<domain>
## Phase Boundary

Delete all PIN-based auth code, drop PIN schema columns, remove legacy env vars, add CI grep-gate to prevent resurrection. Pure cleanup — no new features.

**Out of scope:** New auth features, Supabase auth changes (already done P18), middleware changes (already done P18/P20).

</domain>

<decisions>
## Implementation Decisions

### Code Deletion (CLEANUP-02)
- **D-01:** Delete files: `src/lib/pinService.ts`, `src/lib/pinAttemptLimiter.ts`, `src/lib/associateSession.ts`, `src/lib/featureFlags.ts`
- **D-02:** Delete routes: `src/app/api/associate/pin/generate/route.ts`, `src/app/api/associate/pin/verify/route.ts` (and test files)
- **D-03:** Delete `/associate/login` redirect page
- **D-04:** Remove `SignInTabs` feature flag logic (the `ENABLE_ASSOCIATE_AUTH` conditional hiding of the Associate tab). Associate tab always visible now.
- **D-05:** Delete all PIN-related test files

### Schema Migration (CLEANUP-02)
- **D-06:** Prisma migration drops `Associate.pinHash` and `Associate.pinGeneratedAt` columns. Named `0004_drop_pin_columns`.
- **D-07:** Migration is destructive (drops columns). Acceptable — PIN data was never used in production.

### Env Var Cleanup (CLEANUP-03)
- **D-08:** Remove `APP_PASSWORD`, `ASSOCIATE_SESSION_SECRET`, `ENABLE_ASSOCIATE_AUTH` from: `.env.example`, `.env.docker`, `docker-compose.yml` (if referenced), CLAUDE.md, PROJECT.md, any deploy docs.
- **D-09:** Verify app boots with only Supabase env vars present (no PIN env vars).

### CI Grep Gate (CLEANUP-01)
- **D-10:** Script or test that greps `src/` for PIN-related patterns: `ENABLE_ASSOCIATE_AUTH|pinHash|pinGeneratedAt|associate_session|verifyAssociateToken|isAssociateAuthEnabled`. Fails if any match found.
- **D-11:** Implemented as a Vitest test file (`src/__tests__/pin-removal-gate.test.ts`) — runs in the existing test suite. Not a separate CI step (simpler, works with existing infrastructure).

### Claude's Discretion
- Order of file deletions
- Whether to grep-verify each deletion before committing
- Exact Vitest test structure for the grep gate
- Whether to consolidate into one commit or per-category commits

</decisions>

<canonical_refs>
## Canonical References

### Roadmap + Requirements
- `.planning/ROADMAP.md` — Phase 25, SC 1-5
- `.planning/REQUIREMENTS.md` — CLEANUP-01, CLEANUP-02, CLEANUP-03

### Files to Delete
- `src/lib/pinService.ts`
- `src/lib/pinAttemptLimiter.ts`
- `src/lib/associateSession.ts`
- `src/lib/featureFlags.ts`
- `src/app/api/associate/pin/generate/route.ts`
- `src/app/api/associate/pin/verify/route.ts`
- `src/app/api/associate/pin/verify/route.test.ts`
- `src/app/associate/login/` (redirect page)

### Files to Modify
- `src/app/signin/SignInTabs.tsx` — Remove feature flag conditional
- `.env.example` — Remove PIN env vars
- `.env.docker` — Remove PIN env vars
- `CLAUDE.md` — Remove PIN references
- `.planning/PROJECT.md` — Remove PIN references
- `prisma/schema.prisma` — Remove pinHash + pinGeneratedAt fields

</canonical_refs>

<code_context>
## Existing Code Insights

### What's Being Removed
- PIN auth system was feature-gated behind `ENABLE_ASSOCIATE_AUTH` (default false in v1.1)
- PIN never shipped to production (P18 decision confirmed)
- All auth now goes through Supabase (P18)
- Middleware already Supabase-only (P18/P20)

### Integration Points
- Schema migration (drop columns)
- Vitest grep-gate test (new file)
- Doc updates (CLAUDE.md, PROJECT.md, env files)

</code_context>

<specifics>
## Specific Ideas

- This is the cleanest phase in the milestone — pure deletion + verification.
- The grep-gate as a Vitest test is elegant — automatically runs in CI, no separate script needed.
- Schema migration is destructive but safe — PIN data was never populated in production.

</specifics>

<deferred>
## Deferred Ideas

None — this is a cleanup phase with fixed scope.

</deferred>

---

*Phase: 25-pin-removal-cleanup*
*Context gathered: 2026-04-16 via /gsd-discuss-phase --auto*
