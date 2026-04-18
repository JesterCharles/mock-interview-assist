# Phase 44 Deferred Items

Pre-existing issues NOT caused by Phase 44 work. Logged per deviation-rule scope boundary.

## TypeScript errors in `src/lib/coding-challenge-service.test.ts`

- Lines 240-241: `Conversion of type 'undefined' to type 'string'` and `Tuple type '[]' of length '0' has no element at index '0'/'1'`.
- Origin: shipped in Phase 37 (pre-v1.4 test code).
- Scope: does not block runtime (tests still pass via Vitest's transpile path); TypeScript strict-mode compile surfaces it.
- Action: route to Phase-37 maintenance follow-up.

