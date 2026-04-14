# Review Pipeline -- 2026-04-13

## Code Review (Codex)

- Standard: **DEFERRED** -- Codex plugin not available in this agent context
- Adversarial: **DEFERRED** -- Codex plugin not available in this agent context
- Note: Per CLAUDE.md, all code review goes through Codex. Run `codex review` and `codex adversarial-review` manually before proceeding to ship.

### Source-Level Findings (pre-Codex)

The following findings were identified during source file analysis and should be validated by Codex:

| ID | Severity | File | Finding |
|----|----------|------|---------|
| CR-01 | Medium | `src/app/api/trainer/[slug]/route.ts` | **Auth order reversed**: slug validation runs BEFORE auth check (lines 21-32). Unauthenticated users can probe slug validity via 400 vs 401 responses. Other routes (gaps, gap-scores, settings, history) correctly check auth first. |
| CR-02 | Medium | `src/app/api/trainer/route.ts`, `src/app/api/trainer/[slug]/route.ts` | **Inconsistent auth pattern**: These two routes manually check `cookies().get('nlm_session')` instead of using the shared `isAuthenticatedSession()` helper from `@/lib/auth-server`. All other new routes use the helper. |
| CR-03 | Low | `src/app/api/associate/[slug]/gaps/route.ts` | **Inconsistent zod import**: Uses `import { z } from 'zod/v4'` while all other files use `import { z } from 'zod'`. May cause runtime issues if zod v4 subpath is not available. |
| CR-04 | Low | `src/app/api/associate/[slug]/gaps/route.ts` vs `src/app/api/associates/[slug]/gap-scores/route.ts` | **Duplicate API surface**: Two separate endpoints serve gap scores for an associate (`/api/associate/[slug]/gaps` and `/api/associates/[slug]/gap-scores`). Different response shapes, different slug validation strictness. Phase 4 created the first, Phase 7 the second. Only Phase 7 endpoint is consumed by the dashboard. Phase 4 endpoint may be dead code. |
| CR-05 | Low | `src/app/api/history/route.ts:33` | **Unvalidated POST body**: `request.json()` is cast directly to `InterviewSession` with no zod validation, unlike the public interview complete endpoint which validates shape. Relies on auth as the trust boundary, but shape validation would add defense-in-depth. |
| CR-06 | Info | `src/app/api/health/route.ts:11` | **Unused error variable**: `catch (error)` captures but never uses `error`. Should be `catch` (no binding) or log the error. |
| CR-07 | Info | `src/lib/__tests__/gapService.test.ts:7` | **Unused import**: `GapScoreInput` is imported but never used (lint warning). |
| CR-08 | Info | `src/lib/__tests__/readinessService.test.ts:43` | **Unused variable**: `mockSessionCount` assigned but never used (lint warning). |

## Security (CSO)

### OWASP Top 10 Assessment

| Category | Status | Notes |
|----------|--------|-------|
| A01 Broken Access Control | **MEDIUM** | Auth order issue in CR-01. Trainer dashboard routes use direct cookie checks instead of shared helper. Auth guard on client-side pages relies on `useAuth()` + redirect pattern -- middleware already protects `/dashboard`, `/interview`, `/review` but NOT `/trainer` or `/associate`. |
| A02 Cryptographic Failures | CLEAN | No custom crypto. Session cookie is HttpOnly. Passwords compared server-side. |
| A03 Injection | CLEAN | All DB queries use Prisma parameterized queries. No raw SQL with user input. No dangerouslySetInnerHTML. No eval(). |
| A04 Insecure Design | CLEAN | Defense-in-depth: slug validation, zod schemas, auth guards on every route. |
| A05 Security Misconfiguration | **LOW** | Health endpoint (`/api/health`) has no auth -- by design for monitoring, but exposes DB connectivity status. |
| A06 Vulnerable Components | **HIGH** | `npm audit` reports 5 vulnerabilities (4 moderate, 1 high) all in `next` 16.1.1. Fix: `npm audit fix --force` to upgrade to next@16.2.3. |
| A07 Auth Failures | CLEAN | Single-password auth with HttpOnly cookie, 24hr expiry, secure flag in production. |
| A08 Data Integrity | CLEAN | Session data validated before DB write in public path. Assessments stored as JSON with type assertions. |
| A09 Logging/Monitoring | **LOW** | Errors logged to console only. No structured logging, no alerting. Acceptable for MVP. |
| A10 SSRF | CLEAN | GitHub API proxy validates paths. No user-controlled URL fetching in new code. |

