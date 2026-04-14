# CONVENTIONS.md — Code Style & Patterns

## TypeScript Conventions

- **Strict mode** enabled (`"strict": true` in tsconfig)
- **Path alias**: `@/*` maps to `src/*` — all imports use `@/lib/...`, `@/components/...`, `@/store/...`
- **Type exports**: Domain types in `src/lib/types.ts`, feature types in dedicated files (e.g., `src/lib/trainer-types.ts`)
- **Interface over type** for object shapes: `export interface InterviewSession { ... }`
- **Explicit return types** on service functions: `Promise<boolean>`, `Promise<ReadinessResult>`, etc.
- **Null handling**: `?? null` for optional DB fields, `?? undefined` for optional domain fields

## Component Patterns

### Server Components (Default)
Pages like `/trainer/page.tsx`, `/trainer/[slug]/page.tsx`, `/associate/[slug]/page.tsx` are server components that fetch data via `prisma` or API calls directly.

### Client Components
Marked with `'use client'` directive:
- Interactive pages: `/dashboard/page.tsx`, `/interview/page.tsx`, `/review/page.tsx`
- Components with hooks: `ClientLayout.tsx`, `auth-context.tsx`, all trainer interactive components
- Speech input: `SpeechToText.tsx`

### State Pattern
Single Zustand store (`useInterviewStore`) with `persist` middleware:
```typescript
// Pattern: get state + actions in one hook
const { session, updateAssessment, toggleKeyword } = useInterviewStore();
```

Partial persistence via `partialize` — only persists `session`, `repoConfig`, `setupPhase` to localStorage.

## API Route Patterns

### Auth Guard
Every protected route handler starts with:
```typescript
if (!(await isAuthenticatedSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Error Handling
Consistent try/catch with console.error and 500 response:
```typescript
try {
    // ... operation
} catch (error) {
    console.error('[context] Description:', error);
    return NextResponse.json({ error: 'Human-readable message' }, { status: 500 });
}
```

### Fire-and-Forget Pattern
Background operations (gap scores, readiness) use `.then().catch()` to avoid blocking the response:
```typescript
prisma.associate.findUnique(...)
    .then(async (associate) => {
        if (associate) {
            await saveGapScores(associate.id);
            await updateAssociateReadiness(associate.id, threshold);
        }
    })
    .catch((err) => console.error('[gap-service]', err));
```

### Dual-Write Pattern
Session saves write to both file storage and Supabase:
```typescript
writeHistory(trimmedHistory);                    // file (backward compat)
await persistSessionToDb(session);               // Supabase (source of truth)
```

## Service Layer Patterns

### Pure Functions vs DB Services
- **Pure**: `gapService.ts` — no DB imports, takes data in, returns data out. Testable.
- **DB Bridge**: `gapPersistence.ts` — queries DB, calls pure functions, persists results.
- **Separation**: `readinessService.ts` has both pure computation and DB persistence in one file (but computation is a separate function).

### Upsert Pattern
All DB writes use Prisma `upsert` for idempotency:
```typescript
await prisma.associate.upsert({
    where: { slug: validation.slug },
    update: { displayName: ... },
    create: { slug: ..., displayName: ... },
});
```

### Graceful Degradation
Associate upsert failures do not block session writes:
```typescript
try { /* associate upsert */ }
catch (associateErr) {
    console.error('[session-persistence] Associate upsert failed:', associateErr);
    // Continue without associate linkage
}
```

## Validation Patterns

### Zod Schemas
Used for input validation (not pervasive — targeted at critical inputs):
```typescript
// src/lib/slug-validation.ts
export const slugSchema = z.string()
    .trim().toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .min(2).max(64);
```

### DB Value Validation
Defensive validation when reading union types from DB:
```typescript
const VALID_READINESS_STATUSES = new Set(['ready', 'improving', 'not_ready']);
function validatedReadinessStatus(raw: unknown): 'ready' | 'improving' | 'not_ready' {
    return typeof raw === 'string' && VALID_READINESS_STATUSES.has(raw)
        ? (raw as ...) : 'not_ready';
}
```

## Scoring Patterns

### Score Lifecycle
Each assessment tracks status through a state machine:
`pending` → `in-progress` → `processing` → `ready` → `validated`

### Score Precedence
`finalScore` (human-validated) takes priority over `llmScore` (AI-generated):
```typescript
const score = a.finalScore ?? a.llmScore ?? 0;
```

### Score Range
- Question scores: 1-5 (LLM output, clamped)
- Gap scores: 0-100 (recency-weighted averages)
- Readiness threshold: 0-100 (default 75, configurable)

## Logging Conventions

Structured console logging with context prefixes:
```
[session-persistence] DB write failed: ...
[gap-service] Failed to update gap scores: ...
[Cleanup] Cleaned up old rate limits at ...
[/api/trainer] Failed to fetch roster: ...
```

## Comment Conventions

Reference-style comments linking to planning artifacts:
```typescript
// Phase 3: Associate upsert if slug provided
// (WR-01: eliminates TOCTOU race)
// (Codex #5: completed only, #6: sort by date)
// (DASH-05: no gap recomputation on load)
// (D-01: log-and-continue on failure)
// (T-06-01, CR-02)
```

JSDoc blocks on service functions with `@param` and `@returns`.
