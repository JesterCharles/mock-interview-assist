# Phase 5: Readiness Signals - Research

**Researched:** 2026-04-13
**Domain:** Computed readiness classification, configurable thresholds, Prisma schema extensions
**Confidence:** HIGH

## Summary

Phase 5 adds a computed readiness signal per associate that answers the trainer's core question: "Is this person ready?" The computation is a pure TypeScript function over data that Phase 4 already stores — no new data sources, no external libraries, and no heavy infrastructure. The three deliverables are: (1) a `computeReadiness()` service function that classifies each associate as "ready", "improving", or "not ready"; (2) a `recommendedArea` derivation that returns the lowest weighted gap score topic; and (3) a `Settings` model that persists the configurable threshold so trainers can raise or lower the 75% default.

The computation trigger is session save — the same pipeline that already triggers gap score computation in Phase 4. Readiness fields are stored directly on the `Associate` model (`readinessStatus`, `recommendedArea`, `lastComputedAt`) so Phase 6 dashboard reads are instant lookups with zero recalculation.

The only genuinely new concern is the threshold-change recalculation: when a trainer adjusts the threshold, ALL associates must be recomputed. This is a bulk update, not a single-record update, and must be handled efficiently. For an MVP with a small number of associates, a synchronous batch recompute triggered from the settings API route is sufficient.

**Primary recommendation:** Implement as `src/lib/readinessService.ts` calling into the existing `GapScore` table, updating `Associate` fields, and reading threshold from a `Settings` Prisma model. No new dependencies required.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Ready = 75% weighted avg + 3+ sessions + non-negative trend (slope of last 3 sessions >= 0). As specified in CLAUDE.md and READY-01.
- **D-02:** Three badge states: "ready" (meets all criteria), "improving" (3+ sessions with positive trend but below threshold), "not ready" (below threshold or negative trend or < 3 sessions).
- **D-03:** Lowest weighted gap score topic = recommended next practice area. Displayed per associate. As specified in READY-02.
- **D-04:** Readiness threshold (default 75%) stored in a `Settings` table or config record. Trainer can change via a settings UI. Changing threshold recalculates all badges. As per READY-03.
- **D-05:** Readiness signal computed on session save (same trigger as gap scores in Phase 4). Stored as fields on the Associate model: `readinessStatus`, `recommendedArea`, `lastComputedAt`. Pre-computed so dashboard reads are instant (DASH-05).

### Claude's Discretion

- Settings UI location (inline on dashboard vs separate /settings page)
- "Improving" state exact criteria (positive trend interpretation)
- Whether to show trend direction icon alongside badge

### Deferred Ideas (OUT OF SCOPE)

- Notification when associate moves to "ready" status — future feature
- Historical readiness timeline — future dashboard enhancement
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| READY-01 | Computed readiness signal: 75% avg score across last 3 sessions with non-negative trend | Algorithm section, GapScore data model, trend computation pattern |
| READY-02 | Next recommended practice area per associate (lowest weighted gap score) | GapScore table already stores per-topic weighted scores; min() over those records |
| READY-03 | Readiness threshold configurable per trainer via settings | Settings Prisma model, recalculation on threshold change, settings API route |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma CLI + @prisma/client | 7.7.0 | Schema migration (Settings model, Associate field additions), typed queries | Already locked in CLAUDE.md. [VERIFIED: CLAUDE.md] |
| zod | 4.3.6 | Validate settings API payload (threshold value 0–100) | Already locked in CLAUDE.md. [VERIFIED: CLAUDE.md] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| No new libraries | — | Phase 5 is pure TypeScript over existing DB | All logic is custom business rules over Prisma queries |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom trend computation | A stats library (simple-statistics) | 3-point slope is 2 lines of math; a library adds a dep for no gain |
| Settings Prisma model | Hard-coded env var | Env var cannot be changed at runtime without redeployment; settings UI requires DB storage |
| Sync batch recompute on threshold change | Background job / queue | Overkill for MVP associate counts (<100); sync is simpler and sufficient |

