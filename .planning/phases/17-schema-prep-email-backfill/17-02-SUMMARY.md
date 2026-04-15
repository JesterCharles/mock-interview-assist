---
phase: 17-schema-prep-email-backfill
plan: 02
subsystem: trainer-admin-api
tags:
  - trainer
  - api
  - csrf
  - pii
  - backfill
dependency_graph:
  requires:
    - 17-01 (Associate.email column + UNIQUE index)
  provides:
    - GET /api/trainer/associates (list)
    - GET /api/trainer/associates/preview (dry-run counts)
    - PATCH /api/trainer/associates/[id] (edit email)
    - DELETE /api/trainer/associates/[id] (orphan-only delete)
    - AssociateBackfillRow + BackfillPreview types
  affects:
    - 17-03 trainer UI (consumes these routes)
tech_stack:
  added: []
  patterns:
    - Origin/Host CSRF check reused from src/app/api/github/cache/invalidate/route.ts
    - getCallerIdentity cookie-only trainer gate
    - Zod union(literal(''), email()).nullable() for clear-or-set semantics
    - Prisma P2002/P2025 error-code mapping
key_files:
  created:
    - src/app/api/trainer/associates/route.ts
    - src/app/api/trainer/associates/route.test.ts
    - src/app/api/trainer/associates/preview/route.ts
    - src/app/api/trainer/associates/preview/route.test.ts
    - src/app/api/trainer/associates/[id]/route.ts
    - src/app/api/trainer/associates/[id]/route.test.ts
  modified:
    - src/lib/trainer-types.ts
decisions:
  - P2002 email collision returns `{ error:'email_taken', field:'email' }` with NO email echo (PII + enumeration defense)
  - DELETE re-queries _count.sessions via Prisma before removal; never trusts client counts
  - Empty string and explicit null both clear the email (trainer UI ergonomics)
  - sessionsOrphanedIfAllDeleted is structurally 0 today; kept in preview contract for future rule changes
metrics:
  duration: ~20m
  completed: 2026-04-15
  tasks: 3
  tests_added: 26
requirements:
  - BACKFILL-02
---

# Phase 17 Plan 02: Trainer Backfill API Summary

Trainer-only admin API for editing Associate.email and removing orphan slug-only rows ahead of the Phase 18 email-auth cutover. Three route files plus shared types on top of the Plan 17-01 schema.

## What Shipped

| Route | Methods | Status Codes |
| --- | --- | --- |
| `/api/trainer/associates` | GET | 200, 401, 500 |
| `/api/trainer/associates/preview` | GET | 200, 401, 500 |
| `/api/trainer/associates/[id]` | PATCH | 200, 400, 401, 403, 404, 409, 500 |
| `/api/trainer/associates/[id]` | DELETE | 200, 400, 401, 403, 404, 409, 500 |

## Origin/CSRF Guard

PATCH and DELETE call `checkOrigin(request)` before any DB work. If the `Origin` and `Host` headers are both present but their hosts differ, the route returns `403 { error: 'cross-origin' }`. The check intentionally mirrors `src/app/api/github/cache/invalidate/route.ts` so maintainers only have to keep one pattern in their head. The `nlm_session` cookie remains `SameSite=strict`; the origin check is defense-in-depth against same-site subdomain attackers and any future SameSite relaxation.

GET endpoints do not run the origin check — reading the list is idempotent and safe across origins.

## PII Handling

- Zero `console.log(row)` or `console.log(email)` patterns anywhere in the new code.
- Error logs use `(error as Error).message` only.
- The P2002 collision response is `{ error: 'email_taken', field: 'email' }` — the rejected email value is never echoed back, blocking the obvious enumeration channel.
- A dedicated test asserts the response JSON does not contain the submitted address.

## Server-Side Orphan Guard

DELETE re-queries `prisma.associate.findUnique({ where: { id }, select: { _count: { select: { sessions: true } } } })`. If `_count.sessions > 0` the route returns `409 { error: 'has_sessions', sessionCount }` and `prisma.associate.delete` is never called. This runs independently of whatever the UI shows.

## Test Coverage

| File | Cases | Focus |
| --- | --- | --- |
| `route.test.ts` (list) | 4 | auth gate, payload shape, error path |
| `preview/route.test.ts` | 4 | auth gate, count math, empty DB, error path |
| `[id]/route.test.ts` | 18 | origin, auth, Zod, empty/null clears, P2002 no echo, P2025 → 404, orphan guard, invalid id, invalid JSON, unknown errors |

Total: **26 new tests**, all passing. Typecheck clean (`npx tsc --noEmit` exit 0). Lint clean for all Plan 17-02 files (no new warnings or errors introduced).

## Commits

- `ee21604` feat(17-02): add AssociateBackfillRow + BackfillPreview types
- `6020c63` feat(17-02): trainer associates list + preview routes
- `62a36d1` feat(17-02): PATCH+DELETE /api/trainer/associates/[id]

## Deviations from Plan

None — plan executed exactly as written. Added two extra test cases beyond the plan's `<behavior>` list: explicit `null` email clear (parity with empty string) and 400 on invalid JSON body (covers the `try { await request.json() } catch` branch). These are strict supersets of the required behavior.

## Threat Register Coverage

| Threat ID | Mitigation | Test |
| --- | --- | --- |
| T-17-05 Spoofing | `getCallerIdentity().type !== 'trainer'` → 401 before DB | anonymous-401 cases on all routes |
| T-17-06 Tampering (client-supplied counts) | Server re-queries `_count.sessions` before delete | `has_sessions` 409 + `mockDelete.not.toHaveBeenCalled` |
| T-17-08 Info Disclosure (enumeration via collision) | 409 body omits email value | `JSON.stringify(body)).not.toContain(rejected)` assertion |
| T-17-09 Info Disclosure (error logs) | `(error as Error).message` only, no row data | covered by code review + lint |
| T-17-11 Elevation (cross-origin) | Origin/Host check on PATCH + DELETE | cross-origin 403 cases for both methods |
| T-17-12 Uniqueness race | DB UNIQUE constraint + P2002 → 409 | P2002 mock case |

## Self-Check: PASSED

Files:
- FOUND: src/lib/trainer-types.ts (extended)
- FOUND: src/app/api/trainer/associates/route.ts
- FOUND: src/app/api/trainer/associates/route.test.ts
- FOUND: src/app/api/trainer/associates/preview/route.ts
- FOUND: src/app/api/trainer/associates/preview/route.test.ts
- FOUND: src/app/api/trainer/associates/[id]/route.ts
- FOUND: src/app/api/trainer/associates/[id]/route.test.ts

Commits:
- FOUND: ee21604
- FOUND: 6020c63
- FOUND: 62a36d1
