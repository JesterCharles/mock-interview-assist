# Phase 7: Adaptive Setup - Research

**Researched:** 2026-04-13
**Domain:** Setup wizard pre-population from gap score data; Zustand store mutation; Next.js API route; UI state indicators
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** When trainer enters an associate slug in setup wizard (Phase 3 addition), fetch that associate's gap scores. Pre-select technologies where the associate has been tested. Set weights inversely proportional to gap scores (weaker areas get higher weight = more questions).
- **D-02:** Gap score → weight mapping: lowest gap score skill gets weight 5, highest gets weight 1. Linear interpolation between. This ensures weak areas get more practice questions.
- **D-03:** All pre-selected technologies and weights are editable. Trainer can add/remove techs and adjust any weight. Pre-population is a suggestion, not a lock. Existing manual controls remain fully functional.
- **D-04:** Associates with < 3 sessions (no gap data) → setup wizard works exactly as it does today (full manual mode). No error, no placeholder — just normal setup flow.
- **D-05:** Pre-population triggers after slug input loses focus (onBlur) or on explicit "Load history" action. Brief loading state while fetching gap scores. If slug not found, treat as new associate (manual mode).

### Claude's Discretion

- Exact UI for indicating pre-populated vs manually-set weights
- Animation/transition when pre-population fills in
- Whether to show a summary of gap scores alongside the selections

### Deferred Ideas (OUT OF SCOPE)

- Difficulty-level adaptation (not just tech/weight but also beginner/intermediate/advanced distribution)
- Suggested question count based on gap severity
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GAP-05 | Adaptive mock setup pre-selects technologies/weights based on gap history; trainer can override | API endpoint to fetch GapScore by slug → linear interpolation of weights → Zustand store pre-population via `setSelectedTechs` + `setTechWeight` — all patterns verified in codebase |
</phase_requirements>

---

## Summary

Phase 7 is an integration phase: it wires existing infrastructure (GapScore table from Phase 4, slug field from Phase 3, Zustand tech selection actions) into a cohesive onBlur-triggered pre-population flow. There is no new algorithmic work and no new data model — everything this phase needs will exist by the time Phase 6 completes.

The core work is: (1) a new API endpoint `GET /api/associates/[slug]/gap-scores` that returns GapScore records for a slug, (2) a weight-mapping utility that converts gap scores to the 1–5 integer scale using linear interpolation, and (3) a React hook or inline effect in `dashboard/page.tsx` that calls the API on slug blur and dispatches the results into the Zustand store via `setSelectedTechs` + `setTechWeight`.

The UI challenge is in Claude's Discretion territory: visually distinguishing pre-populated weights from trainer-adjusted weights without glass morphism, glow effects, or decorative animation (DESIGN.md prohibits all of those). The correct solution per the design system is a small typographic badge ("auto") that disappears on edit — minimal, comprehension-aiding, consistent with editorial/utilitarian aesthetic.

**Primary recommendation:** Implement as a focused addition to `renderPhase1()` in `dashboard/page.tsx`. The slug field lives in Phase 3 of the wizard (per 03-CONTEXT.md D-02) but adaptive pre-population affects Phase 1 (tech selection). Trigger the fetch on slug change (stored in Zustand or local state from Phase 3), and apply results to Phase 1 state before the trainer reaches that step.

---

## Standard Stack

### Core (all already in project — no new installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zustand | 5.0.9 | Store pre-populated tech selection + weights | Already the state layer; `setSelectedTechs` + `setTechWeight` actions exist |
| Next.js App Router | 16.1.1 | New API route for gap score lookup | Established pattern for all data API routes in project |
| TypeScript | 5 | Weight interpolation utility typing | Already standard across codebase |
| zod | (install per CLAUDE.md) | Validate slug query param in API route | CLAUDE.md §Validation mandates zod for API payloads |