### STRIDE Threat Model

| Threat | Status | Notes |
|--------|--------|-------|
| Spoofing | LOW | Cookie value is static string `'authenticated'` -- no session tokens, no per-user identity. Acceptable for single-trainer MVP. |
| Tampering | CLEAN | Prisma handles SQL parameterization. Score validation (0-100 range) in gapService. Zod validation on settings. |
| Repudiation | LOW | No audit trail for settings changes or score overrides. Console logs only. |
| Info Disclosure | MEDIUM | CR-01 slug probing. Error responses sometimes include stack details via console.error (server-side only). |
| Denial of Service | LOW | `recomputeAllReadiness()` is synchronous batch -- with many associates this blocks the event loop. Documented as MVP-safe (<200 associates). |
| Elevation of Privilege | CLEAN | Single role (trainer). No privilege escalation vectors. |

### Secrets Archaeology
- CLEAN: No secrets in source. `.env.example` contains placeholders only. `GITHUB_TOKEN`, `OPENAI_API_KEY`, `RESEND_API_KEY`, `APP_PASSWORD` all read from environment at runtime.

### Supply Chain
- `npm audit`: 5 vulnerabilities in `next` 16.1.1. Upgrade path available.
- No typosquatting risk in new dependencies (prisma, pg, recharts, zod -- all well-known packages).

### LLM Security
- No new LLM integration in this milestone. Existing LangGraph scoring unchanged.
- Gap scores derived from LLM-generated scores -- no prompt injection vector (scores are numeric 0-100).

## Quality (Health)

- **Score: 7.5/10**
- Baseline: N/A (first measurement)

| Check | Result | Details |
|-------|--------|---------|
| TypeScript | **PASS** | `tsc --noEmit` clean -- zero errors |
| Build | **PASS** | `next build` succeeds, all 29 routes compile |
| Tests | **PASS** | 5 test files, 76 tests, all passing (223ms) |
| Lint | **WARN** | 460 errors, 2723 warnings. Vast majority (450+) from `src/generated/prisma/` (require imports, this-alias). Only ~10 in source code: 2 unused vars in tests, 1 setState-in-effect in auth-context, 1 unused var in markdownParser. |
| Dead Code | **LOW** | knip found 9 unused exports, mostly in pre-existing code (cleanupService, langchain, markdownParser, types). `slugSchema` export in slug-validation.ts is used internally. |
| npm audit | **WARN** | 5 vulnerabilities in next@16.1.1 (4 moderate, 1 high) |

### Lint Error Breakdown (source files only, excluding generated)

| File | Issue | Severity |
|------|-------|----------|
| `src/lib/auth-context.tsx:23` | setState in useEffect (react-hooks/set-state-in-effect) | Error -- pre-existing |
| `src/lib/__tests__/gapService.test.ts:7` | Unused import `GapScoreInput` | Warning |
| `src/lib/__tests__/readinessService.test.ts:43` | Unused var `mockSessionCount` | Warning |
| `src/lib/markdownParser.ts:133` | Unused var `beginnerRatio` | Warning -- pre-existing |
| `src/components/trainer/CalibrationView.tsx:68` | Unused variable in component | Warning |

## UAT Audit

- **Verified by code analysis:** 27 observable truths across 7 phases
- **Outstanding (human needed):** 11 items across 4 phases

### Outstanding Human Verification Items

