# Architecture Patterns

**Domain:** Adaptive technical skills assessment platform — v1.1 Cohort Readiness System layered onto existing Next.js 16 App Router + Prisma 7 + Supabase system
**Researched:** 2026-04-14
**Confidence:** HIGH (direct codebase analysis — existing source files read verbatim; v1.1 integration points derived from actual code, not assumptions)

---

## Baseline: What v1.0 Established

Understanding the existing architecture is prerequisite to knowing what integrates cleanly vs. what requires schema surgery.

### v1.0 Data Flow (Trainer-Led)

```
Browser (Zustand localStorage)
  → /interview (trainer conducts, Web Speech API, per-question scoring)
  → /api/score (LangGraph: stateless per-question scoring, returns score+feedback)
  → Zustand store (holds assessments, scores, status per question)
  → /review (trainer validates/overrides)
  → /api/history POST (dual-write: data/interview-history.json + persistSessionToDb())
  → gapPersistence → readinessService → Associate.readinessStatus updated
  → /api/send-email (Resend PDF)
```

### v1.0 Data Flow (Automated Public Interview — The Gap)

```
/api/public/interview/start (fingerprint rate limit)
  → /api/public/interview/agent (LangGraph agent, stateless per turn)
  → /api/public/interview/complete POST
    → checkRateLimit(fingerprint) — this is the only auth
    → persistSessionToDb(session) — DB-only write
    → *** gap scoring NEVER fires ***
    → *** readiness NEVER updates ***
    → *** associateId is null (no slug collected) ***
```

This is the core v1.1 problem: automated sessions land in the DB orphaned and never feed the readiness pipeline.

### Existing Schema (Relevant to v1.1)

```
Associate  { id, slug(unique), displayName, readinessStatus, recommendedArea, lastComputedAt }
Session    { id, associateId(nullable FK), status, overallTechnicalScore, overallSoftSkillScore, techMap, ... }
GapScore   { associateId, skill, topic, weightedScore — unique (associateId, skill, topic) }
Settings   { id=1 (singleton), readinessThreshold }
```

There is no `Cohort` model. There is no `CurriculumWeek` model. Associate has no `cohortId`. These are the schema additions v1.1 requires.

---

## New Architecture: v1.1 Components

### Component Map (delta from v1.0)

```
EXISTING (unchanged unless marked MODIFIED)
┌──────────────────────────────────────────────────────────────┐
│  Zustand Store → /interview → /api/score → /review           │
│  → /api/history (MODIFIED: add cohortId to session record)   │
│  → sessionPersistence.ts (unchanged)                         │
│  → gapPersistence.ts (unchanged)                             │
│  → readinessService.ts (unchanged)                           │
└──────────────────────────────────────────────────────────────┘

NEW — Public Interview Auth + Pipeline Connection
┌──────────────────────────────────────────────────────────────┐
│  /api/public/interview/start                                  │
│    MODIFIED: accept { fingerprint, associateSlug }            │
│    → validate slug, return sessionToken (JWT or signed cookie)│
│                                                               │
│  /api/public/interview/complete                               │
│    MODIFIED: accept associateSlug, call gap+readiness pipeline│
│    (same pipeline as trainer-led, already exists)             │
└──────────────────────────────────────────────────────────────┘

NEW — Cohort + Curriculum Data Layer
┌──────────────────────────────────────────────────────────────┐
│  prisma/schema.prisma (MODIFIED):                             │
│    + Cohort model                                             │
│    + CurriculumWeek model                                     │
│    + Associate.cohortId FK (nullable)                         │
│    + Session.cohortId FK (nullable, denormalized for queries) │
│                                                               │
│  /api/cohorts (NEW CRUD)                                      │
│  /api/cohorts/[id]/curriculum (NEW CRUD)                      │
│  /api/cohorts/[id]/associates (NEW — roster per cohort)       │
└──────────────────────────────────────────────────────────────┘

NEW — Trainer Dashboard Views
┌──────────────────────────────────────────────────────────────┐
│  /trainer (MODIFIED: add cohort filter dropdown/tabs)         │
│  /trainer/cohort/[id] (NEW: cohort aggregate view)            │
│  /trainer/[slug] (unchanged — per-associate detail)           │
│                                                               │
│  Cohort aggregate = GROUP BY cohort, COUNT readinessStatus    │
│  No new services needed — query from existing Associate data  │
└──────────────────────────────────────────────────────────────┘

NEW — Email Notifications
┌──────────────────────────────────────────────────────────────┐
│  readinessService.ts (MODIFIED):                              │
│    updateAssociateReadiness() emits notification when         │
│    status transitions (not_ready→improving, improving→ready)  │
│                                                               │
│  /lib/notificationService.ts (NEW):                           │
│    sendReadinessChangeEmail(associate, oldStatus, newStatus)  │
│    Uses existing Resend client (no new deps)                  │
└──────────────────────────────────────────────────────────────┘
```