[VERIFIED: package.json — no new runtime dependencies required beyond zod which CLAUDE.md already specifies as a mandatory install]

### No New Dependencies

This phase requires no new npm packages. All necessary libraries are either already installed or being added in prior phases (Prisma, @prisma/client from Phase 1).

---

## Architecture Patterns

### Recommended Project Structure

No new directories. Files added to existing locations:

```
src/
├── app/
│   ├── api/
│   │   └── associates/
│   │       └── [slug]/
│   │           └── gap-scores/
│   │               └── route.ts        # New: GET gap scores for slug
│   └── dashboard/
│       └── page.tsx                    # Modified: add pre-population logic
└── lib/
    └── adaptiveSetup.ts                # New: weight interpolation utility
```

### Pattern 1: Gap Score API Route

**What:** A GET route at `/api/associates/[slug]/gap-scores` that queries the GapScore table (built in Phase 4) via Prisma and returns skill-level scores for the associate.

**When to use:** Called client-side from the dashboard wizard on slug blur.

**Key shape returned:**

```typescript
// Source: GapScore model as specified in 04-CONTEXT.md D-06
interface GapScoreResponse {
  found: boolean;           // false = new associate, fall back to manual
  sessionCount: number;     // < 3 = not enough data, fall back to manual
  scores: Array<{
    skill: string;          // matches tech file path (e.g. "react.md")
    weightedScore: number;  // 0.0 – 1.0 range (Phase 4 output)
  }>;
}
```

[ASSUMED] The exact GapScore Prisma model fields will be as specified in 04-CONTEXT.md D-06: `(associateId, skill, topic, weightedScore, sessionCount, lastUpdated)`. Phase 4 is not yet executed, so field names are from the decision document, not runtime schema.

**API route pattern (follows existing project convention):**

```typescript
// Source: existing pattern from src/app/api/history/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticatedSession } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  if (!(await isAuthenticatedSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // zod validate slug format
  // query Associate by slug → get GapScore records (skill-level only, topic: null)
  // return GapScoreResponse
}
```

[VERIFIED: src/lib/auth-server.ts pattern used in every existing authenticated route]

### Pattern 2: Linear Weight Interpolation

**What:** A pure utility function mapping gap scores to integer weights 1–5. Lowest gap score (weakest skill) → weight 5. Highest gap score (strongest skill) → weight 1. Linear interpolation between.

**Why a utility:** Pure function with no side effects — independently testable without any React or Zustand involvement. Clean separation.

```typescript
// Source: D-02 from 07-CONTEXT.md — locked decision
// weightedScore range: 0.0 (weakest) to 1.0 (strongest)
function gapScoreToWeight(
  score: number,
  minScore: number,
  maxScore: number
): 1 | 2 | 3 | 4 | 5 {
  if (maxScore === minScore) return 3; // all skills equal — neutral weight
  const normalized = (score - minScore) / (maxScore - minScore); // 0=weakest, 1=strongest
  const weight = 5 - Math.round(normalized * 4); // invert: weak=5, strong=1
  return Math.max(1, Math.min(5, weight)) as 1 | 2 | 3 | 4 | 5;
}
```

**Edge cases to handle:**
- Single skill: `maxScore === minScore` → all equal weight (use 3 as neutral, or respect trainer preference)
- All perfect scores: still distribute relative weights — weak/strong is relative
- Skills with `weightedScore === 0`: weight 5 (most practice needed)

### Pattern 3: Zustand Pre-Population

**What:** Call `setSelectedTechs` and `setTechWeight` from the dashboard page after receiving gap scores from the API. These actions already exist in `interviewStore.ts`.

**Key implementation detail:** `setSelectedTechs` takes `GitHubFile[]` objects (with `path` and other GitHub metadata). The available techs list (`availableTechs` state) is fetched from GitHub. Pre-population must cross-reference gap score `skill` values against `availableTechs` to find the matching `GitHubFile` — the skill stored in GapScore must map to the `tech.path` field.

