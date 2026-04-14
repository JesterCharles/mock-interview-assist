# Phase 2: Session Persistence - Research

**Researched:** 2026-04-13
**Domain:** Prisma 7 dual-write pattern, Next.js 16 App Router API routes, JSON column mapping
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01 (Dual-Write Location):** Dual-write happens in the `/api/history` POST handler. Add Supabase write alongside the existing file write. If DB write fails, log error but don't fail the request (file write is the fallback during migration).
- **D-02 (Session Schema):** Full Prisma schema for sessions defined in this phase. Key fields: id, candidateName, interviewerName, date, status, questionCount, scores (overall technical, soft skill), assessments stored as JSON column, timestamps.
- **D-03 (Assessments Storage):** Store per-question assessments as a JSON column (Prisma `Json` type), not normalized tables. Rationale: complex structure doesn't need independent querying in MVP; Phase 4 gap scoring reads the JSON.
- **D-04 (Sync-Check Endpoint):** New `/api/sync-check` route comparing session counts between file storage and DB, plus spot-checks the 5 most recent sessions by ID. Returns `{ fileCount, dbCount, matched, mismatches[] }`.
- **D-05 (Public Interview Persistence):** Public automated interviews also persist via the same dual-write path. The public interview agent endpoint should call the history save after session completion.

### Claude's Discretion
- Error handling strategy for partial dual-write failures (log-and-continue vs retry)
- Whether to add created_at/updated_at as Prisma-managed fields or use the existing `date` field
- Transaction handling for the DB write (single insert, no transaction needed for one table)

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PERSIST-01 | Every mock session stored in Supabase with full scoring data (questions, scores by dimension, trainer overrides, timestamps) | Prisma `Json` type maps `assessments: Record<string, QuestionAssessment>` directly; `upsert` handles both insert and update cases |
| PERSIST-04 | Dual-write to both file storage and Supabase during migration period | Async try/catch wrapper around existing POST handler; file write stays synchronous, DB write is additive |
| PERSIST-05 | Sync check endpoint compares session counts between file and DB to detect divergence | New `/api/sync-check` route: `prisma.session.count()` vs `readHistory().length`; spot-check 5 most recent IDs |
</phase_requirements>

---

## Summary

Phase 2 is a targeted integration task: wire the Prisma singleton from Phase 1 into the existing `/api/history` POST handler, add a `Session` model with full field coverage of `InterviewSession`, and create a sync-check endpoint. The public interview mode (`src/app/page.tsx`) currently does NOT save to history at all — it generates a PDF client-side and discards session data. D-05 requires either adding a server-side save call or creating a new `/api/public/interview/complete` endpoint.

The critical design choice this phase establishes is the **Prisma Session model schema**. The `InterviewSession` TypeScript type (in `src/lib/types.ts`) contains nested structures (`questions: ParsedQuestion[]`, `assessments: Record<string, QuestionAssessment>`, `starterQuestions: StarterQuestion[]`) that do not map cleanly to flat columns. The decision (D-03) to store `assessments` as a JSON column is correct. However, `questions` and `starterQuestions` also need to be stored — either as additional JSON columns or excluded from the DB record (since they can be reconstructed from the question bank). This is a discretion point to resolve during planning.

The dual-write pattern is straightforward: wrap the Prisma upsert in a try/catch after the file write, log failures, and return success regardless. The sync-check endpoint is read-only and low risk.

**Primary recommendation:** Store `questions`, `starterQuestions`, and `assessments` all as `Json` columns for MVP simplicity. The full `InterviewSession` shape can be serialized directly. Phase 4's gap scoring will read `assessments` from the JSON column — no normalization needed until then.

---

## Project Constraints (from CLAUDE.md)