**Installation:** No new packages. All dependencies already in the project.

---

## Architecture Patterns

### Where Readiness Fits in the Save Pipeline

```
POST /api/history (session save)
  └── Phase 2: dual-write to file + Supabase Session row
        └── Phase 4: computeGapScores(associateId) → upsert GapScore rows
              └── Phase 5: computeReadiness(associateId, threshold) → update Associate fields
```

Each phase adds a step to the same async tail of the session save. Phase 5 runs after Phase 4 gap scores are written.

### Recommended Project Structure

```
src/
├── lib/
│   ├── gapService.ts          # Phase 4 — gap score computation (reads from here)
│   ├── readinessService.ts    # Phase 5 — readiness classification (NEW)
│   └── settingsService.ts     # Phase 5 — get/set trainer settings (NEW)
├── app/
│   └── api/
│       ├── settings/
│       │   └── route.ts       # GET + PUT threshold (NEW)
│       └── history/
│           └── route.ts       # Existing — add readiness trigger to POST
```

### Pattern 1: readinessService.ts — Classification Logic

**What:** Pure function over GapScore data. Reads gap scores for an associate, computes weighted average, trend, and badge.

**When to use:** Called from two places — (a) end of session save pipeline, (b) bulk recompute triggered by threshold change.

```typescript
// [ASSUMED] — pattern derived from CLAUDE.md algorithm spec and Phase 4 context
// Source: CLAUDE.md §Gap Tracking Algorithm + Phase 4 D-06 (GapScore model)

type ReadinessStatus = 'ready' | 'improving' | 'not_ready';

interface ReadinessResult {
  status: ReadinessStatus;
  recommendedArea: string | null;  // null when < 3 sessions
  lastComputedAt: Date;
}

async function computeReadiness(
  associateId: string,
  threshold: number  // 0–100, default 75
): Promise<ReadinessResult> {
  // 1. Fetch skill-level GapScores for the associate
  const gapScores = await prisma.gapScore.findMany({
    where: { associateId, topic: null },  // skill-level only
    orderBy: { weightedScore: 'asc' },
  });

  // 2. Gate: < 3 sessions → not_ready, no recommendation
  const sessionCount = await prisma.session.count({ where: { associateId } });
  if (sessionCount < 3) {
    return { status: 'not_ready', recommendedArea: null, lastComputedAt: new Date() };
  }

  // 3. Weighted average across all skills
  const avg = gapScores.reduce((sum, g) => sum + g.weightedScore, 0) / gapScores.length;

  // 4. Trend: slope of last 3 session overall scores
  const trend = computeTrend(associateId);  // see Pattern 2

  // 5. Classify
  let status: ReadinessStatus;
  if (avg >= threshold && trend >= 0) {
    status = 'ready';
  } else if (sessionCount >= 3 && trend > 0) {
    status = 'improving';
  } else {
    status = 'not_ready';
  }

  // 6. Recommended area = lowest weighted score topic
  const lowestTopic = await prisma.gapScore.findFirst({
    where: { associateId, topic: { not: null } },
    orderBy: { weightedScore: 'asc' },
  });

  return {
    status,
    recommendedArea: lowestTopic?.topic ?? gapScores[0]?.skill ?? null,
    lastComputedAt: new Date(),
  };
}
```

### Pattern 2: Trend Computation (3-Point Slope)

**What:** Compute non-negative trend from last 3 session overall scores. Slope >= 0 is a pass. [ASSUMED]