[VERIFIED: src/store/interviewStore.ts — `setSelectedTechs: (techs: GitHubFile[]) => void` and `setTechWeight: (techPath: string, weight: number) => void` both exist]
[VERIFIED: src/app/dashboard/page.tsx — `availableTechs` is populated from GitHub, `selectedTechs` uses `tech.path` as the identifier]

**Timing dependency:** The `availableTechs` list must be loaded before pre-population runs. The `fetchTechs()` call runs on mount — pre-population should run *after* `availableTechs` is populated, not before.

### Pattern 4: Pre-Populated State Indicator (Claude's Discretion)

**What:** Visual signal distinguishing auto-populated weights from trainer-adjusted weights.

**DESIGN.md constraints:** No glass morphism, no glow, no decorative animation. Use "slide-up (200ms ease-out) for page transitions, fade-in (150ms ease-out) for async content loading." Typographic/badge approach preferred over icon-heavy decoration.

**Recommended approach:** Track which tech paths were pre-populated via a local state `Set<string>` (`prePopulatedPaths`). On any `setTechWeight` call for a pre-populated tech, remove it from `prePopulatedPaths` (trainer has overridden it). Render a small `"auto"` label (12px DM Sans 500, `--muted` color) next to the weight display only when the path is still in `prePopulatedPaths`.

```typescript
// Local state alongside existing component state
const [prePopulatedPaths, setPrePopulatedPaths] = useState<Set<string>>(new Set());

// When trainer manually adjusts weight, clear the "auto" badge for that tech
const handleWeightChange = (path: string, weight: number) => {
  setTechWeight(path, weight);
  setPrePopulatedPaths(prev => {
    const next = new Set(prev);
    next.delete(path);
    return next;
  });
};
```

This is purely local component state — no Zustand changes needed. The `prePopulatedPaths` set is ephemerally derived from the last gap fetch; it has no persistence value.

### Pattern 5: Slug-to-Pre-Population Coordination

**What:** The slug field is in wizard Phase 3 (per 03-CONTEXT.md D-02). Tech selection is in wizard Phase 1. The trainer enters their slug while in Phase 3 (candidate details), but the tech selections are in Phase 1 (already visited). This creates a sequencing question.

**Resolution:** The trainer starts at Phase 1. They configure techs manually. If they have a slug ready, they can pre-populate at Phase 2 (candidate info) — the onBlur trigger on the slug field fires, and when the trainer navigates back to Phase 1 (or on the next setup), they see the pre-populated selections. Alternatively, the slug field could be moved to Phase 1 or made accessible from Phase 1 as a quick-populate input.

[ASSUMED] The simplest implementation that honors D-05 (onBlur trigger) is to place a slug lookup field at the top of Phase 1 (tech selection step) as an optional "Load associate history" section. This is a minor UI re-arrangement that keeps the adaptive flow front-and-center at the moment the trainer is choosing techs. The Phase 3 slug field (for session attribution to the Associate record) remains unchanged.

**Key implication for planner:** Two separate slug inputs may exist:
1. Phase 1 "Load history" slug — drives adaptive pre-population, local to setup wizard, does NOT need to be stored in Zustand
2. Phase 3 "Candidate identifier" slug — saved with the session for associate profile linkage (PERSIST-02)

These serve different purposes but should read from the same value to avoid requiring the trainer to type it twice. Store the slug in Zustand or share via local state lifted to the parent.

### Anti-Patterns to Avoid

