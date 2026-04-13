# Architecture Patterns

**Domain:** Adaptive technical skills assessment platform — adding Supabase persistence, gap tracking, and trainer dashboard to an existing Next.js 16 App Router + Zustand + LangGraph system.
**Researched:** 2026-04-13
**Confidence:** HIGH (based on direct codebase analysis + established Prisma/Supabase/Next.js patterns)

---

## Existing Architecture (Baseline)

Understanding what exists is prerequisite to knowing what integrates cleanly versus what requires surgery.

### Current Data Flow

```
Browser (Zustand localStorage)
  → /interview page (trainer inputs assessments)
  → /api/score (LangGraph: route → evaluate → return score+feedback)
  → Zustand store (holds finalScore, llmScore, status per question)
  → /review page (trainer overrides)
  → /api/history POST (writes to data/interview-history.json)
  → /api/send-email (Resend PDF delivery)
```

### Current Persistence Layer

All persistence is file-based on the Docker container filesystem:
- `data/interview-history.json` — completed sessions (100-session cap, 72hr retention)
- `data/rate-limits.json` — device fingerprint rate limiting

**Critical implication:** The `data/` directory is container-local. Any replica or redeploy loses history. This is a known constraint and is why Supabase is being added.

### Key Structural Facts

1. `InterviewSession` in `src/lib/types.ts` is the canonical data shape — it is the unit stored in `data/interview-history.json` and the unit the Zustand store holds in memory.
2. `/api/score` is a pure function: receives question + assessment, returns `{score, feedback}`. It does NOT write to storage. Storage happens separately in `/api/history`.
3. `/api/history` POST is the single write point for completed sessions — it is called from the frontend after review completion.
4. LangGraph runs entirely server-side inside the `/api/score` route handler. No persistent state graph — each scoring call is a fresh stateless invocation.
5. The Zustand store persists to `localStorage` via `persist` middleware. The store is the source of truth during an active session.

---

## Recommended Architecture: New Components

### Component Map

```
┌─────────────────────────────────────────────────────────────────┐
│  BROWSER LAYER                                                    │
│                                                                   │
│  Zustand Store (localStorage)                                     │
│    Active session state (unchanged)                               │
│                                                                   │
│  /dashboard/trainer  (NEW — Server Component + Client islands)    │
│    Roster view, readiness badges, associate drill-down            │
│                                                                   │
│  /interview, /review  (EXISTING — unchanged)                      │
└────────────────────┬────────────────────────────────────────────┘
                     │ HTTP
┌────────────────────▼────────────────────────────────────────────┐
│  SERVER LAYER (Next.js Route Handlers + Server Components)        │
│                                                                   │
│  /api/history  (MODIFIED — dual-write: file + Supabase)           │
│                                                                   │
│  /api/associates  (NEW — CRUD for associate profiles)             │
│                                                                   │
│  /api/gaps/[associateId]  (NEW — read computed gap state)         │
│                                                                   │
│  /api/gaps/recalculate  (NEW — trigger gap recomputation)         │
│                                                                   │
│  /api/readiness/[associateId]  (NEW — readiness signal)           │
│                                                                   │
│  GapService  (NEW — src/lib/gapService.ts)                        │
│    calculateGaps(), computeReadiness(), getRecommendations()      │
│                                                                   │
│  PersistenceService  (NEW — src/lib/persistenceService.ts)        │
│    Wraps Prisma client, dual-write logic                          │
└────────────────────┬────────────────────────────────────────────┘
                     │ Prisma Client (connection pool)
┌────────────────────▼────────────────────────────────────────────┐
│  DATA LAYER                                                       │
│                                                                   │
│  Supabase (Postgres)                                              │
│    associates, sessions, question_results, skill_gaps, ...        │
│                                                                   │
│  data/interview-history.json  (PRESERVED — backward compat)       │
│  data/rate-limits.json        (PRESERVED — unchanged)             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Boundaries

| Component | Responsibility | Communicates With | Location |
|-----------|---------------|-------------------|----------|
| Zustand Store | Active session state in browser | Frontend components only | `src/store/interviewStore.ts` (existing) |
| `/api/history` (modified) | Dual-write on session completion | PersistenceService, file system | `src/app/api/history/route.ts` |
| PersistenceService | Supabase write + read operations via Prisma | Prisma client, called from route handlers | `src/lib/persistenceService.ts` (new) |
| GapService | Gap calculation, readiness scoring | PersistenceService (read sessions), called from API routes | `src/lib/gapService.ts` (new) |
| `/api/associates` | Associate profile CRUD | PersistenceService | `src/app/api/associates/route.ts` (new) |
| `/api/gaps/[id]` | Serve current gap state for an associate | GapService | `src/app/api/gaps/[associateId]/route.ts` (new) |
| `/api/readiness/[id]` | Serve readiness signal + recommendation | GapService | `src/app/api/readiness/[associateId]/route.ts` (new) |
| Trainer Dashboard | Render roster + per-associate views | Fetches from `/api/associates`, `/api/gaps`, `/api/readiness` | `src/app/dashboard/trainer/` (new) |
| Prisma schema | Database schema, migrations | Supabase Postgres | `prisma/schema.prisma` (new) |

---

## Data Flow: Scoring Pipeline to Database

The critical integration point is at session completion. The scoring pipeline itself does NOT change — it remains a stateless per-question API call. Persistence is added as a side effect at the existing write boundary.

### Trainer-Led Flow (modified at completion point only)

```
1. /review page: trainer validates final scores
2. completeReview() called → Zustand status = 'completed'
3. Frontend calls POST /api/history with full InterviewSession
4. /api/history handler:
   a. [EXISTING] write to data/interview-history.json
   b. [NEW] call PersistenceService.saveSession(session, associateId)
      - upsert session record in `sessions` table
      - upsert per-question results in `question_results` table
      - trigger GapService.recalculateGaps(associateId)
