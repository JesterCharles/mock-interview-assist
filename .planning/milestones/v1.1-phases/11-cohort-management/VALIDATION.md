---
phase: 11-cohort-management
auditor: nyquist
audited: 2026-04-14
status: green-with-manual-residual
plans: [11-01, 11-02, 11-03]
requirements: [COHORT-01, COHORT-02]
---

# Phase 11 Validation Audit

Retroactive Nyquist audit of the `11-cohort-management` phase. Each plan's
`<must_haves>` / `<verification>` block was checked against committed code
and tests; gaps without automated coverage were filled where the project's
test conventions allow (vitest node env + `vi.mock`, no React DOM runtime).

## Coverage Summary

| Plan | Truths | Auto-covered | Gaps Filled | Residual (manual) |
|------|--------|--------------|-------------|-------------------|
| 11-01 | 6 | 6 | 0 | 0 |
| 11-02 | 6 | 3 (2 new) | 2 | 4 (browser CRUD flow) |
| 11-03 | 5 | 4 | 0 | 1 (dropdown + reload persistence) |

Total automated tests in phase: **40 passing** across 5 files
(`src/app/api/cohorts/route.test.ts` — 9, `src/app/api/cohorts/[id]/route.test.ts` — 16,
`src/app/api/trainer/[slug]/route.test.ts` — 11, and **2 new files** with 4 tests).

---

## Plan 11-01 — Cohort CRUD API

All six truths already fully tested in `route.test.ts` files (25 cases). No gaps.

| Truth | Test |
|-------|------|
| POST creates + returns record | `returns 201 and CohortDTO on valid create` |
| GET list ordered by startDate desc | `returns CohortDTO[] ... ordered by startDate desc` |
| PATCH edits cohort | `partial update with name only returns 200 ...` |
| DELETE non-cascading | `runs $transaction that updates associates then deletes cohort, returns 204` |
| 401 on unauthenticated | Auth-guard blocks across both route files |
| 400 on invalid zod payloads | name empty, endDate < startDate, description > 500, non-numeric id |

Verification commands:
- `npm run test -- src/app/api/cohorts`

---

## Plan 11-02 — Cohort Management UI

### Truths coverage after audit

| Truth | Status | Verified By |
|-------|--------|-------------|
| Nav link `/trainer` → `/trainer/cohorts` | **green** (new) | `src/app/trainer/nav-link.test.ts` |
| Table of cohorts with name, dates, count, actions | manual | Plan 11-02 checkpoint (visual) |
| Create via inline form — no reload | manual | Plan 11-02 checkpoint |
| Edit via same inline form pre-filled | manual | Plan 11-02 checkpoint |
| Delete after window.confirm, non-cascading | manual + API-level | API `DELETE` tx test (11-01) + checkpoint |
| Form validation errors inline | manual | Plan 11-02 checkpoint |
| **Added:** Server page auth + data seed | **green** (new) | `src/app/trainer/cohorts/page.test.tsx` |

### Gaps Filled

1. **Nav link regression** — `src/app/trainer/nav-link.test.ts`
   Verifies `page.tsx` imports `next/link`, renders `<Link href="/trainer/cohorts">`,
   and exposes a visible "Cohorts" label. Prevents silent removal during refactors.

2. **Server component shell** — `src/app/trainer/cohorts/page.test.tsx`
   Three behavioral tests, all green:
   - Unauthenticated request → `redirect('/login')`, no Prisma call.
   - Authenticated request → `prisma.cohort.findMany` invoked with
     `orderBy.startDate = 'desc'` + `include._count.associates`.
   - Rows serialized into `CohortDTO[]` with ISO-string dates, nullable `endDate`,
     nullable `description`, and `associateCount` attached — verified via the
     props passed to the mocked `CohortsClient`.

### Residual Manual Coverage

`CohortsClient.tsx` is a client component wired with `useState`/`fetch`, and the
project has no DOM runtime (`@testing-library`, `jsdom`, `happy-dom`) installed.
Adding one exceeds the audit scope. The four interaction truths
(table render, create/edit/delete flows, inline errors) remain validated by the
`checkpoint:human-verify` step in `11-02-PLAN.md` Task 3 — unchanged from
original plan intent.

---

## Plan 11-03 — Associate Cohort Assignment

### Truths coverage

| Truth | Status | Verified By |
|-------|--------|-------------|
| GET returns cohortId + cohortName when assigned | green | `GET ... returns cohortId + cohortName when assigned to a cohort` |
| GET returns nulls when unassigned | green | `returns cohortId=null and cohortName=null when unassigned` |
| PATCH accepts `{ cohortId: number \| null }` | green | `returns 200 with { slug, cohortId } on successful assignment` + null variant |
| PATCH nullifies on `cohortId: null` | green | `returns 200 and nullifies cohortId when cohortId=null` |
| Unauthenticated → 401, invalid slug → 400 | green | auth-guard + SLUG_RE tests |
| Invalid payload → 400 (missing, wrong type, negative int) | green | 3 payload-validation tests |
| P2025 → 404, P2003 → 400 | green | both Prisma error mappings tested |
| Associates without cohorts remain functional | green | unassigned GET test + nullable FK exercised via PATCH null path |
| Dropdown UI selection persists across reload | manual | Plan 11-03 checkpoint |

### Gaps Filled

None — all PATCH / GET behavior already covered by the 11-tests in
`src/app/api/trainer/[slug]/route.test.ts`.

### Residual Manual Coverage

`AssociateCohortSelect.tsx` is a client component with `useEffect` + optimistic
state. Same DOM-runtime limitation as Plan 11-02: selection persistence,
optimistic revert, and inline status text (Saving/Saved/error) remain validated
by the `checkpoint:human-verify` step in `11-03-PLAN.md` Task 3.

---

## Files for Commit

New test files added by this audit:
- `src/app/trainer/cohorts/page.test.tsx` (3 tests)
- `src/app/trainer/nav-link.test.ts` (1 test)

Validation summary:
- `.planning/phases/11-cohort-management/VALIDATION.md` (this file)

## Verification Commands

```bash
npm run test -- src/app/api/cohorts                          # 25 tests (11-01)
npm run test -- src/app/api/trainer/[slug]/route.test.ts     # 11 tests (11-03)
npm run test -- src/app/trainer/cohorts/page.test.tsx        # 3 tests (11-02 new)
npm run test -- src/app/trainer/nav-link.test.ts             # 1 test  (11-02 new)
```

Full phase run: **40/40 green** (`npm run test -- src/app/api/cohorts src/app/api/trainer/[slug] src/app/trainer`).

## Escalations

None. No implementation bugs discovered. All added tests passed on first green
run after one debug iteration (server-component mock return-value shape — fixed
by inspecting the returned React element's `props` instead of the component-fn
mock, since server components return JSX without invoking child mocks).