- **Fetching gap scores on every render:** Gate behind onBlur or explicit button click (D-05). Network calls on re-renders will cause flicker and wasted requests.
- **Overwriting a trainer's manual adjustment on re-fetch:** Once a trainer has changed a weight, subsequent fetches should not reset it. Track the `prePopulatedPaths` set and only update values that are still in that set.
- **Calling `setSelectedTechs([])` before `availableTechs` is loaded:** If GitHub tech list hasn't loaded yet, the `GitHubFile` objects don't exist to cross-reference. Add a guard: only run pre-population after `isFetchingTechs === false && availableTechs.length > 0`.
- **Using glass morphism or glow for the "auto" badge:** DESIGN.md explicitly prohibits these. Small typographic label is correct.
- **Blocking wizard advance during gap score fetch:** Loading state should be inline/non-blocking. Trainer can still manually configure while the fetch is in flight.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Linear interpolation | Custom math | Simple inline formula (3 lines) | Problem is trivially small; no library needed |
| Gap score → tech path matching | Fuzzy string matching | Exact path match from `availableTechs` | Gap scores store the same `tech.path` string used as key in `techWeights` — exact match is correct |
| Loading state | Custom spinner component | Existing Loader2 from lucide-react (already used in dashboard) | Already in codebase, consistent UI |
| Auth guard | New auth logic | Existing `isAuthenticatedSession()` from `src/lib/auth-server.ts` | Pattern established across all authenticated routes |

**Key insight:** This phase is almost entirely wiring. The only custom logic is the weight interpolation formula (3 lines) and the "auto" badge tracking (a Set in local state). Everything else is calling existing APIs and actions.

---

## Common Pitfalls

### Pitfall 1: Tech Path Mismatch Between GapScore.skill and GitHubFile.path

**What goes wrong:** Phase 4 stores `skill` in `GapScore` derived from the question bank file path. Phase 7 must match `GapScore.skill` against `GitHubFile.path` from the available techs list. If Phase 4 stores a normalized/shortened skill name (e.g., `"react"`) but `GitHubFile.path` is `"react/question-bank-v1.md"`, the match fails silently and no techs get pre-populated.

**Why it happens:** Phase 4 (not yet executed) defines how `skill` is stored. If it derives skill from the filename without preserving the full path, the keys won't match.

**How to avoid:** In the Phase 4 gap computation, store `skill` as the full `tech.path` value (identical to what `techWeights` uses as its key). Verify this contract during Phase 4 implementation. If already diverged, add a normalization step in the gap score API response.

**Warning signs:** Pre-population fetch returns scores but `availableTechs.find(t => t.path === score.skill)` returns undefined for all results.

### Pitfall 2: Pre-Population Fires Before availableTechs Loads

**What goes wrong:** Trainer opens wizard and immediately triggers the slug lookup (e.g., if slug is pre-filled). The `availableTechs` fetch is async. Pre-population tries to map gap scores to GitHubFile objects but `availableTechs` is still `[]`. No techs get selected.

**Why it happens:** `fetchTechs()` is async (GitHub API call). It doesn't resolve instantly.

**How to avoid:** In the gap fetch handler, check `availableTechs.length > 0` before running pre-population. If available techs aren't loaded yet, wait — run pre-population in a `useEffect` that depends on both `availableTechs` and the fetched gap scores.

**Warning signs:** Pre-population appears to silently do nothing on first load but works if triggered again.

### Pitfall 3: Double-Entry of Slug

**What goes wrong:** Trainer enters slug twice — once in the "Load history" section at Phase 1, and again in the Phase 3 candidate details. Inconsistency causes the wrong associate to be linked to the session.

**Why it happens:** Two separate slug inputs with no shared state.

**How to avoid:** Lift slug into Zustand (add `associateSlug` to store, matching Phase 3 decision). Both inputs read/write the same Zustand field. Pre-population and session attribution use the same value.

**Warning signs:** Session gets saved under a different associate than the one whose gap history was loaded.

### Pitfall 4: Trainer Adjustment Lost on Navigation

**What goes wrong:** Trainer pre-populates, adjusts weights in Phase 1, navigates to Phase 2, then back to Phase 1 — weights reset to pre-populated values because local state was re-initialized.

**Why it happens:** `prePopulatedPaths` is local state. Weights in Zustand are correct, but the "auto" badge tracking resets on re-render if local state is re-initialized.

