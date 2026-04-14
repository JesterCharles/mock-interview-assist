# Phase 4: Gap Service - Research

**Researched:** 2026-04-13
**Domain:** Recency-weighted gap scoring algorithm, Prisma GapScore model, question-bank metadata extraction
**Confidence:** HIGH (algorithm fully specified in CLAUDE.md; codebase verified by direct read; no new external dependencies)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01 (Gap Algorithm):** Recency-weighted average: `score_n * 0.8^0 + score_(n-1) * 0.8^1 + ...` normalized by sum of weights. Computed per skill AND per topic within each skill. As documented in CLAUDE.md §Gap Tracking Algorithm.
- **D-02 (Topic Source):** Topic tags derived from question bank Markdown metadata. File path/name = skill (e.g., `react.md` → React). Keywords extracted by `markdownParser.ts` serve as topic-level tags within each skill.
- **D-03 (Score Extraction):** Per-question scores come from `assessments` JSON stored in Phase 2. Use `finalScore` (trainer-validated) when available, fall back to `llmScore`. Map each question's score to its skill (from question `weekNumber`/tech file origin) and topics (from `keywords`).
- **D-04 (Computation Timing):** Gap scores computed on session save (not on dashboard load). Stored as denormalized records in a `GapScore` table. Updated whenever a new session is saved for an associate. Keeps dashboard reads fast.
- **D-05 (3-Session Gate):** Associates with fewer than 3 completed sessions show a placeholder message instead of gap scores. Gate check is a simple count query, not part of gap calculation.
- **D-06 (Gap Score Storage):** New `GapScore` Prisma model: `associateId`, `skill`, `topic` (nullable for skill-level scores), `weightedScore`, `sessionCount`, `lastUpdated`. Composite unique on `(associateId, skill, topic)`.

### Claude's Discretion
- Whether to compute gaps as a service function or API route
- Normalization approach for scores across different question difficulties
- Whether to store raw score history or just the weighted aggregate

### Deferred Ideas (OUT OF SCOPE)
- Autoresearch optimization of the 0.8 decay factor — noted for post-MVP optimization loop
- Cross-associate gap comparison — future dashboard feature
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GAP-01 | Two-level gap tracking: skill level and topic level within each skill | GapScore model uses nullable `topic` field — NULL = skill-level, populated = topic-level. One upsert path handles both. |
| GAP-02 | Recency-weighted scoring with 0.8 decay factor per session | Verified algorithm from CLAUDE.md: `Σ(score_i * 0.8^(n-1-i)) / Σ(0.8^(n-1-i))`. Pure TypeScript, no external library. |
| GAP-03 | Minimum 3 sessions gate before gap scores display | Simple `COUNT` query on sessions for associateId. Gate enforced at read time (API or component), not embedded in computation. |
| GAP-04 | Topic tags derived from question bank Markdown metadata (validate tag consistency first) | Keywords already extracted by `markdownParser.ts` per question. Skill extracted from `weekNumber` (maps to tech file). Tag consistency risk documented in pitfalls. |
</phase_requirements>

---

## Summary

Phase 4 builds a pure-TypeScript gap computation service (`src/lib/gapService.ts`) that reads completed session assessments from Supabase, applies a recency-weighted average, and upserts the results into a new `GapScore` Prisma model. No new npm packages are required — this phase is entirely algorithmic, building on Prisma (Phase 1) and Session data (Phase 2) from prior phases.

The algorithm is fully specified in CLAUDE.md: sessions are ordered newest-first, each session's contribution decays by `0.8^position`, and the weighted sum is normalized. Scores are computed at two granularities: skill-level (aggregating all questions from a given tech file) and topic-level (per keyword within that skill). The `GapScore` table uses a nullable `topic` column with a composite unique key — NULL means skill-level, populated means topic-level.