5. Return {success: true} — frontend unchanged
```

The dual-write is synchronous within the route handler. If Supabase write fails, log the error but still return success (file write succeeded — data not lost). This preserves backward compatibility.

### Public Interview Flow (modified at completion point)

```
1. /api/public/interview/agent processes final question
2. [EXISTING] increment rate limit counter
3. [NEW] call PersistenceService.savePublicSession(session)
   - no associateId (anonymous) unless fingerprint → associate mapping exists
   - store with associate_id = null, fingerprint stored for potential future linkage
4. [EXISTING] return session results to frontend
```

### Gap Recalculation Flow

```
GapService.recalculateGaps(associateId):
  1. Fetch all sessions for associate from Supabase (ordered by date desc)
  2. For each session, for each question_result:
     - Extract: technology, topic, score, keywords_missed, date
  3. Apply recency decay: weight = 0.8^(session_index) where index=0 is most recent
  4. Aggregate by skill (technology) and topic:
     weighted_score = sum(score * weight) / sum(weight)
  5. Compute per-skill gap: gap_score = 5 - weighted_score (higher = bigger gap)
  6. Upsert results into `skill_gaps` table
  7. Compute readiness signal:
     - avg_score >= 3.75 (75% of 5)
     - session_count >= 3
     - recent_trend >= 0 (last 3 sessions non-declining)
  8. Upsert into `associate_readiness` table
```

Gap recalculation is synchronous within the save-session call for MVP. It runs in ~50ms for a typical associate (< 100 sessions). If it becomes slow later, move to a background queue.

---

## Database Schema (Prisma)

```prisma
model Associate {
  id          String    @id @default(cuid())
  slug        String    @unique          // trainer-assigned e.g. "jdoe-cohort3"
  name        String
  cohort      String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  sessions    Session[]
  skillGaps   SkillGap[]
  readiness   AssociateReadiness?
}

model Session {
  id              String    @id          // matches InterviewSession.id from app
  associateId     String?
  associate       Associate? @relation(fields: [associateId], references: [id])
  interviewerName String?
  date            DateTime
  status          String                 // 'completed' etc.
  mode            String                 // 'trainer-led' | 'public'
  overallTechnicalScore  Float?
  overallSoftSkillScore  Float?
  technicalFeedback      String?
  softSkillFeedback      String?
  rawPayload      Json                   // full InterviewSession blob — safety net
  createdAt       DateTime @default(now())
  questionResults QuestionResult[]
}

model QuestionResult {
  id            String   @id @default(cuid())
  sessionId     String
  session       Session  @relation(fields: [sessionId], references: [id])
  questionId    String                   // matches ParsedQuestion.id
  technology    String?                  // derived from question source file
  topic         String?                  // derived from question metadata
  difficulty    String?                  // 'beginner' | 'intermediate' | 'advanced'
  weekNumber    Int?
  keywordsHit   String[]
  keywordsMissed String[]
  llmScore      Float?
  finalScore    Float?
  softSkills    Json                     // SoftSkillsAssessment blob
  didNotGetTo   Boolean  @default(false)
  createdAt     DateTime @default(now())
}