- Framework: Next.js 16.1.1, App Router, TypeScript 5
- ORM: Prisma 7.7.0 (`@prisma/client@7.7.0`, `@prisma/adapter-pg@7.7.0`, `pg@8.20.0`)
- Imports from `@/generated/prisma` (NOT `@prisma/client`) — custom output path from Phase 1
- Prisma singleton exported from `src/lib/prisma.ts`
- API routes use `NextRequest`/`NextResponse` pattern with `isAuthenticatedSession()` guard
- Path alias: `@/*` maps to `src/*`
- No new ORM or data layer libraries — Prisma handles all DB writes
- `zod@4.3.6` for request payload validation (already listed in CLAUDE.md recommended stack; must verify if installed)
- Docker standalone build: `outputFileTracingIncludes` already configured in Phase 1

---

## Standard Stack

### Core (Phase 1 foundation — already being installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| prisma (CLI) | 7.7.0 | Schema migration for Session model | Phase 1 installs this; Phase 2 extends the schema |
| @prisma/client | 7.7.0 | Session upsert, count, findMany queries | Phase 1 installs this |
| @prisma/adapter-pg | 7.7.0 | pg connection adapter | Phase 1 installs this |
| pg | 8.20.0 | PostgreSQL driver | Phase 1 installs this |

### New in Phase 2

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | 4.3.6 | Validate `/api/history` POST body before DB write | CLAUDE.md mandates; need to verify if already installed |

**Version verification:** `zod` is NOT in current `package.json` dependencies [VERIFIED: read package.json — zod absent]. Must be installed. `npm view zod version` → 4.3.6 assumed per CLAUDE.md stack doc; verify at install time. [ASSUMED — CLAUDE.md listed this version but it was not verified against live npm registry in this session]

**Installation (new deps only):**
```bash
npm install zod@4.3.6
```

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Prisma `Json` for assessments | Normalized `Assessment` table | Normalization enables per-question querying but adds join complexity; MVP gap scoring only needs to scan all assessments per session, not query a specific question across sessions |
| Single `data Json` column for entire session | Multiple typed scalar columns | Single blob loses queryability entirely; scalar columns for `candidateName`, `overallTechnicalScore`, etc. enable future `ORDER BY score` queries without JSON extraction |

---

## Architecture Patterns

### Recommended Project Structure (changes only)

```
prisma/
└── schema.prisma          # Add full Session model (extend Phase 1 skeleton)

src/
├── lib/
│   └── prisma.ts          # No change — singleton from Phase 1
├── app/
│   └── api/
│       ├── history/
│       │   └── route.ts   # Add dual-write to POST handler
│       └── sync-check/
│           └── route.ts   # New endpoint (D-04)
```

### Pattern 1: Prisma Session Model Schema

Map from `InterviewSession` TypeScript type to Prisma schema. Key decisions:
- Scalar columns for queryable fields (candidateName, status, scores, dates)
- `Json` columns for complex nested structures that aren't queried independently

```prisma
// Source: Prisma docs — Json type, prisma.io/docs/orm/prisma-schema/data-model/models
model Session {
  id                    String   @id
  candidateName         String?
  interviewerName       String?
  date                  String   // Keep as String to match InterviewSession.date (ISO string)
  status                String
  questionCount         Int
  selectedWeeks         Json     // number[] — simple array
  overallTechnicalScore Float?
  overallSoftSkillScore Float?
  technicalFeedback     String?
  softSkillFeedback     String?
  questions             Json     // ParsedQuestion[] — full array as JSON
  starterQuestions      Json     // StarterQuestion[] — full array as JSON
  assessments           Json     // Record<string, QuestionAssessment>
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}
```

**Note on `date` field:** `InterviewSession.date` is a string (ISO format). Prisma `DateTime` would require parsing. Keep as `String` to avoid conversion bugs during dual-write. [ASSUMED — this avoids a sharp edge but is a discretion choice for the planner to confirm]

### Pattern 2: Dual-Write in POST Handler

