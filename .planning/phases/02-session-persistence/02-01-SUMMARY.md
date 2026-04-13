---
phase: 02-session-persistence
plan: 01
subsystem: persistence
tags: [prisma, supabase, dual-write, history, session-model]
dependency_graph:
  requires: [01-01, 01-02]
  provides: [session-table-in-supabase, dual-write-post-handler, history-service-module]
  affects: [src/app/api/history/route.ts, src/lib/historyService.ts, prisma/schema.prisma]
tech_stack:
  added: []
  patterns: [dual-write-log-and-continue, prisma-upsert-json-cast, shared-history-service]
key_files:
  created:
    - src/lib/historyService.ts
  modified:
    - prisma/schema.prisma
    - src/app/api/history/route.ts
decisions:
  - "id is String @id without @default(cuid()) — uses client-generated InterviewSession.id"
  - "date stored as String not DateTime to match InterviewSession.date ISO string and avoid conversion"
  - "questions and starterQuestions stored as Json columns alongside assessments for self-contained DB records"
  - "DB write failures logged with [dual-write] prefix and swallowed — file write is source of truth during migration"
  - "Prisma.InputJsonValue cast used via as unknown as for all Json columns (TypeScript cannot infer Record types)"
metrics:
  duration: ~8 minutes
  completed: "2026-04-13T22:14:00Z"
  tasks_completed: 2
  files_changed: 3
---

# Phase 02 Plan 01: Session Model + historyService + Dual-Write Summary

**One-liner:** Full Prisma Session model pushed to Supabase with dual-write POST handler using log-and-continue pattern and shared historyService module.

## What Was Built

### Task 1: Session model + historyService extraction

Extended `prisma/schema.prisma` — replaced the Phase 1 skeleton Session model with the full model mapping all `InterviewSession` TypeScript fields:

- Scalar columns for queryable fields: `candidateName`, `interviewerName`, `date` (String), `status`, `questionCount`, `overallTechnicalScore`, `overallSoftSkillScore`, `technicalFeedback`, `softSkillFeedback`
- `Json` columns for complex nested structures: `selectedWeeks` (number[]), `questions` (ParsedQuestion[]), `starterQuestions` (StarterQuestion[]), `assessments` (Record<string, QuestionAssessment>)
- `createdAt`/`updatedAt` Prisma-managed timestamps separate from the interview `date` field
- `id` is `String @id` — no `@default(cuid())` since client generates the ID

Extracted `readHistory`, `writeHistory`, `ensureDataDir` from `route.ts` into `src/lib/historyService.ts` as named exports so the sync-check endpoint (Plan 02-02) can import them without cross-route imports. Removed all `fs`/`path` imports and local function definitions from `route.ts`.

### Task 2: Schema push + dual-write POST handler

- Ran `npx prisma db push` — Session table created in Supabase (confirmed: "Your database is now in sync")
- Ran `npx prisma generate` — Prisma client regenerated with full Session model fields
- Added dual-write block to POST handler after file write per D-01 pattern:
  - File write executes first (source of truth during migration)
  - `prisma.session.upsert` runs inside inner try/catch
  - DB failures are logged with `[dual-write]` prefix but never surfaced to client
  - `as unknown as Prisma.InputJsonValue` cast for all Json columns (RESEARCH.md Pitfall 2)
  - `upsert` handles both new sessions and re-saves from the review phase
  - GET and DELETE handlers remain file-only, no Prisma calls added

## Verification

- `npx prisma validate` — schema valid
- `npx prisma db push` — Session table in Supabase confirmed
- `npm run build` — Next.js standalone build succeeds, `/api/history` appears as dynamic route

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data paths wired. File write and DB upsert both execute on POST. No placeholder data in rendered UI from this plan.

## Threat Flags

No new threat surface beyond what the plan's threat model covers. The dual-write catch block uses `console.error` only — no error details leak to HTTP responses (T-02-02 mitigated). POST handler retains `isAuthenticatedSession()` guard (T-02-04 mitigated).

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 2d50040 | feat(02-01): add Session model, extract historyService, refactor history route |
| 2 | 2059e78 | feat(02-01): add dual-write to POST handler and push Session schema to Supabase |

## Self-Check: PASSED