---

## Prisma Schema Changes

These are additive migrations — no existing tables change structure, only new tables added and nullable FKs added to existing tables.

```prisma
model Cohort {
  id          Int              @id @default(autoincrement())
  name        String           // "April 2026 Cohort"
  startDate   DateTime
  endDate     DateTime?
  description String?
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
  associates  Associate[]
  curriculum  CurriculumWeek[]
  sessions    Session[]
}

model CurriculumWeek {
  id          Int      @id @default(autoincrement())
  cohortId    Int
  cohort      Cohort   @relation(fields: [cohortId], references: [id], onDelete: Cascade)
  weekNumber  Int      // maps to existing selectedWeeks / techMap keys
  skillName   String   // e.g. "React", "Node.js"
  topicTags   String[] // e.g. ["hooks", "context", "lifecycle"]
  startDate   DateTime // when this week's content becomes teachable
  @@unique([cohortId, weekNumber])
}

// Associate: add cohortId FK (nullable — existing associates have no cohort)
model Associate {
  // ... existing fields unchanged ...
  cohortId    Int?
  cohort      Cohort?  @relation(fields: [cohortId], references: [id])
}

// Session: add cohortId (denormalized for efficient cohort-level queries)
model Session {
  // ... existing fields unchanged ...
  cohortId    Int?
  cohort      Cohort?  @relation(fields: [cohortId], references: [id])
  mode        String   @default("trainer-led") // "trainer-led" | "automated"
}
```

**Why denormalize `cohortId` onto Session:** Cohort-level dashboard queries (all sessions for a cohort, readiness distribution over time) are simpler and faster with a direct FK than joining Associate→Session through cohortId. The associate's current cohort may change; denormalizing captures which cohort was active at session time.

**Why `mode` on Session:** The automated interview pipeline and trainer-led pipeline produce structurally identical sessions. The `mode` field lets the dashboard distinguish them for display (e.g., showing "AI mock" vs "trainer interview" in history).

---

## Integration Point 1: Automated Interview → Readiness Pipeline

This is the highest-priority integration — it completes the pipeline that already exists.

### Current State

`/api/public/interview/complete` calls `persistSessionToDb(session)` but:
1. Session has no `associateSlug` (never collected from user)
2. Even if it did, the gap scoring + readiness update is never called after persist

### Required Changes

**`/api/public/interview/start` (MODIFIED)**

Accept `associateSlug` in request body. Validate it. Return it in the response so the client can attach it to the session throughout the interview.

```typescript
// Current: { fingerprint, action }
// New:     { fingerprint, action, associateSlug? }
```

The slug is user-provided. Validate format (existing `validateSlug()` utility). Do NOT verify it exists in DB at start — create-on-first-session is the existing associate pattern.

**`/api/public/interview/complete` (MODIFIED)**

After `persistSessionToDb()` succeeds, run the same gap + readiness pipeline as trainer-led sessions:

```typescript
// Add after: const success = await persistSessionToDb(session)
if (success && session.associateSlug) {
  const associate = await prisma.associate.findUnique({
    where: { slug: session.associateSlug }
  })
  if (associate) {
    // Fire-and-forget: same pattern as gapPersistence.ts
    computeAndPersistGapScores(associate.id, session).catch(err =>
      console.error('[public-complete] gap scoring failed:', err)
    )
  }
}
```

This is 8-10 lines of code that closes the pipeline gap. The services (`gapService`, `gapPersistence`, `readinessService`) already exist and are tested.

**Front-end: public interview flow**

The public interview UI (wherever `/api/public/interview/start` is called) needs a slug input field before the interview begins. This is the same UX as the trainer-led setup wizard's "associate slug" field. Reuse the same component or the same validation logic.

---

## Integration Point 2: Associate Auth

### What v1.0 has

Single-password trainer auth: `APP_PASSWORD` env var, HttpOnly cookie `nlm_session=authenticated`, 24hr expiry. Middleware protects `/dashboard`, `/interview`, `/review`, `/trainer`. Associates have no login — they are assigned a slug by the trainer.

### What v1.1 needs

Associates taking automated interviews need identity linkage, not full auth. The design decision: **slug-based identity, not login-based auth.**