**How to avoid:** This is only a display issue (the `prePopulatedPaths` Set is for badge rendering, not for weight values). Weights live in Zustand and persist navigation. The `prePopulatedPaths` Set can reset — the trainer just won't see the "auto" badge on already-adjusted weights after navigation, which is correct behavior.

---

## Code Examples

### Weight Interpolation Utility

```typescript
// Source: D-02 from 07-CONTEXT.md (linear interpolation, lowest gap = weight 5)
// File: src/lib/adaptiveSetup.ts

export interface SkillGapScore {
  skill: string;       // tech file path, e.g. "react/question-bank-v1.md"
  weightedScore: number; // 0.0 (weakest) – 1.0 (strongest)
}

export function mapGapScoresToWeights(
  scores: SkillGapScore[]
): Record<string, 1 | 2 | 3 | 4 | 5> {
  if (scores.length === 0) return {};

  const minScore = Math.min(...scores.map(s => s.weightedScore));
  const maxScore = Math.max(...scores.map(s => s.weightedScore));
  const range = maxScore - minScore;

  const result: Record<string, 1 | 2 | 3 | 4 | 5> = {};
  for (const { skill, weightedScore } of scores) {
    if (range === 0) {
      result[skill] = 3; // all equal — neutral weight
    } else {
      const normalized = (weightedScore - minScore) / range; // 0=weakest, 1=strongest
      const raw = 5 - Math.round(normalized * 4); // invert: weak→5, strong→1
      result[skill] = Math.max(1, Math.min(5, raw)) as 1 | 2 | 3 | 4 | 5;
    }
  }
  return result;
}
```

### Pre-Population Hook Pattern in Dashboard

```typescript
// Source: adapted from existing dashboard page patterns
// Called inside dashboard/page.tsx renderPhase1 or as a useCallback

const handleSlugLookup = useCallback(async (slug: string) => {
  if (!slug.trim()) return;
  setIsLoadingGapScores(true);
  try {
    const res = await fetch(`/api/associates/${encodeURIComponent(slug)}/gap-scores`);
    if (!res.ok) {
      // 404 = new associate → fall through to manual mode (D-04)
      return;
    }
    const data: GapScoreResponse = await res.json();

    if (!data.found || data.sessionCount < 3) {
      // Cold start fallback (D-04) — do nothing, let manual flow proceed
      return;
    }

    // Wait for available techs to be ready
    if (availableTechs.length === 0) {
      // Defer — will re-trigger via useEffect when availableTechs loads
      setPendingGapScores(data.scores);
      return;
    }

    applyGapScores(data.scores);
  } finally {
    setIsLoadingGapScores(false);
  }
}, [availableTechs]);

const applyGapScores = (scores: SkillGapScore[]) => {
  const weights = mapGapScoresToWeights(scores);
  const matchedTechs = availableTechs.filter(t => weights[t.path] !== undefined);
  setSelectedTechs(matchedTechs);
  matchedTechs.forEach(t => setTechWeight(t.path, weights[t.path]));
  setPrePopulatedPaths(new Set(matchedTechs.map(t => t.path)));
};
```

### API Route Skeleton