```typescript
// Source: existing pattern in src/app/api/history/route.ts — additive, non-breaking
export async function POST(request: NextRequest) {
  try {
    if (!(await isAuthenticatedSession())) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
    }
    const session: InterviewSession = await request.json();

    // --- EXISTING file write (unchanged) ---
    const history = readHistory();
    const existingIndex = history.findIndex(h => h.id === session.id);
    if (existingIndex >= 0) {
      history[existingIndex] = session;
    } else {
      history.unshift(session);
    }
    const trimmedHistory = history.slice(0, 100);
    writeHistory(trimmedHistory);

    // --- NEW: Dual-write to Supabase (D-01) ---
    try {
      await prisma.session.upsert({
        where: { id: session.id },
        update: {
          candidateName: session.candidateName,
          status: session.status,
          overallTechnicalScore: session.overallTechnicalScore ?? null,
          overallSoftSkillScore: session.overallSoftSkillScore ?? null,
          technicalFeedback: session.technicalFeedback ?? null,
          softSkillFeedback: session.softSkillFeedback ?? null,
          assessments: session.assessments as any,
          updatedAt: new Date(),
        },
        create: {
          id: session.id,
          candidateName: session.candidateName,
          interviewerName: session.interviewerName,
          date: session.date,
          status: session.status,
          questionCount: session.questionCount,
          selectedWeeks: session.selectedWeeks,
          overallTechnicalScore: session.overallTechnicalScore ?? null,
          overallSoftSkillScore: session.overallSoftSkillScore ?? null,
          technicalFeedback: session.technicalFeedback ?? null,
          softSkillFeedback: session.softSkillFeedback ?? null,
          questions: session.questions as any,
          starterQuestions: session.starterQuestions as any,
          assessments: session.assessments as any,
        },
      });
    } catch (dbError) {
      // D-01: DB write failure must not fail the request
      console.error('[dual-write] Supabase write failed:', dbError);
    }

    return NextResponse.json({ success: true, totalSessions: trimmedHistory.length });
  } catch (error) {
    console.error('Error saving to history:', error);
    return NextResponse.json({ error: 'Failed to save to history' }, { status: 500 });
  }
}
```
[ASSUMED — code pattern derived from existing route.ts structure and Prisma upsert docs; exact field names depend on final schema]

### Pattern 3: Sync-Check Endpoint

```typescript
// Source: pattern derived from D-04 spec
// src/app/api/sync-check/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAuthenticatedSession } from '@/lib/auth-server'
// readHistory imported from history route or extracted to shared util

export async function GET() {
  if (!(await isAuthenticatedSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const fileHistory = readHistory()                      // existing function
  const dbCount = await prisma.session.count()
  const fileCount = fileHistory.length

  // Spot-check 5 most recent file sessions exist in DB
  const recentIds = fileHistory.slice(0, 5).map(s => s.id)
  const dbMatches = await prisma.session.findMany({
    where: { id: { in: recentIds } },
    select: { id: true },
  })
  const matchedIds = new Set(dbMatches.map(s => s.id))
  const mismatches = recentIds.filter(id => !matchedIds.has(id))

  return NextResponse.json({
    fileCount,
    dbCount,
    matched: recentIds.length - mismatches.length,
    mismatches,
  })
}
```
[ASSUMED — pattern matches D-04 spec]

### Pattern 4: Public Interview Session Persistence (D-05)

**Critical finding:** The public interview (`src/app/page.tsx`) currently has NO history persistence. `handleFinish()` sets `step('done')` and `handleDownloadPDF()` generates a PDF client-side with no API call to `/api/history`. [VERIFIED: read src/app/page.tsx lines 590-638]

For D-05 to be fulfilled, one of two approaches is needed:

**Option A — Add fetch to `/api/history` POST from `page.tsx`:**
In `handleDownloadPDF()` or `handleFinish()`, build an `InterviewSession`-shaped object from the public interview state and POST it to `/api/history`. This requires the public interview to be authenticated — but `/api/history` requires `isAuthenticatedSession()`. Public users are NOT authenticated. **This approach does NOT work without auth changes.**

