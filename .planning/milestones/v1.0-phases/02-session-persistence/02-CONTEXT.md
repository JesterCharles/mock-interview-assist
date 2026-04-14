# Phase 2: Session Persistence - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Dual-write every completed mock session to both Supabase and the existing file-based storage. Existing interview flows (trainer-led and public automated) must keep working unchanged. Add a sync-check endpoint to verify file/DB parity.

</domain>

<decisions>
## Implementation Decisions

### Dual-Write Location
- **D-01:** Dual-write happens in the `/api/history` POST handler — the single place where sessions are saved. Add Supabase write alongside the existing file write. If DB write fails, log error but don't fail the request (file write is the fallback during migration).

### Session Schema
- **D-02:** Full Prisma schema for sessions defined in this phase. Maps from existing `InterviewSession` TypeScript type. Key fields: id, candidateName, interviewerName, date, status, questionCount, scores (overall technical, soft skill), assessments stored as JSON column, timestamps.

### Assessments Storage
- **D-03:** Store per-question assessments as a JSON column (Prisma `Json` type) rather than normalized tables. Rationale: assessment structure is complex (keywords, soft skills, LLM scores, trainer overrides) and doesn't need independent querying in MVP. Phase 4 gap scoring reads the JSON.

### Sync-Check Endpoint
- **D-04:** New `/api/sync-check` route that compares session counts between file storage and DB, plus spot-checks the 5 most recent sessions by ID. Returns `{ fileCount, dbCount, matched, mismatches[] }`.

### Public Interview Persistence
- **D-05:** Public automated interviews (`/api/public/interview/*`) also persist via the same dual-write path. The public interview agent endpoint should call the history save after session completion.

### Claude's Discretion
- Error handling strategy for partial dual-write failures (log-and-continue vs retry)
- Whether to add created_at/updated_at as Prisma-managed fields or use the existing `date` field
- Transaction handling for the DB write (single insert, no transaction needed for one table)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Code
- `src/app/api/history/route.ts` — Current file-based session save (POST handler is the dual-write point)
- `src/lib/types.ts` — `InterviewSession`, `QuestionAssessment`, `SoftSkillsAssessment` types that schema must align with
- `src/app/api/public/interview/agent/route.ts` — Public interview agent that needs to persist sessions
- `src/app/api/public/interview/start/route.ts` — Public interview start endpoint
- `src/lib/cleanupService.ts` — Existing cleanup (72-hour file retention) — DB retention policy may differ

### Stack Decisions
- `CLAUDE.md` §Technology Stack — Prisma 7.7.0, pg 8.20.0, adapter-pg versions
- `.planning/phases/01-db-foundation/01-CONTEXT.md` — Phase 1 decisions (singleton, pooling, health endpoint)

### Requirements
- `.planning/REQUIREMENTS.md` — PERSIST-01 (session persistence), PERSIST-04 (dual-write), PERSIST-05 (sync check)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/api/history/route.ts` — readHistory/writeHistory functions stay unchanged; dual-write adds alongside
- `src/lib/types.ts` — InterviewSession type is the source of truth for schema mapping

### Established Patterns
- API routes use `NextRequest`/`NextResponse` with `isAuthenticatedSession()` guard
- File ops use synchronous `fs.readFileSync`/`fs.writeFileSync`
- History is capped at 100 sessions in file storage
- Sessions identified by `id` field, upsert logic exists (findIndex check)

### Integration Points
- `/api/history` POST — Primary insertion point for dual-write
- `src/store/interviewStore.ts` — Zustand store triggers history save on interview completion
- Public interview agent route — Needs to trigger session persistence after completion
- Prisma client singleton from Phase 1 — imported into history route

</code_context>

<specifics>
## Specific Ideas

No specific requirements — standard dual-write pattern with file-first fallback.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-session-persistence*
*Context gathered: 2026-04-13*