```typescript
// Source: follows pattern in src/app/api/history/route.ts
// File: src/app/api/associates/[slug]/gap-scores/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticatedSession } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const slugSchema = z.string().regex(/^[a-z0-9-]+$/);

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  if (!(await isAuthenticatedSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = slugSchema.safeParse(params.slug);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid slug' }, { status: 400 });
  }

  const associate = await prisma.associate.findUnique({
    where: { slug: parsed.data },
    include: {
      gapScores: {
        where: { topic: null }, // skill-level only
      },
    },
  });

  if (!associate) {
    return NextResponse.json({ found: false, sessionCount: 0, scores: [] });
  }

  const sessionCount = await prisma.session.count({
    where: { associateId: associate.id, status: 'completed' },
  });

  return NextResponse.json({
    found: true,
    sessionCount,
    scores: associate.gapScores.map(g => ({
      skill: g.skill,
      weightedScore: g.weightedScore,
    })),
  });
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Static manual setup every time | Gap-informed pre-selection | Phase 7 (this phase) | Trainer saves configuration time; weak skills get higher question weight automatically |
| Trainer must remember associate's weak areas | System surfaces them visually via pre-population | Phase 7 | Reduces trainer cognitive load; ensures systematic coverage of gaps |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | GapScore Prisma model stores `skill` as full `tech.path` string (e.g., `"react/question-bank-v1.md"`) identical to `techWeights` key | Pitfall 1, Code Examples | Pre-population silently fails — no techs selected. Fix: normalization layer in API response. |
| A2 | Slug lookup field added to Phase 1 (tech selection) rather than Phase 3 (candidate details), to show pre-population at the right moment | Architecture Pattern 5 | Trainer enters slug too late (Phase 3) to see pre-populated techs. Fix: move or duplicate slug input to Phase 1. |
| A3 | Phase 4 GapScore table is queryable via `prisma.associate.findUnique` with relation to gapScores | Code Examples — API Route | API route needs different query if Phase 4 schema differs. Risk is LOW — 04-CONTEXT.md D-06 is explicit about schema. |
| A4 | `associateSlug` field added to Zustand store in Phase 3 (03-CONTEXT.md delegates this to Claude's Discretion) | Pattern 5 (shared slug state) | Two separate slug inputs with no shared state → double-entry problem. Fix: ensure Phase 3 adds slug to Zustand. |

---

## Open Questions

1. **Where exactly does the slug field live in the wizard?**
   - What we know: Phase 3 adds slug to wizard Phase 3 (candidate details step, per 03-CONTEXT.md D-02). Adaptive pre-population affects Phase 1 (tech selection).
   - What's unclear: Does the trainer need to type the slug before reaching Phase 1, or is a "Load history" affordance added to Phase 1 independently?
   - Recommendation: Add a compact "Load associate history" input at the top of Phase 1 that reads/writes the same `associateSlug` Zustand field. This is within Claude's Discretion and avoids forcing trainer to navigate backward.

2. **How does GapScore.skill map to GitHubFile.path?**
   - What we know: Phase 4 derives skill from question bank file paths. `techWeights` uses `tech.path` as key.
   - What's unclear: Phase 4 is not yet executed — final field format is from context docs only.
   - Recommendation: In the Phase 4 plan, explicitly require that `GapScore.skill` stores the full path value matching `GitHubFile.path`. Document this as a cross-phase contract.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 7 is purely a code/UI change over existing infrastructure. No new external services, CLIs, or runtimes are required. All dependencies (Prisma, Next.js API routes, Zustand) are already present or being installed in earlier phases.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — no jest.config, no vitest.config, no test scripts in package.json |
| Config file | None — Wave 0 must install |
| Quick run command | `npx jest --testPathPattern=adaptiveSetup --no-coverage` |
| Full suite command | `npx jest --no-coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GAP-05 | `mapGapScoresToWeights` returns weight 5 for lowest score, weight 1 for highest | unit | `npx jest --testPathPattern=adaptiveSetup -t "weight mapping"` | Wave 0 |
| GAP-05 | `mapGapScoresToWeights` handles single skill (all equal) → weight 3 | unit | `npx jest --testPathPattern=adaptiveSetup -t "single skill"` | Wave 0 |
| GAP-05 | `mapGapScoresToWeights` handles all-zero scores → all weight 3 | unit | `npx jest --testPathPattern=adaptiveSetup -t "all zero"` | Wave 0 |
| GAP-05 | API route returns `found: false` for unknown slug | unit/integration | `npx jest --testPathPattern=gap-scores.route -t "unknown slug"` | Wave 0 |
| GAP-05 | API route returns `found: true, sessionCount < 3` for cold-start associate | unit/integration | `npx jest --testPathPattern=gap-scores.route -t "cold start"` | Wave 0 |
| GAP-05 | Pre-population does not fire for < 3 sessions (cold start fallback) | unit | `npx jest --testPathPattern=adaptiveSetup -t "cold start fallback"` | Wave 0 |
| GAP-05 | Trainer weight change removes tech from prePopulatedPaths set | unit | `npx jest --testPathPattern=adaptiveSetup -t "trainer override"` | Wave 0 |

