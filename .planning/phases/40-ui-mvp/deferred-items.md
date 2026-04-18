# Phase 40 Deferred Items

Pre-existing issues discovered during Phase 40 execution. Not caused by Phase 40 changes — intentionally left untouched per deviation-rule SCOPE BOUNDARY.

## Pre-existing TypeScript errors (out of scope)

- `src/lib/__tests__/gapPersistence.coding.test.ts:98` — missing export `persistCodingSignalToGapScore`
- `src/lib/__tests__/gapPersistence.coding.test.ts:221` — unused `@ts-expect-error`
- `src/lib/coding-challenge-service.test.ts:240-241` — tuple/undefined narrowing errors

These existed before Phase 40. They will surface when we run `npx tsc --noEmit` but Phase 40 does not introduce new TS errors.

## Security audit note

- `@monaco-editor/react@latest` pulled in 7 moderate-severity advisories via transitive deps per `npm audit`. Standard Monaco tree — accepted as-is for MVP. Revisit in Phase 44 (hardening).