model SkillGap {
  id            String   @id @default(cuid())
  associateId   String
  associate     Associate @relation(fields: [associateId], references: [id])
  technology    String
  topic         String?
  weightedScore Float
  gapScore      Float                    // 5 - weightedScore
  sessionCount  Int
  lastUpdated   DateTime @updatedAt
  @@unique([associateId, technology, topic])
}

model AssociateReadiness {
  id            String   @id @default(cuid())
  associateId   String   @unique
  associate     Associate @relation(fields: [associateId], references: [id])
  isReady       Boolean
  avgScore      Float
  sessionCount  Int
  trend         Float                    // positive = improving
  nextPracticeArea String?
  computedAt    DateTime @updatedAt
}
```

The `rawPayload Json` column on `Session` is the safety net during migration — it stores the complete `InterviewSession` blob so nothing is lost even if schema extraction misses something.

---

## Dashboard Data Fetching Pattern

### Use Server Components for Initial Render

The trainer dashboard is authenticated (existing HttpOnly cookie auth). Server Components can read from Supabase via Prisma directly — no round-trip through a client-side API call for the initial page load.

```
src/app/dashboard/trainer/
  page.tsx          ← Server Component: fetches all associates + readiness
  [associateId]/
    page.tsx        ← Server Component: fetches sessions + gaps for one associate
```

```typescript
// src/app/dashboard/trainer/page.tsx
// Server Component — direct Prisma call, no useEffect, no loading state

import { prisma } from '@/lib/db'
import { isAuthenticatedSession } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import RosterClient from './RosterClient'

export default async function TrainerDashboard() {
  if (!(await isAuthenticatedSession())) redirect('/login')

  const associates = await prisma.associate.findMany({
    include: { readiness: true },
    orderBy: { name: 'asc' }
  })

  return <RosterClient associates={associates} />
}
```

`RosterClient` is a `'use client'` component that handles interactivity (sorting, filtering, navigation). The data arrives pre-fetched as props — no client-side fetch on initial load.

### Use API Routes for Mutations and Reactive Updates

| Operation | Pattern | Reason |
|-----------|---------|--------|
| Initial roster load | Server Component + Prisma | Zero client-side waterfall |
| Per-associate detail | Server Component + Prisma | Same |
| Marking associate active/inactive | `'use client'` + fetch to `/api/associates/[id]` | Mutation needs request context |
| Refreshing gap data after new session | Client refetch to `/api/gaps/[id]` | Post-mutation revalidation |
| Score calibration view | Server Component for data, client for overrides | Hybrid |

Avoid the anti-pattern of Server Components calling internal API routes. Server Components should use Prisma/PersistenceService directly. API routes exist for the browser to call.

### Revalidation Strategy

Use Next.js `revalidatePath` in route handlers after writes:

```typescript
// In /api/history POST handler after successful Supabase write:
import { revalidatePath } from 'next/cache'
revalidatePath('/dashboard/trainer')
revalidatePath(`/dashboard/trainer/${associateId}`)
```

This invalidates the Server Component cache so the next trainer page load reflects new data. No polling needed.

---

## Dual-Write Migration Strategy

The goal is zero downtime and zero data loss during the transition from file-only to Supabase-primary.

### Phase 1: Parallel Write (add Supabase, keep file)

```typescript
// src/lib/persistenceService.ts

export async function saveSession(session: InterviewSession, associateId?: string) {
  try {
    await prisma.session.upsert({
      where: { id: session.id },
      create: buildSessionCreate(session, associateId),
      update: buildSessionUpdate(session),
    })
    if (associateId) {
      await gapService.recalculateGaps(associateId)
    }
  } catch (error) {
    // Log but do not throw — file write is the safety net
    console.error('[PersistenceService] Supabase write failed:', error)
    // Optional: write to a local failed-writes queue for retry
  }
}
```

`/api/history` POST calls file write first, then calls `PersistenceService.saveSession`. File write failure still throws (preserves existing behavior). Supabase write failure is caught and logged — the response to the client is unaffected.

### Phase 2: Validate (confirm Supabase has all data)

Add a `/api/admin/validate-sync` route that compares file history count vs Supabase session count. Run this manually after a week of parallel writes. When counts match (within expected delta for old data), Supabase is the verified record of truth for new sessions.

### Phase 3: Read from Supabase (when validated)

For the trainer dashboard and history page: read from Supabase. The file remains as backup but is no longer the source of read queries. No code deletion yet.

### Phase 4: Remove file writes (optional, post-MVP)

After a stable period, deprecate the file write in `/api/history`. Keep the `data/` directory for rate-limits (unchanged).

---

## Prisma Client Singleton Pattern (Docker/Long-running process)

This app runs in Docker (not serverless). Connection pooling behavior differs from Vercel deployment. Use a single Prisma client instance:

```typescript
// src/lib/db.ts

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