The primary engineering challenges are: (1) correctly reconstructing the skill identity for each question from the `assessments` JSON (since `ParsedQuestion.weekNumber` maps to a tech file, not a human-readable skill name), (2) handling questions that have neither `finalScore` nor `llmScore` (skipped/did-not-get-to questions), and (3) triggering gap recomputation from the Phase 2 session save path without creating circular imports or tight coupling.

**Primary recommendation:** Implement gap computation as a service function in `src/lib/gapService.ts`, called from the `/api/history` POST handler after the Supabase session write succeeds. Keep it fire-and-forget (log errors, don't fail the session save). Store only the weighted aggregate — not raw per-session scores — in `GapScore` (raw history is in the `Session.assessments` JSON column).

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma + @prisma/client | 7.7.0 | GapScore model schema, upsert queries | Already locked in Phase 1; no new dependency |
| TypeScript | 5.x | Gap algorithm implementation | Project-standard; no external gap library needed |
| zod | 4.3.6 | Input validation for gap API endpoint | Listed in CLAUDE.md recommended stack; validates gap read requests |

[VERIFIED: project codebase read — no test framework installed]
[VERIFIED: package.json — no zod yet, install needed]
[VERIFIED: CLAUDE.md — zod 4.3.6 listed as recommended, "install and use"]

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | 3.x | Unit tests for gap algorithm | Phase 4 introduces pure business logic — ideal unit test target. No test framework currently installed. Must be added. |
| @vitest/coverage-v8 | 3.x | Coverage for gap algorithm | Pair with vitest for confidence coverage |

[ASSUMED] Vitest 3.x is current stable as of April 2026 — version not verified against npm registry in this session.

**Installation:**
```bash
# Production deps
npm install zod@4.3.6

# Dev deps (test framework — none currently installed)
npm install --save-dev vitest @vitest/coverage-v8
```

**Version verification note:** `zod@4.3.6` confirmed in CLAUDE.md recommended stack. Vitest version is [ASSUMED] — verify with `npm view vitest version` before installing.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom weighted avg | SM-2 spaced repetition | Wrong domain (flashcard scheduling, not skill gap). Explicitly excluded in REQUIREMENTS.md. |
| Custom weighted avg | Any ML library | 50-line weighted average is sufficient. Adding ML infrastructure for this is over-engineering. |
| Vitest | Jest | Jest requires more config with ESM + Next.js 16. Vitest has native ESM, faster, less config. |

---

## Architecture Patterns

### Recommended File Structure

```
src/lib/
├── gapService.ts          # Gap computation and upsert (new)
prisma/
├── schema.prisma          # Add GapScore model (extending Phase 1/2/3 schema)
src/app/api/
├── associate/[slug]/gaps/ # GET endpoint — returns gap scores for a slug (new)
│   └── route.ts
src/lib/__tests__/
├── gapService.test.ts     # Unit tests for algorithm
```

### Pattern 1: Service Function (not API route) for Gap Computation

**What:** `computeAndSaveGaps(associateId: string, sessions: SessionWithAssessments[]): Promise<void>` — pure function, called from `/api/history` POST handler.

**When to use:** Computation is triggered by an event (session save), not a user request. Keeps gap logic decoupled from HTTP layer.

**Example:**
```typescript
// Source: CONTEXT.md D-04, CLAUDE.md §Gap Tracking Algorithm [ASSUMED pattern]
// Called in /api/history POST after successful Supabase write:
try {
  await computeAndSaveGaps(associateId);
} catch (err) {
  // fire-and-forget: log but don't fail the session save
  console.error('[gap-service] failed to update gaps:', err);
}
```

### Pattern 2: Recency-Weighted Average Algorithm

**What:** Sessions ordered newest-first. Session at index 0 (newest) gets weight `0.8^0 = 1.0`. Session at index N gets weight `0.8^N`. Weighted sum divided by sum of weights.

**When to use:** Always — this is the locked algorithm (D-01).

**Example:**
```typescript
// Source: CLAUDE.md §Gap Tracking Algorithm [VERIFIED]
function weightedAverage(scores: number[]): number {
  // scores[0] = newest, scores[n-1] = oldest
  let weightedSum = 0;
  let weightSum = 0;
  scores.forEach((score, index) => {
    const weight = Math.pow(0.8, index);
    weightedSum += score * weight;
    weightSum += weight;
  });
  return weightSum === 0 ? 0 : weightedSum / weightSum;
}
```

### Pattern 3: GapScore Prisma Model

**What:** Composite unique on `(associateId, skill, topic)`. Topic is nullable string — NULL = skill-level aggregate, non-null = topic-level.

**When to use:** Schema definition (Phase 4 migration).

**Example:**
```prisma
// Source: CONTEXT.md D-06 [VERIFIED]
model GapScore {
  id            String    @id @default(cuid())
  associateId   String
  skill         String    // e.g., "react", "javascript"
  topic         String?   // e.g., "hooks", "async" — null = skill-level
  weightedScore Float
  sessionCount  Int
  lastUpdated   DateTime  @updatedAt

  associate     Associate @relation(fields: [associateId], references: [id])

  @@unique([associateId, skill, topic])
}
```

**Note on NULL uniqueness:** In PostgreSQL, two NULL values are NOT equal in a unique constraint — `(assocId, skill, NULL)` and `(assocId, skill, NULL)` would be treated as distinct rows, creating duplicates. **Must use a sentinel value instead of NULL for skill-level records**, or use a partial index. Recommended: use `topic = ""` (empty string) for skill-level records, `topic = "hooks"` for topic-level. [VERIFIED: PostgreSQL NULL uniqueness behavior — standard SQL standard, HIGH confidence]

### Pattern 4: Skill Identity from Question Metadata

**What:** Map `ParsedQuestion.weekNumber` to a skill name. Questions in the existing system use `weekNumber` to identify which tech file they came from (e.g., week 1 = React, week 2 = TypeScript). The setup wizard stores `selectedTechs` as `GitHubFile[]` with `path` and `name` fields.

**When to use:** When iterating assessments to extract per-skill scores.

**Research finding:** The current `InterviewSession` type stores `selectedWeeks: number[]` but NOT a mapping of weekNumber → skill name. The skill name is in the session setup wizard's `selectedTechs` (Zustand store), which is NOT persisted to the session object. [VERIFIED: types.ts, interviewStore.ts read]

**This is a critical gap:** The planner must decide how to resolve skill identity. Options:
1. Add `techMap: Record<number, string>` to `InterviewSession` and persist it in Phase 2 session schema — cleanest, needs retroactive addition to Phase 2 schema.
2. Derive skill from question `id` format (`week${N}-q${M}`) and use weekNumber as the skill key — no human-readable name, but consistent.
3. Accept opaque skill keys (e.g., `"week-1"`, `"week-2"`) for MVP — readable after Phase 6 dashboard maps them.

Recommended: Store `techMap: Record<number, string>` (weekNumber → file path/name) in the Session Prisma model (Phase 2 addition). [ASSUMED — this field does not yet exist in the confirmed Phase 2 schema]

### Anti-Patterns to Avoid

- **Computing gaps on dashboard load:** Expensive for any associate with many sessions. D-04 explicitly prohibits this.
- **NULL in composite unique for skill-level:** PostgreSQL treats NULLs as distinct in unique constraints — will create duplicate skill-level rows on repeated upserts. Use sentinel string `""` instead.
- **Including `didNotGetTo: true` questions in gap scores:** These questions have no meaningful score. Skip them entirely during gap computation.
- **Including starter questions in gap scores:** Starter questions (`starter-1`, `starter-2`) have no skill/topic mapping. Filter by `questionId` prefix.
- **Blocking session save on gap failure:** Gap computation is secondary. If it fails, the session must still be saved.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Type-safe DB upsert with composite key | Custom INSERT...ON CONFLICT SQL | Prisma `upsert` with `where: { associateId_skill_topic: {...} }` | Prisma handles the SQL; composite unique name is auto-generated |
| Input validation for gap API | Manual type checks | zod schema | Edge cases (empty strings, negative scores, out-of-range values) |
| Test assertions | Manual console.log comparison | vitest `expect` | Numerical floating-point assertions need `toBeCloseTo`, not `===` |

**Key insight:** The gap algorithm is 50 lines of pure math. Everything else (DB, validation, testing) uses the project's established patterns.

---

## Runtime State Inventory

> This is not a rename/refactor phase. Section omitted.

---

## Common Pitfalls

### Pitfall 1: PostgreSQL NULL Uniqueness in Composite Unique Constraint

**What goes wrong:** `GapScore` model uses `topic String?` (nullable). Two rows with `topic = null` for the same `(associateId, skill)` are NOT considered duplicates in PostgreSQL's unique constraint — each upsert creates a new row instead of updating.

**Why it happens:** SQL standard: NULL != NULL. PostgreSQL implements this literally in unique indexes.

**How to avoid:** Use `topic String @default("")` with sentinel value `""` for skill-level records. Topic-level records use the keyword string directly. Prisma upsert then works correctly: `where: { associateId_skill_topic: { associateId, skill, topic: "" } }` for skill-level.

**Warning signs:** GapScore table grows unboundedly per associate; skill-level score count keeps increasing instead of staying at 1 per (associate, skill).

[VERIFIED: PostgreSQL NULL unique constraint behavior — standard SQL, HIGH confidence]

### Pitfall 2: Skill Identity Gap — weekNumber ≠ skill name

**What goes wrong:** `ParsedQuestion.weekNumber` is an integer (e.g., 1, 2). The skill name ("React", "TypeScript") lives in the GitHub file path, which is NOT stored on the question or session in the current type system.

**Why it happens:** The existing architecture was built for single-session display, not cross-session aggregation. weekNumber was sufficient for question selection weighting.

**How to avoid:** Add `techMap: Record<number, string>` to the session when it's created in Phase 2 (or Phase 4 adds it retroactively). Alternatively, use week numbers as opaque skill keys (`"week-1"`) — acceptable for MVP since the dashboard will need a display mapping anyway.

**Warning signs:** All gap scores show numeric keys (`"week-1"`) instead of human-readable skill names on the dashboard.

[VERIFIED: types.ts, interviewStore.ts — no techMap field exists]

### Pitfall 3: Skipped / Unscored Questions Polluting Averages

**What goes wrong:** `QuestionAssessment` has `didNotGetTo: boolean` and both `llmScore` and `finalScore` can be undefined. Including these in the average artificially lowers scores.

**Why it happens:** Not all questions in a session are answered — trainers may skip questions or run out of time.

**How to avoid:** In gap computation, skip any assessment where `didNotGetTo === true` OR both `llmScore` and `finalScore` are undefined/null. Only include questions with an actual score.

**Warning signs:** Associates who had many skipped questions show lower gap scores than those who answered fewer questions fully.

[VERIFIED: types.ts QuestionAssessment interface — `didNotGetTo: boolean`, `llmScore?: number`, `finalScore?: number`]

### Pitfall 4: Starter Questions Included in Gap Scores

**What goes wrong:** Session assessments include `starter-1` and `starter-2` question IDs. These are behavioral/soft-skill questions with no skill/tech mapping.

**Why it happens:** Assessments map is keyed by `questionId`, which includes all questions.

**How to avoid:** Filter assessments to only process `ParsedQuestion` entries (those from the `session.questions` array), not the `starterQuestions` array. Or filter by `questionId` prefix: skip IDs matching `/^starter-/`.

[VERIFIED: types.ts InterviewSession interface — `starterQuestions: StarterQuestion[]`, `questions: ParsedQuestion[]` are separate arrays]

### Pitfall 5: Integer vs Float Scores in Weighted Average

**What goes wrong:** LLM scores and final scores are stored as integers (0-100). Division in the weighted average may lose precision.

**Why it happens:** JavaScript integer arithmetic is fine, but Prisma `Float` column receives the result. Test comparisons using `===` on floats fail.

**How to avoid:** Use `toBeCloseTo(expected, 5)` in vitest assertions for weighted average output. Store scores as floats in Prisma — `weightedScore Float` is correct.

[VERIFIED: types.ts — `llmScore?: number`, `finalScore?: number` (JavaScript number, can be float)]

---

## Code Examples

Verified patterns from codebase and CLAUDE.md:

### Weighted Average (Core Algorithm)

```typescript
// Source: CLAUDE.md §Gap Tracking Algorithm [VERIFIED]
// scores: number[] — ordered newest-first, each element is a session's avg score for this skill/topic
function recencyWeightedAverage(scores: number[]): number {
  const DECAY = 0.8;
  let weightedSum = 0;
  let weightSum = 0;
  scores.forEach((score, index) => {
    const weight = Math.pow(DECAY, index);
    weightedSum += score * weight;
    weightSum += weight;
  });
  return weightSum === 0 ? 0 : weightedSum / weightSum;
}
```

### Score Extraction from Assessment JSON

```typescript
// Source: types.ts QuestionAssessment interface [VERIFIED]
function extractScore(assessment: QuestionAssessment): number | null {
  if (assessment.didNotGetTo) return null;
  if (assessment.finalScore !== undefined) return assessment.finalScore;
  if (assessment.llmScore !== undefined) return assessment.llmScore;
  return null;
}
```

### Prisma Upsert for GapScore

```typescript
// Source: Prisma docs upsert pattern [ASSUMED — Prisma 7 upsert API]
await prisma.gapScore.upsert({
  where: {
    associateId_skill_topic: {
      associateId,
      skill,
      topic: topicKey, // "" for skill-level, keyword string for topic-level
    },
  },
  update: {
    weightedScore,
    sessionCount,
    lastUpdated: new Date(),
  },
  create: {
    associateId,
    skill,
    topic: topicKey,
    weightedScore,
    sessionCount,
    lastUpdated: new Date(),
  },
});
```

### 3-Session Gate Check

```typescript
// Source: CONTEXT.md D-05 [VERIFIED]
const sessionCount = await prisma.session.count({
  where: {
    associateId,
    status: 'completed',
  },
});
const hasEnoughSessions = sessionCount >= 3;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Simple average across all sessions | Recency-weighted decay (0.8) | Design decision (pre-roadmap) | Newer sessions matter more — reflects current state of associate, not all-time average |
| Single-level skill tracking | Two-level (skill + topic within skill) | GAP-01 requirement | More granular gaps; dashboard can show "React: weak on hooks" not just "React: weak" |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Vitest 3.x is current stable (April 2026) | Standard Stack | Wrong version installed; low risk — any vitest 2+ works for these unit tests |
| A2 | Prisma 7 upsert uses auto-named composite key `associateId_skill_topic` | Code Examples | Upsert won't compile; fix: check generated client for actual key name after `prisma generate` |
| A3 | `techMap` does not exist in Phase 2 Session schema | Pitfall 2, Architecture | If Phase 2 already added this field, the pitfall is resolved; verify Phase 2 PLAN.md before implementing |
| A4 | Prisma `upsert` with composite NULL-equivalent sentinel string works correctly in Prisma 7 | Architecture Pattern 3 | Upsert may behave differently; test with actual DB before relying on it |

---

## Open Questions

1. **Skill identity: weekNumber → skill name mapping**
   - What we know: `ParsedQuestion.weekNumber` is an integer; `InterviewSession.selectedWeeks` is `number[]`; no weekNumber-to-skillName map is persisted in the session type
   - What's unclear: Does Phase 2 plan add this mapping to the Session schema? If not, Phase 4 must either add it (schema change) or accept opaque week-number keys
   - Recommendation: Planner should check Phase 2 PLAN.md for any `techMap` or `selectedTechs` field addition. If absent, add `techMap: Json` to the Session model as part of Phase 4's schema migration. This is a small schema addition that does not break backward compat (nullable column).

2. **Session ordering for decay: how to sort sessions**
   - What we know: Sessions have a `date` field (string, ISO format) in `InterviewSession`
   - What's unclear: The Prisma Session model (Phase 2) may use `createdAt` timestamp instead of the `date` string
   - Recommendation: Sort by `createdAt DESC` when fetching sessions from DB. The algorithm requires newest-first order.

3. **Keyword normalization: are keywords consistent across question bank files?**
   - What we know: STATE.md documents "Tag consistency in question bank Markdown must be validated before GAP-04 can proceed"
   - What's unclear: The actual question bank repo content is not accessible during this research session
   - Recommendation: Wave 0 of Phase 4 must include a validation step — fetch question bank via GitHub API and audit keyword consistency. If keywords are inconsistent (e.g., "React Hooks" vs "hooks" vs "react-hooks"), normalize to lowercase trimmed strings in the gap service before using as topic keys.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Gap service (TypeScript) | Yes | v24.2.0 | — |
| Prisma CLI | Schema migration | To be installed (Phase 1) | 7.7.0 (planned) | — |
| Supabase (PostgreSQL) | GapScore persistence | External service | — | File-based gap cache (not recommended) |
| vitest | Unit tests | No — not installed | — | Skip unit tests (not recommended; pure algorithm is ideal test target) |
| zod | API validation | No — not installed | 4.3.6 (planned) | Manual type checks |

**Missing dependencies with no fallback:**
- Supabase connection — blocked until Phase 1 completes and DATABASE_URL is configured. Phase 4 cannot be executed until Phase 1 is done.

**Missing dependencies with fallback:**
- vitest — tests can be skipped, but the weighted average algorithm is pure math and ideal for unit testing. Strongly recommend installing.
- zod — manual type checks acceptable as fallback, but zod is lightweight and already recommended.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest (not yet installed — Wave 0 gap) |
| Config file | `vitest.config.ts` — Wave 0 must create |
| Quick run command | `npx vitest run src/lib/__tests__/gapService.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GAP-01 | Skill-level scores computed (topic = "") | unit | `npx vitest run src/lib/__tests__/gapService.test.ts` | Wave 0 |
| GAP-01 | Topic-level scores computed per keyword | unit | `npx vitest run src/lib/__tests__/gapService.test.ts` | Wave 0 |
| GAP-02 | 0.8 decay applied: session 0 weight=1.0, session 1 weight=0.8 | unit | `npx vitest run src/lib/__tests__/gapService.test.ts` | Wave 0 |
| GAP-02 | Weighted average normalized by sum of weights | unit | `npx vitest run src/lib/__tests__/gapService.test.ts` | Wave 0 |
| GAP-03 | 3-session gate returns false for < 3 sessions | unit | `npx vitest run src/lib/__tests__/gapService.test.ts` | Wave 0 |
| GAP-03 | 3-session gate returns true for >= 3 sessions | unit | `npx vitest run src/lib/__tests__/gapService.test.ts` | Wave 0 |
| GAP-04 | Keywords extracted from assessments become topic keys | unit | `npx vitest run src/lib/__tests__/gapService.test.ts` | Wave 0 |
| GAP-04 | `didNotGetTo` questions excluded from score | unit | `npx vitest run src/lib/__tests__/gapService.test.ts` | Wave 0 |
| GAP-04 | Starter questions excluded (id prefix `starter-`) | unit | `npx vitest run src/lib/__tests__/gapService.test.ts` | Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run src/lib/__tests__/gapService.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `vitest.config.ts` — vitest configuration with TypeScript + path aliases (`@/*` → `src/*`)
- [ ] `package.json` — add `"test": "vitest run"` and `"test:watch": "vitest"` scripts
- [ ] `npm install --save-dev vitest @vitest/coverage-v8` — install test framework
- [ ] `src/lib/__tests__/gapService.test.ts` — unit tests for gap algorithm (covers all GAP-0x reqs above)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | yes | Existing `isAuthenticatedSession()` guard — gap read endpoint must be protected |
| V5 Input Validation | yes | zod — validate associateSlug in gap read endpoint |
| V6 Cryptography | no | — |

### Known Threat Patterns for Gap API

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthorized gap score read (associate data exposure) | Information Disclosure | `isAuthenticatedSession()` guard on `/api/associate/[slug]/gaps` |
| Slug enumeration (guessing associate slugs) | Information Disclosure | Auth guard means unauthenticated requests get 401, not 404 — slug existence not revealed |
| Score injection via assessments JSON | Tampering | Scores come from DB (Phase 2 write) not from user request; gap computation reads existing data |

---

## Project Constraints (from CLAUDE.md)

Directives the planner must verify compliance with:

| Constraint | Source | Impact on Phase 4 |
|------------|--------|-------------------|
| Backwards compatible — trainer-led and public interview modes must keep working | CLAUDE.md §Constraints | Gap computation is additive (fire-and-forget on session save). Do NOT modify existing session save response shape. |
| Service modules in `src/lib/` — no class patterns | CLAUDE.md §Established Patterns | `gapService.ts` exports functions, not a class |
| Path alias `@/*` maps to `src/*` | CLAUDE.md §Tech Stack | All imports use `@/lib/gapService` not relative paths |
| Always read DESIGN.md before UI decisions | CLAUDE.md §Design System | Phase 4 is pure service logic — no UI. DESIGN.md consulted; no UI components in scope. |
| Dual-write migration: file storage + Supabase during migration | CLAUDE.md §Constraints | Gap computation only runs against Supabase sessions (associates exist only in DB). No file-storage gap equivalent needed. |
| GSD workflow enforcement — use GSD commands for file edits | CLAUDE.md §GSD Workflow Enforcement | Planner enforces task execution through `/gsd-execute-phase` |

---

## Sources

### Primary (HIGH confidence)

- `CLAUDE.md §Gap Tracking Algorithm` — 0.8 decay coefficient, formula, readiness signal, recommended area logic — [VERIFIED: file read]
- `src/lib/types.ts` — `ParsedQuestion`, `QuestionAssessment`, `InterviewSession` type shapes — [VERIFIED: file read]
- `src/lib/markdownParser.ts` — keyword extraction pattern (keywords from `**Keywords:** ...` line) — [VERIFIED: file read]
- `src/store/interviewStore.ts` — absence of techMap field confirmed — [VERIFIED: file read]
- `.planning/phases/04-gap-service/04-CONTEXT.md` — all locked decisions — [VERIFIED: file read]
- `.planning/REQUIREMENTS.md` — GAP-01 through GAP-04 requirement text — [VERIFIED: file read]
- PostgreSQL NULL unique constraint behavior — standard SQL specification — [VERIFIED: well-established database behavior, HIGH confidence]

### Secondary (MEDIUM confidence)

- `src/app/api/history/route.ts` — integration point for triggering gap computation — [VERIFIED: file read]
- `.planning/phases/02-session-persistence/02-CONTEXT.md` — assessments as JSON column decision — [VERIFIED: file read]
- `.planning/phases/03-associate-profiles/03-CONTEXT.md` — Associate model with slug — [VERIFIED: file read]

### Tertiary (LOW confidence)

- Vitest 3.x as current stable — [ASSUMED: not verified against npm registry in this session]
- Prisma 7 upsert composite key naming convention (`associateId_skill_topic`) — [ASSUMED: standard Prisma behavior, verify post `prisma generate`]

---

## Metadata

**Confidence breakdown:**
- Gap algorithm: HIGH — fully specified in CLAUDE.md, pure math, verified
- Type shapes and integration points: HIGH — verified by direct codebase read
- Prisma GapScore model: HIGH — schema is straightforward; NULL sentinel pitfall documented
- Skill identity gap: MEDIUM — problem identified, resolution requires planner decision
- Test framework (vitest): MEDIUM — not installed, version assumed

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (stable domain — algorithm is locked, dependencies are locked)