- Associates enter their trainer-assigned slug at the start of a public interview
- The slug is validated (format check + optional existence check)
- The slug flows through the session to link it to the Associate record
- No password, no session cookie, no JWT for associates in v1.1

This matches the existing v1.0 identity model and avoids the complexity of a full auth system. Full associate auth (login, passwords, email verification) is out of scope for v1.1 per PROJECT.md.

**Why not JWT tokens for automated interviews:** The session already has an ID. The associate slug is passed through the session payload. Adding JWT would require key management and token refresh — unnecessary complexity when the existing `persistSessionToDb` already handles slug-based associate upsert.

**Middleware: no changes needed.** Public interview routes (`/api/public/interview/*`) are intentionally unprotected — they are the public-facing entrypoint for associates. The rate limiting (fingerprint-based) is the only gate.

---

## Integration Point 3: Cohort Management

### Data model integration

Cohort is a new first-class entity. It sits above Associate in the hierarchy:

```
Cohort (1) → (many) Associate → (many) Session → (many) GapScore
                                               → (many) readinessStatus
             CurriculumWeek (1 per week)
```

Associates are assigned to a cohort by the trainer. This is a trainer-side operation, not associate-side.

### API surface

```
POST   /api/cohorts                    — create cohort
GET    /api/cohorts                    — list all cohorts (trainer)
PATCH  /api/cohorts/[id]               — update name, dates
DELETE /api/cohorts/[id]               — soft delete (set endDate)

GET    /api/cohorts/[id]/curriculum    — get weeks for cohort
POST   /api/cohorts/[id]/curriculum    — add week
PATCH  /api/cohorts/[id]/curriculum/[weekId] — update week

GET    /api/cohorts/[id]/associates    — roster for cohort
POST   /api/cohorts/[id]/associates    — assign associate to cohort (sets cohortId FK)

GET    /api/cohorts/[id]/readiness     — aggregate readiness (GROUP BY status)
```

All cohort API routes are protected by existing trainer auth middleware (`nlm_session` cookie check via `isAuthenticatedSession()`).

### Trainer dashboard integration

`/trainer` (MODIFIED):
- Add cohort selector at top (dropdown with all cohort names + "All Associates")
- When cohort is selected, roster query adds `WHERE cohortId = ?`
- Cohort aggregate strip above the table: `3 ready / 4 improving / 1 not ready`
- The existing `RosterTable` component is unchanged — it receives filtered associates as props

`/trainer/cohort/[id]` (NEW):
- Server Component, reads directly via Prisma
- Shows cohort metadata, curriculum schedule, aggregate readiness donut/bar
- Links to individual associate pages (existing `/trainer/[slug]`)

The existing `/trainer/[slug]` associate detail page is unchanged.

---

## Integration Point 4: Curriculum-Driven Question Selection

### Current mechanism

The setup wizard's `selectedWeeks` is a manually chosen array of week numbers. The `techMap` (week number → skill name) is built from GitHub question bank file paths at question load time, not from a persistent curriculum record.

### v1.1 integration

When an associate is in a cohort with a defined curriculum, the setup wizard should:
1. Fetch taught weeks: `GET /api/cohorts/[id]/curriculum?taught=true` (weeks where `startDate <= today`)
2. Auto-populate `selectedWeeks` with those week numbers
3. The `techMap` continues to be built from GitHub file paths — the curriculum `skillName` field should match the tech file naming convention

This is pre-population, not enforcement. The trainer can still modify the selection. The adaptive setup (gap-driven weight pre-population) continues to work on top of this — it sets weights after the weeks are selected.

**Key constraint:** `CurriculumWeek.weekNumber` must align with the week number convention used in GitHub question bank file paths. This is a naming convention contract, not enforced by code. Document it explicitly.

---

## Integration Point 5: Email Notifications

### Existing email infrastructure

`/api/send-email` uses Resend with `@react-pdf/renderer` for PDF reports. The Resend client and API key are already in place.

### v1.1 additions

Readiness change notifications (status transitions only, not every session):
- `not_ready → improving`: "Associate is showing improvement"
- `improving → ready`: "Associate has reached readiness threshold"
- `ready → not_ready` / `ready → improving`: "Associate readiness regression"

**Integration point in `readinessService.ts`:**

`updateAssociateReadiness()` is the single write point for readiness status. It already reads the old status before updating. Adding notification dispatch here keeps notification logic co-located with the state change.