| Phase | Item | Why Human Needed |
|-------|------|-----------------|
| 01 | Docker build + /api/health with live Supabase | Requires live credentials + Docker daemon |
| 01 | Verify Prisma migrate deploy succeeded against Supabase | Requires Supabase access |
| 02 | Public interview handleFinish() persistence | **GAP**: `/api/public/interview/complete` endpoint exists but is orphaned -- no caller in codebase. `handleFinish()` in `src/app/page.tsx` never calls it. |
| 03 | Full e2e: slug input -> interview -> associate profile | Requires running app |
| 03 | Client-side slug validation UX | Requires browser |
| 03 | Session accumulation (2 sessions same slug) | Requires running app |
| 03 | Backward compat (session without slug) | Requires running app |
| 03 | Auth guard on /associate/* | Requires browser |
| 03 | 404 state for unknown slug | Requires browser |
| 06 | All 5 trainer dashboard UAT items | Requires browser (auth redirect, design compliance, chart interaction, row click, calibration dropdown) |
| 07 | All 4 adaptive setup UAT items | Requires browser + seeded DB (auto-populate, badge removal, cold-start fallback, design compliance) |

### Critical Gap: Phase 02 Orphaned Endpoint

The `/api/public/interview/complete` route is fully implemented but has **zero callers**. The public interview `handleFinish()` function in `src/app/page.tsx` transitions to the "done" step without persisting the session to Supabase. This means public automated interviews are NOT persisted to the database, breaking the dual-write contract for that flow.

## Security Verification

- **Mitigations implemented:** 22 (across all phases)
- **Missing:** 1

### Threat Mitigations Per Phase

| Phase | Threats Identified | Mitigated | Missing |
|-------|-------------------|-----------|---------|
| 01 | DB connection leak, Prisma binary in Docker | 2/2 | -- |
| 02 | Dual-write failure, payload size | 2/2 | -- |
| 03 | Slug injection, invalid slug in DB query, auth bypass | 3/3 | -- |
| 04 | Score tampering (T-04-03), score range validation | 3/3 | -- |
| 05 | TOCTOU race (WR-01), settings validation (WR-03), threshold bounds | 4/4 | -- |
| 06 | Auth guard (T-06-01, T-06-05), slug validation (T-06-04), readiness status casting (WR-03) | 5/5 | -- |
| 07 | Auth guard (T-07-02), slug validation (T-07-01), anti-enumeration (T-07-03) | 3/3 | -- |

### Missing Mitigation

| ID | Phase | Description |
|----|-------|-------------|
| SM-01 | 06 | `/trainer` and `/trainer/[slug]` routes are not protected by Next.js middleware. They rely on client-side auth redirect via `useAuth()`. While the API routes check auth, the page components will briefly render (or flash) before redirecting. Middleware should be updated to protect `/trainer` routes. |

## Auto-Fixes Applied

- Fixed: 0 (no auto-fix run -- findings require human decision)
- Remaining: See action items below

## Action Items (Priority Order)

### Must Fix Before Ship

1. **[HIGH] npm audit fix**: Upgrade next to 16.2.3 to resolve 5 known vulnerabilities
2. **[HIGH] SM-01**: Add `/trainer` to middleware route matcher for server-side auth protection
3. **[HIGH] Phase 02 gap**: Wire `handleFinish()` in `src/app/page.tsx` to call `/api/public/interview/complete`

### Should Fix

4. **[MEDIUM] CR-01**: Swap auth/validation order in `/api/trainer/[slug]/route.ts` -- check auth before slug validation
5. **[MEDIUM] CR-02**: Refactor trainer routes to use `isAuthenticatedSession()` instead of direct cookie checks
6. **[LOW] CR-03**: Fix zod import in `/api/associate/[slug]/gaps/route.ts` from `'zod/v4'` to `'zod'`
7. **[LOW] CR-04**: Evaluate whether `/api/associate/[slug]/gaps` endpoint is dead code -- consider removing if only `/api/associates/[slug]/gap-scores` is used

### Nice to Have

8. **[INFO] CR-06-08**: Clean up unused imports/variables in tests and health route
9. **[INFO]** Add `.eslintignore` entry for `src/generated/` to eliminate 450+ noise errors from lint output
10. **[INFO]** Run all 11 human UAT items before ship

## Overall: **GATE_REQUIRED**

Three blocking issues found:
1. Next.js vulnerabilities (npm audit)
2. Middleware gap for /trainer routes
3. Orphaned public interview persistence endpoint

## Next Step

- Run `codex review` and `codex adversarial-review` for independent code review
- Fix HIGH items above
- Then proceed to `/pipeline-test`