```typescript
// Source: CLAUDE.md §Gap Tracking Algorithm — "non-negative trend (last 3 sessions slope >= 0)"

async function computeTrend(associateId: string): Promise<number> {
  const recentSessions = await prisma.session.findMany({
    where: { associateId },
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: { overallScore: true },
  });

  if (recentSessions.length < 3) return -1;  // insufficient data

  // Simple linear regression slope over [0, 1, 2] x-axis
  const scores = recentSessions.reverse().map(s => s.overallScore);
  const n = scores.length;
  const xMean = 1;  // (0+1+2)/3
  const yMean = scores.reduce((a, b) => a + b, 0) / n;
  const numerator = scores.reduce((sum, y, x) => sum + (x - xMean) * (y - yMean), 0);
  const denominator = scores.reduce((sum, _, x) => sum + (x - xMean) ** 2, 0);
  return denominator === 0 ? 0 : numerator / denominator;
}
```

### Pattern 3: Settings Model + Threshold API

**What:** Single-row settings table. GET returns current threshold; PUT validates and updates, then triggers bulk recompute.

```typescript
// [ASSUMED] — standard Prisma upsert pattern for singleton config records

// Prisma schema addition
model Settings {
  id              Int      @id @default(1)  // singleton row
  readinessThreshold Float @default(75)
  updatedAt       DateTime @updatedAt
}

// API route handler (PUT /api/settings)
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const parsed = z.object({ readinessThreshold: z.number().min(0).max(100) }).parse(body);

  await prisma.settings.upsert({
    where: { id: 1 },
    create: { id: 1, readinessThreshold: parsed.readinessThreshold },
    update: { readinessThreshold: parsed.readinessThreshold },
  });

  // Bulk recompute all associates with new threshold
  await recomputeAllReadiness(parsed.readinessThreshold);

  return NextResponse.json({ success: true });
}
```

### Pattern 4: Associate Model Extension

Add three fields to the `Associate` Prisma model from Phase 3:

```prisma
// [ASSUMED] — standard Prisma field additions; exact field names from 05-CONTEXT.md D-05
model Associate {
  // ... existing fields from Phase 3 ...
  readinessStatus   String?   // 'ready' | 'improving' | 'not_ready'
  recommendedArea   String?   // topic or skill name
  lastComputedAt    DateTime?
}
```

### Pattern 5: Bulk Recompute on Threshold Change

```typescript
// [ASSUMED] — sequential batch for MVP associate counts
async function recomputeAllReadiness(threshold: number): Promise<void> {
  const associates = await prisma.associate.findMany({ select: { id: true } });
  for (const { id } of associates) {
    const result = await computeReadiness(id, threshold);
    await prisma.associate.update({
      where: { id },
      data: {
        readinessStatus: result.status,
        recommendedArea: result.recommendedArea,
        lastComputedAt: result.lastComputedAt,
      },
    });
  }
}
```

### Anti-Patterns to Avoid

- **Recalculating on every dashboard load:** DASH-05 explicitly requires pre-computation. Phase 6 dashboard reads `associate.readinessStatus` — never calls `computeReadiness()` at read time.
- **Computing readiness before gap scores are written:** Phase 5 computation MUST run after Phase 4 writes `GapScore` rows. Always call `computeGapScores()` first, then `computeReadiness()` in the same save handler.
- **Storing threshold only in memory / env:** The threshold must be DB-persisted in the `Settings` table so the settings UI and bulk recompute work across restarts.
- **Using topic-level gap scores for the overall average:** Readiness average uses skill-level scores (`topic: null`). Topic-level scores (`topic: not null`) are only used for the recommended area derivation.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Input validation for threshold PUT | Manual typeof checks | zod `z.number().min(0).max(100)` | Already in project; handles type coercion and error messages |
| Singleton config row | Multiple settings rows with a "current" flag | `@id @default(1)` with upsert | Single row, no joins, no ambiguity |

**Key insight:** Readiness logic is 50 lines of pure math and Prisma queries. There is no problem domain here that warrants an external library.

---

## Common Pitfalls

### Pitfall 1: "Improving" Badge Definition Ambiguity

**What goes wrong:** "Improving" is defined as "3+ sessions with positive trend but below threshold." If trend is positive but score is above threshold, it should be "ready" — not "improving." The badge classification must check `avg >= threshold AND trend >= 0` for "ready" FIRST, before checking "improving."