```typescript
// In updateAssociateReadiness() — after computing result, before prisma.update:
const currentAssociate = await prisma.associate.findUnique({
  where: { id: associateId },
  select: { readinessStatus: true, displayName: true }
})
// ... prisma.update ...
if (currentAssociate?.readinessStatus !== result.status) {
  notificationService.sendReadinessChangeEmail(/* ... */).catch(/* fire-and-forget */)
}
```

`notificationService.ts` wraps the Resend client. No new email library needed. Trainer email address is either hardcoded in env var (`TRAINER_EMAIL`) or stored in Settings singleton (simplest path: env var for v1.1).

---

## Suggested Build Order

Dependencies flow in one direction: schema → services → API routes → UI.

### Phase 1: Cohort + Curriculum Schema Migration

**What:** Add `Cohort`, `CurriculumWeek` models. Add nullable `cohortId` on `Associate` and `Session`. Add `mode` field to `Session`.

**Why first:** Everything else (cohort API, dashboard views, curriculum question filtering) depends on these tables existing. No application logic changes — just schema + migration.

**Files changed:** `prisma/schema.prisma`, new migration file
**Risk:** Additive migration — no data loss, no breaking changes to existing queries

---

### Phase 2: Automated Interview → Readiness Pipeline

**What:** Modify `/api/public/interview/start` to accept `associateSlug`. Modify `/api/public/interview/complete` to call gap + readiness pipeline after persist. Add slug input to public interview UI.

**Why second:** This closes the highest-priority gap in the existing system with minimal code changes (~50 lines touching 2 route files + 1 UI component). It exercises existing services without building new ones. Can be shipped and validated before cohort management is built.

**Files changed:** `src/app/api/public/interview/start/route.ts`, `src/app/api/public/interview/complete/route.ts`, public interview UI component
**Depends on:** Phase 1 (Session needs `mode` field to mark automated sessions)

---

### Phase 3: Cohort CRUD API + Trainer Cohort Management UI

**What:** `/api/cohorts` CRUD. `/api/cohorts/[id]/curriculum` CRUD. `/api/cohorts/[id]/associates` for assignment. Basic trainer UI to create cohorts and assign associates.

**Why third:** Cohort data must exist before the dashboard can filter by it and before curriculum can drive question selection.

**Files changed:** New route handlers under `src/app/api/cohorts/`, new trainer UI components
**Depends on:** Phase 1 (schema)

---

### Phase 4: Cohort Dashboard Views

**What:** Modify `/trainer` to add cohort filter. Add `/trainer/cohort/[id]` aggregate view. These are read-only consumers of data from Phase 3.

**Why fourth:** Depends on cohorts existing (Phase 3) and sessions being tagged with cohortId (Phases 1-2).

**Files changed:** `src/app/trainer/page.tsx` (cohort selector), new `src/app/trainer/cohort/[id]/page.tsx`
**Depends on:** Phases 1-3

---

### Phase 5: Curriculum-Driven Question Selection

**What:** Setup wizard fetches taught weeks from curriculum and auto-populates `selectedWeeks`. Adaptive weight pre-population continues to work on top of this.

**Why fifth:** Requires cohort curriculum data to exist (Phase 3). Can be validated once a test cohort with curriculum is set up.

**Files changed:** Dashboard setup wizard component, new `/api/cohorts/[id]/curriculum?taught=true` query param
**Depends on:** Phases 1 and 3

---

### Phase 6: Email Notifications + Design Cohesion

**What:** `notificationService.ts` wrapping Resend. `updateAssociateReadiness()` modified to dispatch on status transition. Design tokens applied to public interview flow, auth page, associate profile page.

**Why sixth:** Notifications are useful but not blocking other features. Design cohesion is important for credibility but not a functional dependency.

**Files changed:** New `src/lib/notificationService.ts`, `src/lib/readinessService.ts`, public interview pages, login page, associate profile page
**Depends on:** Phase 2 (readiness pipeline must be running to generate notifications)

---

## Component Boundaries: New vs. Modified

| Component | Status | What Changes |
|-----------|--------|--------------|
| `prisma/schema.prisma` | MODIFIED | Add Cohort, CurriculumWeek; add cohortId to Associate + Session; add mode to Session |
| `src/app/api/public/interview/start/route.ts` | MODIFIED | Accept + validate associateSlug |
| `src/app/api/public/interview/complete/route.ts` | MODIFIED | Call gap + readiness pipeline after persist |
| `src/lib/readinessService.ts` | MODIFIED | Emit notification on status transition in `updateAssociateReadiness()` |
| `src/app/trainer/page.tsx` | MODIFIED | Add cohort selector filter |
| `src/app/api/cohorts/*` | NEW | Full CRUD for cohort + curriculum + associate assignment |
| `src/app/trainer/cohort/[id]/page.tsx` | NEW | Aggregate cohort readiness view (Server Component) |
| `src/lib/notificationService.ts` | NEW | Resend wrapper for readiness change emails |
| `src/middleware.ts` | UNCHANGED | Public interview routes stay unprotected; cohort API is trainer-only via cookie check in route handlers |
| `src/lib/sessionPersistence.ts` | UNCHANGED | No changes — associate upsert via slug already works |
| `src/lib/gapService.ts` | UNCHANGED | No changes — called from automated complete route same as trainer-led |
| `src/lib/gapPersistence.ts` | UNCHANGED | No changes |

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Adding Associate Login to v1.1