**Option B — New unauthenticated `/api/public/interview/complete` endpoint:**
Create a new route that accepts a session payload without the session auth check. Apply rate limiting (fingerprint-based) instead. This endpoint calls the same Prisma upsert. The file write can be skipped (public sessions go DB-only) or included.

**Option C — Authentication-exempt dual-write utility function:**
Extract the DB upsert logic into a shared `lib/sessionPersistence.ts` function. Call it from both `/api/history` (authenticated) and a new `/api/public/interview/complete` (fingerprint-auth only).

**Recommendation:** Option C with Option B's new endpoint. Shared persistence function keeps the DB write logic DRY. The planner must decide whether public sessions also write to the JSON file. [ASSUMED — none of the CONTEXT.md decisions explicitly address the auth gap for public sessions]

### Anti-Patterns to Avoid

- **Failing the request on DB error:** D-01 is explicit — log and continue. Never let DB write failures surface to the user during the dual-write migration period.
- **Running DB write before file write:** File write is the source of truth during migration. If DB write is async and completes first, a crash before file write loses the session from both stores. File write first, then DB write (fire-and-continue pattern is acceptable; awaiting is also fine since the outer try/catch swallows DB failures).
- **Sharing `readHistory` across modules without extracting it:** The `readHistory` function currently lives inside `route.ts`. The sync-check endpoint needs it too. Extract to a shared `src/lib/historyService.ts` or keep it local and duplicate — duplication is simpler but fragile.
- **Casting `assessments` without type safety:** Prisma's `Json` type accepts `Prisma.InputJsonValue`. Casting `as any` works but bypasses TypeScript. For MVP this is acceptable; for Phase 4 gap scoring, a type assertion helper would be cleaner.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Upsert (insert-or-update) | Custom `findFirst` + conditional `create`/`update` | `prisma.session.upsert()` | Prisma handles the race condition; upsert is atomic |
| Counting records | Iterate and count | `prisma.session.count()` | Single SQL `COUNT(*)` vs loading all rows |
| Filtering by ID list | Loop with individual queries | `findMany({ where: { id: { in: [...] } } })` | Single query with `WHERE id = ANY(...)` |
| JSON validation of session payload | Manual field checks | `zod` schema parse | Catches malformed payloads before DB write; prevents silent data corruption |

---

## Runtime State Inventory

> Phase 2 is an additive dual-write, not a rename or migration. This section is brief.

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | `data/interview-history.json` — file-based history continues unchanged | No migration; dual-write captures new sessions forward only |
| Live service config | Supabase `Session` table does not exist yet | Schema migration required before dual-write can succeed |
| OS-registered state | None | None |
| Secrets/env vars | `DATABASE_URL` — already required by Phase 1 | No new env vars needed for dual-write |
| Build artifacts | Phase 1 generates `src/generated/prisma/` — will need `prisma generate` after schema extension | Run `npx prisma generate` after adding Session model fields |

---

## Common Pitfalls

### Pitfall 1: Schema Migration Not Run Before Dual-Write Code Deploys

**What goes wrong:** The `Session` model is extended in `schema.prisma` but `prisma migrate deploy` (or `db push`) has not been run against Supabase. The dual-write in `/api/history` throws `P2021: The table 'public.Session' does not exist` and logs the error — but since D-01 says log-and-continue, this failure is silent. Sessions appear to save successfully but nothing reaches Supabase.

**Why it happens:** Phase 2 has a hard dependency on Phase 1's DB being live AND the new schema being applied before the application code runs.

**How to avoid:** Make schema migration a blocking Wave 0 task. The dual-write code must not be deployed until `prisma migrate deploy` (or `db push`) confirms the Session table exists.

**Warning signs:** Sync-check endpoint returns `dbCount: 0` while `fileCount` grows — the silent failure indicator.

### Pitfall 2: Prisma `Json` Column Requires `as any` or `Prisma.InputJsonValue` Cast