**Why it happens:** Developers code the conditions in the wrong order or use inclusive checks.

**How to avoid:** Strict cascade: `ready` → `improving` → `not_ready`. "Improving" is the middle state: enough sessions, moving up, but not there yet.

**Warning signs:** Associates with scores above 75% showing "improving" badge — means the ready check is not executing before the improving check.

### Pitfall 2: Trend on Fewer than 3 Sessions

**What goes wrong:** `computeTrend()` is called on an associate who has exactly 2 sessions. The slope math produces a result, but the 3-session gate in `computeReadiness()` should have short-circuited before reaching trend computation.

**Why it happens:** Trend function is called independently elsewhere without the gate.

**How to avoid:** Trend computation is always guarded by the 3-session check at the top of `computeReadiness()`. Never call `computeTrend()` directly from outside `computeReadiness()`.

**Warning signs:** Associates with 1-2 sessions showing "improving" status.

### Pitfall 3: No Gap Scores = No Recommended Area

**What goes wrong:** If Phase 4 has not yet run for an associate (e.g., very first session save timing), `GapScore` rows may be empty. The `recommendedArea` query returns null. The planner must ensure Phase 4 gap computation runs BEFORE Phase 5 readiness computation in the save pipeline.

**Why it happens:** Race condition in the save pipeline — calling Phase 5 before Phase 4 commits.

**How to avoid:** Await `computeGapScores()` before calling `computeReadiness()` in the same async handler. `recommendedArea: null` is a valid state (displayed as "—" in the UI).

**Warning signs:** `recommendedArea` always null even for associates with 3+ sessions.

### Pitfall 4: Bulk Recompute Blocks HTTP Response

**What goes wrong:** Trainer submits new threshold. The settings PUT handler does a synchronous batch recompute over all associates before returning. With many associates, the request times out (Next.js route handler default 30s limit).

**Why it happens:** `recomputeAllReadiness()` is called inline in the PUT handler and awaited.

**How to avoid:** For MVP, the batch is small. Document a pragmatic limit: if associate count exceeds ~200, this needs a background task. For the solo-dev MVP, inline await is acceptable and simpler. Add a comment in code with this note.

**Warning signs:** Settings PUT returning 504 errors or timing out in production.

### Pitfall 5: Missing `overallScore` on Session Model

**What goes wrong:** Trend computation queries `session.overallScore` — a field that must be defined in the Session Prisma model. If Phase 2 stores scores only inside a JSON `assessments` column, there is no computed scalar to query for trend.

**Why it happens:** Phase 2 schema stores assessments as JSON blob; a separate `overallScore` scalar may not have been added.

**How to avoid:** Verify Phase 2 Session model includes a scalar `overallScore` field. If not, Phase 5 must compute it by aggregating the assessments JSON in application code rather than in a DB query. Document the fallback approach in the plan.

**Warning signs:** Prisma schema missing `overallScore` field on `Session` model.

---

## Code Examples

### Confirmed Algorithm from CLAUDE.md

```typescript
// Source: CLAUDE.md §Gap Tracking Algorithm [VERIFIED: CLAUDE.md]

// Readiness signal:
// 75% weighted avg + 3 sessions + non-negative trend (last 3 sessions slope >= 0)

// Recommended area:
// Next recommended area: lowest weighted score topic

// Gap scoring formula (Phase 4, referenced here for weighting context):
// score_n * 0.8^0 + score_(n-1) * 0.8^1 + ... normalized
```

### Prisma Migration Command