**What:** Adding a full auth system (credentials, sessions, JWT) for associates.
**Why bad:** Trainer-assigned slug identity already covers the v1.1 use case (linking automated sessions to a readiness record). Full auth requires email verification, password reset, session management — 3-5x the scope for no new user value.
**Instead:** Slug-based identity. Associates enter their slug at interview start. Create-on-first-session (existing behavior). Defer associate login to multi-tenancy phase.

### Anti-Pattern 2: Putting Cohort Logic in the Readiness Pipeline

**What:** Modifying `readinessService.ts` or `gapService.ts` to be cohort-aware.
**Why bad:** The readiness pipeline works per-associate. Cohort membership is context for display, not a variable in the readiness algorithm. Making the gap algorithm cohort-dependent would break the single-associate invariant.
**Instead:** Cohort-level views are aggregations over per-associate readiness records. The pipeline stays per-associate.

### Anti-Pattern 3: Blocking Automated Interview Completion on Gap Scoring

**What:** `await` the gap scoring inside `/api/public/interview/complete` before returning.
**Why bad:** Gap scoring queries all prior sessions for the associate, runs weighted averages, and writes multiple GapScore rows. This adds 200-500ms to the completion response. Associates experience a hang at the end of their interview.
**Instead:** Fire-and-forget (same pattern as trainer-led sessions). The readiness pipeline runs asynchronously after the response is sent.

### Anti-Pattern 4: Storing Curriculum in the Question Bank Repo

**What:** Embedding cohort curriculum as YAML frontmatter or a special file in the GitHub question bank repo.
**Why bad:** Curriculum is org/cohort-specific operational data. The question bank is content. Mixing them couples deployment cadence and creates access control confusion (trainers need to push to the GitHub repo to update curriculum).
**Instead:** Curriculum in the Supabase DB (the `CurriculumWeek` model). Trainers manage it via the dashboard UI, not via GitHub pushes.

### Anti-Pattern 5: Fetching Cohort Data Client-Side in Trainer Dashboard

**What:** Trainer dashboard uses `useEffect + fetch('/api/cohorts')` to load cohorts, then a second fetch for associates.
**Why bad:** Two sequential client-side fetches cascade — cohorts load, then associates load with a visible delay. The existing trainer page already has this pattern (useEffect + fetch) and it causes a flash of empty state.
**Instead:** Server Component for initial render. Fetch cohorts and associates in parallel via Prisma in the async Server Component. Pass both as props to the client island.

---

## Scalability Notes

| Concern | v1.1 Approach | Future |
|---------|---------------|--------|
| Cohort aggregate readiness query | Prisma `groupBy` on Associate.readinessStatus WHERE cohortId=? — fast at < 200 associates | Materialized view if roster grows to thousands |
| Curriculum taught-weeks query | `CurriculumWeek WHERE cohortId=? AND startDate <= now()` — single indexed query | No change needed |
| Readiness notifications volume | One email per associate per status transition — low volume for a training org | Rate-limit at notificationService level if needed |
| Associate auth | Slug-based identity — no session state | Add Supabase Auth when multi-tenancy requires it |

---

## Sources

- Direct codebase analysis (HIGH confidence): `src/middleware.ts`, `src/lib/auth-server.ts`, `src/lib/readinessService.ts`, `src/lib/sessionPersistence.ts`, `src/lib/adaptiveSetup.ts`, `src/app/api/public/interview/complete/route.ts`, `src/app/api/public/interview/start/route.ts`, `src/app/trainer/page.tsx`, `prisma/schema.prisma`
- PROJECT.md v1.1 milestone goals and constraints (HIGH confidence): read directly
- Next.js App Router Server Component + Prisma direct query pattern: established practice, consistent with existing dashboard implementation (HIGH confidence)
- Resend API for notifications: already in use in `/api/send-email`, no new integration required (HIGH confidence)
