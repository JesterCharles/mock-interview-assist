# TESTING.md — Test Structure & Practices

## Framework

| Tool | Version | Purpose |
|------|---------|---------|
| Vitest | ^4.1.4 | Test runner |
| @vitest/coverage-v8 | ^4.1.4 | Code coverage |

**Config**: `vitest.config.ts`
- Environment: `node`
- Globals: `true` (no need to import describe/it/expect)
- Path alias: `@` → `./src`
- `passWithNoTests: true`
- Excludes: `node_modules`, `.next`

## Commands

```bash
npm run test        # Run all tests once
npm run test:watch  # Run in watch mode
```

## Test Location

All tests in `src/lib/__tests__/`:

| File | Lines | Tests | What it covers |
|------|-------|-------|----------------|
| `gapService.test.ts` | 562 | ~30+ | recencyWeightedAverage, extractScore, extractSkillTopicScores, computeGapScores |
| `readinessService.test.ts` | 312 | ~15+ | computeTrend, readiness classification cascade |
| `adaptiveSetup.test.ts` | 71 | ~8 | mapGapScoresToWeights edge cases |

## Test Patterns

### Helper Factories
Tests use factory functions to create test data:
```typescript
function makeAssessment(overrides: Partial<QuestionAssessment> = {}): QuestionAssessment {
    return {
        questionId: 'q1',
        keywordsHit: [],
        keywordsMissed: [],
        softSkills: { clearlySpoken: false, eyeContact: false, confidence: false, structuredThinking: false },
        interviewerNotes: '',
        didNotGetTo: false,
        status: 'validated',
        ...overrides,
    };
}
```

Similar factories exist for `makeQuestion()` and `makeSession()`.

### Pure Function Testing
The gap scoring and readiness services are structured for testability:
- `gapService.ts` — pure functions, no DB imports. Takes data in, returns data out.
- `readinessService.ts` — `computeTrend()` has an overload that accepts pre-fetched session data (no DB call).
- `adaptiveSetup.ts` — pure mapping function, no side effects.

### Test Organization
Tests use `describe` blocks grouped by function:
```typescript
describe('recencyWeightedAverage', () => {
    it('returns 0 for empty array', ...);
    it('returns the single score for one element', ...);
    it('applies 0.8 decay factor', ...);
});
```

### Edge Case Coverage
Tests cover:
- Empty inputs
- Single-element inputs
- Score validation (out-of-range filtering)
- Skipped questions (`didNotGetTo: true`)
- Missing techMap
- All-equal scores (division-by-zero protection)
- Classification cascade ordering (ready vs improving vs not_ready)

## What Is NOT Tested

- **API route handlers** — no integration tests for `/api/score`, `/api/history`, etc.
- **React components** — no component tests (no React Testing Library or similar)
- **Zustand store** — no store tests
- **LLM scoring** — no tests for prompt/response parsing
- **File I/O** — no tests for historyService, rateLimitService, cleanupService
- **E2E flows** — no Playwright or Cypress tests
- **Prisma queries** — no database integration tests

## Coverage

Coverage tool configured (`@vitest/coverage-v8`) but no threshold enforced.
Current test coverage focuses exclusively on the Readiness Loop MVP's algorithmic core:
gap scoring, readiness classification, and adaptive setup weight mapping.

## Mocking

No mock infrastructure currently needed — tested services are pure functions with no dependencies to mock.
The `readinessService.test.ts` tests `computeTrend()` using the synchronous overload (accepts data array) to avoid DB mocking.