The `globalThis` pattern prevents multiple client instances during Next.js hot reloads in development. In production Docker, a single instance is maintained for the process lifetime — appropriate for a long-running container, not a serverless function.

Supabase connection string: use the **Transaction pooler** URL (port 6543) for the connection string, not the direct connection (port 5432). The transaction pooler is Supabase's PgBouncer — handles concurrent Next.js requests from a single container efficiently.

```
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
```

`prisma.config.ts` uses `directUrl` for migrations (needs direct connection), `url` for runtime queries (uses pooler). **Confidence: HIGH** — this is the documented Supabase+Prisma pattern.

---

## Gap Calculation Service Architecture

```
src/lib/gapService.ts

exports:
  recalculateGaps(associateId: string): Promise<void>
  getGapsForAssociate(associateId: string): Promise<SkillGap[]>
  computeReadiness(associateId: string): Promise<ReadinessResult>
  getNextRecommendation(associateId: string): Promise<string | null>
```

### Recency Decay Implementation

```typescript
interface ScoredSession {
  date: Date
  results: QuestionResult[]
}

function applyRecencyDecay(sessions: ScoredSession[], decay = 0.8) {
  // sessions sorted newest-first
  const weighted: Map<string, { sumScore: number; sumWeight: number; count: number }> = new Map()

  sessions.forEach((session, index) => {
    const weight = Math.pow(decay, index) // 1.0, 0.8, 0.64, 0.512...

    for (const result of session.results) {
      if (result.didNotGetTo || result.finalScore === null) continue
      const key = `${result.technology}::${result.topic ?? '__root__'}`
      const existing = weighted.get(key) ?? { sumScore: 0, sumWeight: 0, count: 0 }
      existing.sumScore += (result.finalScore ?? result.llmScore ?? 0) * weight
      existing.sumWeight += weight
      existing.count += 1
      weighted.set(key, existing)
    }
  })

  return weighted
}
```

This is a pure function over fetched data — no database writes inside the loop. Compute everything in memory, then batch-upsert `skill_gaps` rows at the end.

### Readiness Signal

```typescript
function computeReadiness(associate: Associate & { sessions: Session[] }) {
  const sessionCount = associate.sessions.length
  if (sessionCount < 3) return { isReady: false, reason: 'insufficient_sessions' }

  const scores = associate.sessions
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 10) // look at last 10 sessions
    .map(s => s.overallTechnicalScore ?? 0)

  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length
  const last3 = scores.slice(0, 3)
  const trend = last3[0] - last3[2] // positive = improving, negative = declining

  return {
    isReady: avgScore >= 3.75 && sessionCount >= 3 && trend >= 0,
    avgScore,
    sessionCount,
    trend,
  }
}
```

Thresholds (75%, 3 sessions, non-negative trend) are constants in the service, not hardcoded database config. Easy to tune per-cohort later without a migration.

---

## Suggested Build Order (Phase Dependencies)

The order matters because each layer is a prerequisite for the next.

### 1. Foundation: Prisma + Supabase Connection (build first)

No features work without this. Installs Prisma, writes `prisma/schema.prisma`, generates client, verifies `DATABASE_URL` in `.env.docker`. Everything else depends on the Prisma client existing.

**Deliverable:** `prisma/schema.prisma`, `src/lib/db.ts`, migration applied to Supabase.

### 2. Dual-Write Persistence Layer (build second)

Modifies `/api/history` to call `PersistenceService` after the file write. The file write is unchanged — existing tests and flows continue working. Supabase gets data starting from this point forward.

**Deliverable:** `src/lib/persistenceService.ts`, modified `/api/history/route.ts`. Can be deployed and run in shadow mode immediately.

**Depends on:** Step 1.

### 3. Associate Profiles (build third)

Required by gap tracking and dashboard. A session must be linkable to an associate before gaps can be computed. Includes: associate table, `/api/associates` CRUD, and the UI affordance in the dashboard setup wizard to select or create an associate.

**Deliverable:** `/api/associates`, associate selection in interview setup.

**Depends on:** Step 2 (sessions need an `associateId` FK before associate profiles matter).

### 4. Gap Service + Recalculation (build fourth)

Depends on having sessions in the database (Step 2) and associate profiles (Step 3). The gap service reads `question_results`, applies decay, writes `skill_gaps`. Also triggers `computeReadiness`.