**What goes wrong:** TypeScript compiler rejects assignment of `Record<string, QuestionAssessment>` to `Prisma.InputJsonValue` because Prisma's JSON type doesn't automatically accept arbitrary interfaces.

**Why it happens:** Prisma's generated `Json` type is `Prisma.JsonValue` for reads and `Prisma.InputJsonValue` for writes — neither directly overlaps with custom TypeScript interfaces.

**How to avoid:** Cast with `session.assessments as Prisma.InputJsonValue` or `as unknown as Prisma.InputJsonValue`. Document this cast with a comment explaining it's intentional. Do not try to make the types align — it's not possible without a custom type transformer.

**Warning signs:** `Type 'Record<string, QuestionAssessment>' is not assignable to type 'InputJsonValue'` TypeScript error at build time.

### Pitfall 3: `readHistory` Function Not Accessible from sync-check Route

**What goes wrong:** `readHistory` is defined inside `src/app/api/history/route.ts` as a local function. The new `src/app/api/sync-check/route.ts` needs to call it but cannot import from another route file (Next.js route files are not designed for cross-import).

**Why it happens:** Code was written for single-route use and never extracted.

**How to avoid:** Extract `readHistory`, `writeHistory`, and `ensureDataDir` into `src/lib/historyService.ts` as named exports. Both routes import from there. This extraction is a prerequisite for the sync-check endpoint.

**Warning signs:** TypeScript import error or eslint "cannot import from route.ts" warning.

### Pitfall 4: Public Interview Sessions Can't Hit `/api/history` (Auth Gap)

**What goes wrong:** `/api/history` POST requires `isAuthenticatedSession()` (HttpOnly cookie check). Public interview users have no session cookie. Any attempt to POST from `page.tsx` to `/api/history` returns 401.

**Why it happens:** D-05 says public interviews "should call the history save after session completion" but the history endpoint is auth-protected. There was no discussion of how to handle this in the context doc.