```bash
# [ASSUMED] — standard Prisma workflow; matches Phase 1 D-03 migration strategy
npx prisma migrate dev --name add_readiness_fields
# Adds: Associate.readinessStatus, Associate.recommendedArea, Associate.lastComputedAt
# Adds: Settings model
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| File-based JSON, no readiness concept | Prisma-backed, pre-computed readiness fields on Associate | This phase | Dashboard reads are instant; no on-load computation |
| No trainer-configurable threshold | Settings model with upsert pattern, bulk recompute on change | This phase | Trainer can adjust threshold without code deployment |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Trend is computed as a 3-point linear regression slope over recent session overall scores | Architecture Patterns — Pattern 2 | If Session model has no `overallScore` scalar, trend must be computed differently (from assessments JSON) — changes the query logic |
| A2 | `improving` badge requires `sessionCount >= 3 AND trend > 0 AND avg < threshold` | Architecture Patterns — Pattern 1 | If "improving" should also catch associates with 3+ sessions but zero trend, the condition changes |
| A3 | Bulk recompute runs synchronously in the PUT handler for MVP scale | Architecture Patterns — Pattern 5 | If associate count is large at MVP launch, this will time out |
| A4 | `Settings` table uses `@id @default(1)` singleton row pattern | Architecture Patterns — Pattern 3 | Any alternative (env var, JSON file) breaks the settings UI requirement from D-04 |
| A5 | Phase 2 Session model will have a scalar `overallScore` field | Pitfalls — Pitfall 5 | If absent, trend computation requires aggregating assessments JSON in app code |

---

## Open Questions

1. **Does the Session model from Phase 2 include a scalar `overallScore` field?**
   - What we know: Phase 2 stores assessments in a JSON column per 02-CONTEXT.md. The existing `InterviewSession` type has `overallTechnicalScore` and `overallSoftSkillScore` optionally.
   - What's unclear: Whether Phase 2 adds these as scalar DB columns or keeps them inside the JSON blob.
   - Recommendation: Planner should check 02-CONTEXT.md D-03 (Session schema) and confirm. If no scalar, plan must include a fallback: derive `overallScore` from assessments JSON in `computeTrend()` application code.

2. **Settings UI: inline on dashboard or separate `/settings` page?**
   - What we know: D-04 leaves UI location to Claude's discretion. Phase 6 builds the trainer dashboard.
   - What's unclear: Whether the settings control should live in Phase 5 (just the API + a minimal UI) or Phase 6 (full dashboard integration).
   - Recommendation: Phase 5 delivers the API route and a minimal inline settings form (can be a simple number input on the dashboard page). Phase 6 can relocate to a /settings panel if needed.

3. **Should `improving` require strictly positive trend (slope > 0) or non-negative (slope >= 0)?**
   - What we know: READY-01 specifies "non-negative trend" for the ready gate. The "improving" badge implies movement in the right direction.
   - What's unclear: Whether perfectly flat trend (slope = 0) should show "improving" or "not ready."
   - Recommendation: Use `trend > 0` for "improving" (strictly positive). Flat trend with below-threshold scores is "not ready." This matches the natural language meaning of "improving."

---

## Environment Availability

Step 2.6: SKIPPED — Phase 5 is purely TypeScript service code and Prisma schema migrations. No new external tools, services, or CLI utilities beyond what Phase 1 already established (Prisma CLI, Node.js, Supabase connection).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None installed yet — Jest 30.3.0 available from npm registry |
| Config file | None — Wave 0 must create `jest.config.ts` + `tsconfig.jest.json` |
| Quick run command | `npx jest --testPathPattern=readiness` |
| Full suite command | `npx jest` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| READY-01 | `computeReadiness()` returns "ready" when avg >= threshold AND trend >= 0 AND sessions >= 3 | unit | `npx jest --testPathPattern=readinessService` | Wave 0 |
| READY-01 | Returns "not_ready" when sessions < 3 | unit | `npx jest --testPathPattern=readinessService` | Wave 0 |
| READY-01 | Returns "not_ready" when avg < threshold AND trend < 0 | unit | `npx jest --testPathPattern=readinessService` | Wave 0 |
| READY-01 | Returns "improving" when sessions >= 3, trend > 0, avg < threshold | unit | `npx jest --testPathPattern=readinessService` | Wave 0 |
| READY-02 | `recommendedArea` is the lowest weighted gap score topic | unit | `npx jest --testPathPattern=readinessService` | Wave 0 |
| READY-02 | `recommendedArea` is null when < 3 sessions | unit | `npx jest --testPathPattern=readinessService` | Wave 0 |
| READY-03 | PUT /api/settings updates threshold and triggers bulk recompute | integration | `npx jest --testPathPattern=settings` | Wave 0 |
| READY-03 | Invalid threshold (< 0 or > 100) returns 400 | unit | `npx jest --testPathPattern=settings` | Wave 0 |

### Sampling Rate

- **Per task commit:** `npx jest --testPathPattern=readinessService --passWithNoTests`
- **Per wave merge:** `npx jest`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `jest.config.ts` — root config, transforms TypeScript, maps `@/*` path alias
- [ ] `tsconfig.jest.json` — TypeScript config for Jest (separate from Next.js tsconfig)
- [ ] `__tests__/lib/readinessService.test.ts` — covers READY-01, READY-02 (pure unit tests with Prisma mocked)
- [ ] `__tests__/api/settings.test.ts` — covers READY-03 (integration with mocked Prisma)
- [ ] Framework install: `npm install --save-dev jest @types/jest ts-jest jest-mock-extended` — if not already installed

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Existing `isAuthenticatedSession()` guard — settings PUT must be protected |
| V3 Session Management | no | No new session handling |
| V4 Access Control | yes | Settings PUT is trainer-only — use existing auth cookie check |
| V5 Input Validation | yes | zod `z.number().min(0).max(100)` on threshold value |
| V6 Cryptography | no | No new secrets or encryption |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthenticated threshold change | Tampering | `isAuthenticatedSession()` guard on PUT /api/settings — same pattern as all other protected routes |
| Threshold injection (e.g., NaN, Infinity, negative) | Tampering | zod schema validation before DB write |
| Bulk recompute triggered by unauthenticated request | Denial of Service | Auth guard on settings PUT prevents external callers from forcing a recompute loop |

---

## Sources

### Primary (HIGH confidence)

- `CLAUDE.md` §Gap Tracking Algorithm — Readiness formula (75%/3 sessions/non-negative trend), recommended area logic (lowest weighted score topic), 0.8 decay coefficient
- `CLAUDE.md` §Technology Stack — Prisma 7.7.0, @prisma/adapter-pg 7.7.0, zod 4.3.6 versions locked
- `.planning/phases/05-readiness-signals/05-CONTEXT.md` — All locked decisions (D-01 through D-05)
- `.planning/phases/04-gap-service/04-CONTEXT.md` — GapScore model fields, computation timing, session gate
- `.planning/phases/03-associate-profiles/03-CONTEXT.md` — Associate model fields available for extension
- `.planning/REQUIREMENTS.md` — READY-01, READY-02, READY-03 requirement text
- `src/lib/types.ts` — Existing TypeScript types (QuestionAssessment, InterviewSession)

### Secondary (MEDIUM confidence)

- `src/app/api/history/route.ts` — Confirmed session save POST handler is the injection point for the computation pipeline

### Tertiary (LOW confidence)

- None — all critical claims verified from project files

---

## Metadata

**Confidence breakdown:**
- Algorithm correctness: HIGH — formula specified verbatim in CLAUDE.md with no ambiguity
- Prisma schema additions: HIGH — follows established Phase 3/4 patterns, no novel patterns
- Trend computation: MEDIUM — 3-point slope formula is [ASSUMED]; `overallScore` field availability on Session model is unconfirmed until Phase 2 schema is finalized
- Settings pattern: HIGH — singleton upsert is a well-established Prisma pattern; threshold-as-DB-field is the only approach that satisfies D-04
- Bulk recompute safety: MEDIUM — synchronous batch is [ASSUMED] safe at MVP scale; no profiling done

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (stable domain — only breaks if Phase 4 schema changes)