### Sampling Rate

- **Per task commit:** `npx jest --testPathPattern=adaptiveSetup --no-coverage`
- **Per wave merge:** `npx jest --no-coverage`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `jest.config.ts` — no test runner configured; install `jest`, `@types/jest`, `ts-jest`
- [ ] `src/lib/__tests__/adaptiveSetup.test.ts` — unit tests for `mapGapScoresToWeights`
- [ ] `src/app/api/associates/[slug]/gap-scores/__tests__/route.test.ts` — API route unit tests with mocked Prisma

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Existing `isAuthenticatedSession()` — same guard used on all authenticated routes |
| V3 Session Management | no | No new session tokens or cookies introduced |
| V4 Access Control | yes | Gap scores are trainer-only; route protected behind auth. No associate-facing gap score exposure. |
| V5 Input Validation | yes | Slug validated with zod regex `^[a-z0-9-]+$` before Prisma query |
| V6 Cryptography | no | No new crypto operations |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Slug injection (path param to Prisma query) | Tampering | zod schema validation on slug param before DB query; Prisma parameterizes all queries |
| Unauthorized gap score access | Information Disclosure | `isAuthenticatedSession()` guard at route entry; associates cannot call this route without trainer cookie |
| Slug enumeration (probe to discover associate slugs) | Information Disclosure | Route returns `{ found: false }` for unknown slugs — same response as new associate. Rate limiting already in place at app level. |

---

## Sources

### Primary (HIGH confidence)
- `src/store/interviewStore.ts` — `setSelectedTechs`, `setTechWeight`, `techWeights`, `selectedTechs` actions verified
- `src/app/dashboard/page.tsx` — Setup wizard phases, tech selection UI, `availableTechs` state, `isFetchingTechs` state verified
- `src/lib/types.ts` — `InterviewSession`, `ParsedQuestion`, `GitHubFile` type shapes verified
- `src/app/api/history/route.ts` — API route auth guard pattern verified
- `package.json` — dependency list, no test runner installed confirmed
- `DESIGN.md` — animation rules, anti-pattern list, typography scale verified
- `.planning/phases/03-associate-profiles/03-CONTEXT.md` — slug input location and Associate model spec
- `.planning/phases/04-gap-service/04-CONTEXT.md` — GapScore model, skill/topic schema, computation timing
- `.planning/phases/07-adaptive-setup/07-CONTEXT.md` — all locked decisions (D-01 through D-05)

### Secondary (MEDIUM confidence)
- `.planning/REQUIREMENTS.md` — GAP-05 requirement text
- `CLAUDE.md` §Technology Stack — zod mandate for API validation, no new ORM dependencies

### Tertiary (LOW confidence — assumptions flagged)
- A1–A4 in Assumptions Log: inferences about Phase 4 output format and Phase 3 Zustand decisions not yet implemented

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies verified in package.json; no new installs required
- Architecture: HIGH for API route and Zustand wiring; MEDIUM for slug input placement (Claude's Discretion area)
- Weight interpolation logic: HIGH — formula is 3 lines, fully specified in D-02
- Pitfalls: HIGH — all grounded in concrete code analysis of existing files
- Phase 4 schema contract: MEDIUM — derived from context docs, not runtime schema

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (stable stack, no fast-moving dependencies)