**How to avoid:** Create a separate `/api/public/interview/complete` route that uses fingerprint-based auth (same as `/api/public/interview/start`). This route can call the shared DB upsert without touching the file-based history (public sessions are ephemeral from the trainer's perspective).

**Warning signs:** 401 response from history endpoint when called from public interview page.

### Pitfall 5: `currentQuestionIndex` and Transient UI State in Persisted Session

**What goes wrong:** `InterviewSession` includes `currentQuestionIndex` which is transient UI navigation state, not meaningful for historical records. Storing it in the DB is harmless but pollutes the schema with UI concerns.

**Why it happens:** The full `InterviewSession` object is passed directly to the history endpoint rather than a DTO.

**How to avoid:** Either store the full shape (acceptable for MVP) or strip transient fields before DB write. For Phase 2 MVP, store full shape — noted as a cleanup item for Phase 3/4.

---

## Code Examples

### Verified: Prisma upsert with Json column
```typescript
// Source: Prisma docs — prisma.io/docs/orm/reference/prisma-client-reference#upsert
// [CITED: prisma.io/docs/orm/reference/prisma-client-reference#upsert]
await prisma.session.upsert({
  where: { id: session.id },
  create: {
    id: session.id,
    assessments: session.assessments as Prisma.InputJsonValue,
    // ... other fields
  },
  update: {
    assessments: session.assessments as Prisma.InputJsonValue,
    updatedAt: new Date(),
  },
})
```

### Verified: Prisma count query
```typescript
// Source: Prisma docs — prisma.io/docs/orm/reference/prisma-client-reference#count
// [CITED: prisma.io/docs/orm/reference/prisma-client-reference#count]
const count = await prisma.session.count()
// Returns: number
```

### Verified: Prisma findMany with `in` filter
```typescript
// Source: Prisma docs — prisma.io/docs/orm/reference/prisma-client-reference#in
// [CITED: prisma.io/docs/orm/reference/prisma-client-reference#in]
const found = await prisma.session.findMany({
  where: { id: { in: ['id1', 'id2', 'id3'] } },
  select: { id: true },
})
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Prisma `Json` type requires manual serialization | `Json` accepts any `InputJsonValue` directly | Prisma 4+ | No JSON.stringify needed before DB write |
| `@prisma/client` default output in `node_modules` | Custom `output` in schema, import from `@/generated/prisma` | Phase 1 decision | All Prisma imports in Phase 2 MUST use `@/generated/prisma`, not `@prisma/client` |

**Deprecated/outdated:**
- Importing `PrismaClient` from `@prisma/client`: Replaced by `@/generated/prisma` in this project (Phase 1 decision). Any code importing from `@prisma/client` directly is wrong and will fail.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `date` field should stay as `String` in Prisma schema to match `InterviewSession.date` (ISO string) | Architecture Patterns / Session Model | If `DateTime` is used, conversion logic is needed at write time; values like `"2026-04-13T12:00:00Z"` parse fine but edge cases exist |
| A2 | Public interview sessions should persist to DB only (not file) via a new `/api/public/interview/complete` endpoint | Architecture Patterns — Pattern 4 | If public sessions should also write to file, the new endpoint needs file write too; if public sessions shouldn't persist at all in DB, D-05 is misunderstood |
| A3 | `zod@4.3.6` version is correct for current npm registry | Standard Stack | If version doesn't exist or a patch was released, install will fail; verify with `npm view zod version` at install time |
| A4 | Storing `questions` and `starterQuestions` as JSON columns alongside `assessments` (vs excluding them) | Architecture Patterns — Session Model | If questions should not be duplicated in DB (they exist in the question bank), schema can omit these columns; Phase 4 gap scoring only needs `assessments` |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.

---

## Open Questions

1. **Should public interview sessions write to the JSON file or DB-only?**
   - What we know: D-05 says public interviews persist "via the same dual-write path"
   - What's unclear: `/api/history` POST is auth-protected; public users can't call it; "same dual-write path" may mean same DB upsert function, not same HTTP endpoint
   - Recommendation: DB-only for public sessions (they are ephemeral from trainer's POV); file history is trainer-facing

2. **Should `questions` and `starterQuestions` be stored in the Session DB record?**
   - What we know: D-02 lists schema fields but doesn't explicitly list `questions` or `starterQuestions` as columns
   - What's unclear: Without them, the DB record can't reconstruct a full session view; but they can be fetched from GitHub question bank
   - Recommendation: Store as JSON columns for MVP — self-contained record is simpler than re-fetching from GitHub

3. **Should `historyService.ts` extraction happen in Phase 2 or be treated as a prerequisite?**
   - What we know: sync-check needs `readHistory`; it's currently a private function inside `route.ts`
   - What's unclear: Whether the planner should treat extraction as a separate Wave 0 task or include it inline
   - Recommendation: Make it an explicit task — the extraction is a 10-line refactor that unblocks sync-check

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Prisma CLI | Schema migration for Session model | Depends on Phase 1 completion | 7.7.0 (Phase 1 installs) | — |
| Supabase (live DB) | `prisma migrate deploy` for Session table | ✓ (Phase 1 proved connectivity) | Supabase hosted | — |
| zod | Request payload validation | ✗ (not in package.json) | — | Skip validation (not recommended); or install |

**Missing dependencies with no fallback:**
- `zod` — not currently installed; must be installed before using schema validation in the dual-write handler

**Missing dependencies with fallback:**
- None beyond zod

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — `__tests__/` contains only `test-email-security.mjs` (manual script, not a test runner) |
| Config file | None (no jest.config.*, vitest.config.*, pytest.ini) |
| Quick run command | N/A — no framework configured |
| Full suite command | N/A |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PERSIST-01 | Session written to Supabase on POST | integration | N/A — no test framework | ❌ Wave 0 |
| PERSIST-04 | File write succeeds even when DB write fails | unit | N/A — no test framework | ❌ Wave 0 |
| PERSIST-05 | Sync-check returns correct counts and mismatches | integration | N/A — no test framework | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** Manual smoke test: `curl -X POST http://localhost:3000/api/history` with test payload; verify file write + DB row
- **Per wave merge:** `curl http://localhost:3000/api/sync-check` — confirm `matched > 0` after a session is saved
- **Phase gate:** End-to-end: complete a trainer interview, hit sync-check, confirm `fileCount === dbCount` (or `matched > 0` if counts differ due to pre-existing file sessions)

### Wave 0 Gaps

- No test framework is installed. Per `nyquist_validation: true` in config, testing is enabled but infrastructure is absent.
- For Phase 2's integration-heavy work (dual-write, sync-check), the most practical option is manual verification scripts in `__tests__/` rather than a full test framework.
- Recommendation: Add `__tests__/test-dual-write.mjs` — a Node script that POSTs a mock session and then GETs `/api/sync-check`, verifies counts. No framework required.
- [ ] `__tests__/test-dual-write.mjs` — covers PERSIST-01, PERSIST-04 (integration smoke)
- [ ] `__tests__/test-sync-check.mjs` — covers PERSIST-05 (counts and mismatch detection)

*(No jest/vitest installation recommended for MVP — solo dev, 3-5 week timeline. Manual scripts in `__tests__/` match the existing pattern.)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `isAuthenticatedSession()` already on `/api/history`; new `/api/public/interview/complete` uses fingerprint-based check |
| V3 Session Management | no | No session tokens created in this phase |
| V4 Access Control | yes | Sync-check endpoint must be auth-protected (trainer-only); no public exposure |
| V5 Input Validation | yes | `zod` validates `InterviewSession` payload before DB write; prevents malformed JSON from corrupting records |
| V6 Cryptography | no | No cryptographic operations |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthenticated DB write via public interview | Elevation of Privilege | New `/api/public/interview/complete` uses fingerprint check (not full auth) — same gate as `/api/public/interview/start` |
| Malformed JSON in `assessments` field corrupts DB record | Tampering | `zod` schema validates shape before Prisma write |
| Sync-check exposes session counts to unauthenticated users | Information Disclosure | Sync-check must check `isAuthenticatedSession()` — trainer-only endpoint |
| DB write error message leaks connection string | Information Disclosure | `console.error` only; error message is never returned in the API response |

---

## Sources

### Primary (HIGH confidence)
- Existing codebase — `src/app/api/history/route.ts`, `src/lib/types.ts`, `src/app/page.tsx` [VERIFIED: direct read]
- `src/app/api/public/interview/agent/route.ts`, `src/app/api/public/interview/start/route.ts` [VERIFIED: direct read]
- Phase 1 RESEARCH.md — Prisma 7 patterns, singleton, schema conventions [VERIFIED: read]
- Phase 1 PLAN 01-01 — confirmed schema output path `src/generated/prisma`, import alias `@/generated/prisma` [VERIFIED: read]
- `package.json` — zod is NOT currently installed [VERIFIED: read]

### Secondary (MEDIUM confidence)
- CLAUDE.md §Technology Stack — zod@4.3.6 listed as recommended; version assumed current [CITED: CLAUDE.md]
- Prisma upsert/count/findMany query patterns [CITED: prisma.io/docs/orm/reference/prisma-client-reference]

### Tertiary (LOW confidence)
- None in this research

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Phase 1 installs all deps; only zod is new and is unverified against live npm
- Architecture: HIGH — patterns derived from direct codebase reads; upsert/Json patterns are well-established Prisma conventions
- Pitfalls: HIGH — auth gap (Pitfall 4) verified by reading public interview code; `readHistory` extraction (Pitfall 3) verified by reading route.ts
- Public interview persistence: MEDIUM — D-05 intent is clear but implementation path has an auth constraint that wasn't in the CONTEXT.md discussion

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (stable stack — Prisma 7 and Next.js 16 unlikely to change meaningfully in 30 days)