**Deliverable:** `src/lib/gapService.ts`, `skill_gaps` table populated after each session.

**Depends on:** Steps 2 and 3.

### 5. Trainer Dashboard (build fifth)

Reads from already-populated `associates`, `skill_gaps`, `associate_readiness` tables. Server Components fetch directly via Prisma. The dashboard is a read-only consumer of the prior layers — no new write paths.

**Deliverable:** `src/app/dashboard/trainer/` with roster + per-associate views.

**Depends on:** Steps 3 and 4 (needs associates with gaps computed).

### 6. Adaptive Mock Setup (build sixth — depends on gap data existing)

The setup wizard reads `skill_gaps` to pre-weight technology selectors for the next session. Requires that at least one prior session has been processed through the gap service.

**Deliverable:** Modified `/dashboard/page.tsx` that pre-populates tech weights from gap history.

**Depends on:** Step 4 (gaps must exist to adapt from).

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Running Gap Recalculation in the Scoring Pipeline

**What:** Calling `recalculateGaps()` inside `/api/score` after every question.
**Why bad:** The `/api/score` route is called 8-12 times per session (once per question), often concurrently during review. Gaps should be computed once at session completion, not per question. Running it per question would cause 10+ concurrent writes to `skill_gaps` with partial data.
**Instead:** Call `recalculateGaps()` once in `/api/history` POST, at session completion.

### Anti-Pattern 2: Fetching Session Data Through Client-Side API Calls for Dashboard

**What:** Dashboard page uses `useEffect` + `fetch('/api/associates')` to load roster.
**Why bad:** Causes waterfall: page renders → fetch fires → data arrives → re-render. Trainer gets flash of empty state.
**Instead:** Server Components fetch directly via Prisma at render time. Pass data as props to client islands.

### Anti-Pattern 3: Multiple Prisma Client Instances

**What:** `new PrismaClient()` called at the module level in multiple files.
**Why bad:** In Next.js dev mode with hot reload, creates dozens of database connections, exhausting Supabase's free-tier connection limit.
**Instead:** Single singleton in `src/lib/db.ts` with `globalThis` guard.

### Anti-Pattern 4: Blocking the Interview Flow on Supabase Writes

**What:** `/api/history` awaits the Supabase write and returns an error to the frontend if it fails.
**Why bad:** Supabase outage or network blip prevents session completion. Trainer cannot close the session.
**Instead:** File write is the reliable path. Supabase write is wrapped in try/catch. Failures are logged but never propagate to the response.

### Anti-Pattern 5: Storing Associate Identity in Zustand

**What:** Adding `associateId` to the Zustand session store with `persist` middleware.
**Why bad:** Zustand persists to localStorage. Multiple sessions for the same associate would share browser-level state, creating collision bugs if a trainer runs back-to-back sessions for different associates on the same machine.
**Instead:** Associate selection is a session-scoped piece of setup wizard state that is sent to `/api/history` as a parameter and cleared on `resetSession()`.

---

## Scalability Notes

This architecture is deliberately simple for MVP. Known growth points:

| Concern | MVP Approach | Future Approach |
|---------|--------------|-----------------|
| Gap recalculation latency | Synchronous on session save (~50ms) | Background job / Supabase Edge Function if > 200ms |
| Dashboard query performance | Full table scan (acceptable at < 100 associates) | Add indexes on `associateId`, `technology`, add materialized view for readiness |
| Rate limiting with multiple Docker replicas | File-based (breaks with multiple replicas) | Migrate to Supabase table or Redis when scaling out |
| Associate identity linkage to public interviews | Fingerprint stored, no link | Add trainer-controlled claim flow post-MVP |

---

## Sources

- Direct codebase analysis: `src/lib/types.ts`, `src/lib/langchain.ts`, `src/store/interviewStore.ts`, `src/app/api/history/route.ts`, `src/app/api/score/route.ts`, `src/lib/rateLimitService.ts` — HIGH confidence
- Prisma singleton pattern for Next.js: documented in Prisma docs, well-established practice — HIGH confidence
- Supabase PgBouncer (Transaction pooler) port 6543 for Prisma: documented Supabase+Prisma guide — HIGH confidence
- Recency decay coefficient (0.8): from PROJECT.md key decisions, not yet validated — MEDIUM confidence (autoresearch target)
- Readiness thresholds (75%/3 sessions): from PROJECT.md, not yet empirically validated — MEDIUM confidence (configurable)
- Next.js Server Component + Prisma direct pattern: established Next.js 13+ App Router best practice — HIGH confidence
