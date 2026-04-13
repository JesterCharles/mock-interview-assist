# Phase 3: Associate Profiles - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Persistent associate identity via trainer-assigned slugs. Associates are linked across sessions without requiring login. Trainers assign a slug/ID during interview setup, and all sessions for that slug are grouped under one profile.

</domain>

<decisions>
## Implementation Decisions

### Identity Model
- **D-01:** Trainer-assigned slugs — simple text identifiers (e.g., "john-doe", "jsmith"). No auto-generation, no login. Trainer types slug during interview setup wizard (Phase 1 of dashboard setup).

### Slug Input Location
- **D-02:** Add slug/candidate identifier field to the dashboard setup wizard (Phase 3 of setup, alongside candidateName). The slug is optional — sessions without a slug are anonymous (backward compatible with existing flow).

### Profile Schema
- **D-03:** New `Associate` Prisma model: id (auto), slug (unique), displayName, createdAt, updatedAt. Session model gets a foreign key to Associate (nullable — existing sessions have no associate).

### Profile Page
- **D-04:** New `/associate/[slug]` route showing all sessions for that associate. Simple list view — no charts or gap scores (that's Phase 4+). Shows session date, score summary, status.

### Slug Validation
- **D-05:** Slugs are lowercased, trimmed, alphanumeric + hyphens only. Validated on input. If slug already exists, sessions attach to existing associate. If new, create associate record.

### Claude's Discretion
- Whether to add slug to the Zustand store or handle entirely server-side
- Profile page layout details (simple list is sufficient)
- Error handling for invalid slugs

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Code
- `src/app/dashboard/page.tsx` — Setup wizard where slug input will be added
- `src/store/interviewStore.ts` — Zustand store with `candidateName` field (slug may live alongside)
- `src/lib/types.ts` — `InterviewSession` type needs optional `associateSlug` field
- `src/app/api/history/route.ts` — POST handler needs to link session to associate

### Prior Phase Decisions
- `.planning/phases/01-db-foundation/01-CONTEXT.md` — Prisma singleton, connection patterns
- `.planning/phases/02-session-persistence/02-CONTEXT.md` — Session schema, dual-write location

### Requirements
- `.planning/REQUIREMENTS.md` — PERSIST-02 (associate profiles with trainer-assigned slug/ID)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Dashboard setup wizard already has candidateName input — slug field goes alongside
- `isAuthenticatedSession()` guard pattern reusable for profile routes

### Established Patterns
- Setup wizard is 3-phase (repo → techs → count/candidate). Slug adds to Phase 3
- API routes use standard NextResponse pattern

### Integration Points
- Dashboard setup wizard — add slug input
- `/api/history` POST — link session to associate on save
- Prisma schema — new Associate model + Session.associateSlug FK
- New route: `/associate/[slug]` for profile view

</code_context>

<specifics>
## Specific Ideas

No specific requirements — standard slug-based identity pattern.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-associate-profiles*
*Context gathered: 2026-04-13*
