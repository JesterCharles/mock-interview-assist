# Phase 39: Execution API — Discussion Log

> Audit trail only. Decisions captured in CONTEXT.md.

**Date:** 2026-04-18
**Mode:** `--auto`
**Areas:** Auth/identity, async pattern, poll shape, rate limits, verdict normalization, signal writeback, list filters, errors

---

## Auth Model

| Option | Selected |
|--------|----------|
| `getCallerIdentity()` with trainer-or-own-associate scope | ✓ (recommended) |
| Dedicated `/api/coding/*` middleware | |
| No auth (public) | Rejected — security |

## Async Pattern

| Option | Selected |
|--------|----------|
| Submit returns attemptId, client polls | ✓ (non-negotiable per codex) |
| `wait=true` synchronous | Rejected — doesn't scale |

## Hidden Test Shield

| Option | Selected |
|--------|----------|
| Poll returns only `{passed, total}` for hidden — never stdin/stdout | ✓ (security) |
| Return full results, filter client-side | Rejected — DevTools bypass |

## Rate Limit

| Option | Selected |
|--------|----------|
| Per-user hourly + daily via `rateLimitService.ts` | ✓ (reuses pattern) |
| Per-IP only | Weaker signal |
| No limit | Abuse risk |

## Verdict Normalization

| Option | Selected |
|--------|----------|
| Central `normalizeJudge0Verdict()` pure fn, canonical enum | ✓ (recommended) |
| Pass Judge0 status through raw | UI has to know Judge0 internals |

## Signal Writeback

| Option | Selected |
|--------|----------|
| Fire-and-forget from poll handler on verdict resolve | ✓ (recommended) |
| Synchronous in submit response | Slower UX |
| Background cron job | More moving parts |

## List Pagination

| Option | Selected |
|--------|----------|
| Cursor-based, default 20/max 100 | ✓ (recommended) |
| Offset-based | Fragile with writes |
| Unbounded | Rejected |

## Claude's Discretion

- Judge0 `/submissions/batch` vs sequential — batch recommended
- Error logging destination
