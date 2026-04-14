# Pitfalls Research

**Domain:** Adaptive skills assessment platform — adding associate auth, cohort management, curriculum scheduling, automated interview pipeline integration, cohort dashboard views, design cohesion, and email notifications to an existing Next.js 16 app with dual-write migration and single-password trainer auth
**Researched:** 2026-04-14
**Confidence:** HIGH (derived from direct codebase analysis of all affected files + established patterns for auth layering, cohort data modeling, and pipeline extension)

---

## Critical Pitfalls

Mistakes that cause rewrites, broken existing flows, or silent data corruption in this codebase specifically.

---

### Pitfall 1: Single Middleware Guarding Both Auth Systems Simultaneously

**What goes wrong:** The current `src/middleware.ts` checks a single cookie (`nlm_session === 'authenticated'`) for all protected paths. When associate auth is added, the middleware must distinguish between "a trainer is logged in" (existing cookie) and "an associate is logged in" (new associate token). The failure mode is writing a guard like `if (trainerCookie || associateCookie)` that allows associates into `/trainer` routes or allows trainers into associate-only paths without scoping. Worse: both cookies present simultaneously creates ambiguous identity — the wrong user's data is loaded in server components.

**Why it happens:** The existing middleware is 20 lines with a simple string check. It looks trivially easy to extend. The guard feels done when the 401 stops returning, but the identity context downstream (which user are we?) is never resolved.

**Consequences:** Associates view other associates' data. Trainers inadvertently trigger associate-scoped sessions. Routes that check `isAuthenticatedSession()` in `auth-server.ts` have no concept of "which kind of authenticated" — they return `true` for both, so all protected route handlers break their authorization model.

**How to avoid:** Before adding associate auth, explicitly enumerate route permission matrix:
- `/dashboard`, `/interview`, `/review`, `/trainer/*` — trainer only (existing `nlm_session`)
- `/associate/*`, `/interview/public/*` — associate only (new `associate_session` cookie)
- Shared: none (no route serves both roles)

Keep trainer and associate cookies entirely separate. Middleware should call `getCallerIdentity(request)` that returns `{ type: 'trainer' | 'associate' | 'anonymous', id?: string }` and route-specific guards use this. Never chain the two auth checks with `||` on a shared protected-paths list.

**Warning signs:** A test where you log in as an associate and directly navigate to `/trainer` — if it redirects to login instead of returning 403, the guard is ambiguous rather than correct.

**Phase to address:** Associate Auth (first phase of v1.1)

---

### Pitfall 2: Associate Auth Breaks the Existing Zustand Store's `associateSlug` Pattern

**What goes wrong:** The Zustand store (`interviewStore.ts`) accepts `associateSlug` as an optional parameter to `createSession()`. This is a trainer-entered string during setup — the trainer types the associate's slug and it flows into the session. When associate auth exists, the slug is known at login time and must come from the auth token, not from trainer input. If both pathways coexist — trainer can still type a slug AND an authenticated associate's slug is present — sessions can be created with a mismatched or missing `associateSlug` when an associate self-initiates, because the store's `createSession` call doesn't know to pull from the auth context instead.

**Why it happens:** The store was designed for trainer-driven setup. Adding a second identity source (auth context) without refactoring `createSession` means two different code paths that can produce sessions with different slug origins — or with no slug at all if the auto-population is wired incorrectly.

**Consequences:** Associate-initiated automated interviews complete but their sessions are not linked to the Associate row in the DB (no `associateId` on the Session), so gap scores and readiness are never computed. Sessions appear in the DB but are orphaned. The associate's readiness record never updates despite them completing interviews.

**How to avoid:** When associate auth lands, add a `setAssociateContext(slug: string)` action to the store that populates `associateSlug` from the auth token immediately after login. The `createSession` call should read from the store's existing `associateSlug` field rather than accepting it as a parameter. Trainer-entered slug should be a separate field (e.g., `trainerEnteredSlug`) so the two can never collide. Wire validation: if an authenticated associate session exists and `trainerEnteredSlug` disagrees, use the auth token value and warn.

**Warning signs:** After an authenticated associate completes an interview, query `SELECT * FROM "Session" WHERE "associateId" IS NULL AND "date" > (now - 1hr)` — any rows here mean the slug is not being carried through.

**Phase to address:** Associate Auth

---

### Pitfall 3: Public Interview Complete Endpoint Has No Identity — Adding Auth to It Is a Breaking Change

**What goes wrong:** `/api/public/interview/complete` (route.ts) is currently guarded only by fingerprint-based rate limiting. The session payload it receives may include `associateSlug` (set by the associate during public interview flow), but the endpoint does not validate that the slug belongs to the caller — any caller can submit any slug. When associate auth is added, the intent is for authenticated associates to have their public interviews attributed to their readiness record. But retrofitting auth onto this endpoint is a breaking change: existing clients (unauthenticated browsers) will immediately fail with 401.

**Why it happens:** "Make it work, then make it secure" thinking during MVP. The endpoint was built as fire-and-forget. Now it needs to serve two roles: unauthenticated anonymous users AND authenticated associates.

**Consequences:** If the endpoint requires auth, all existing anonymous interviews break. If auth is optional but the endpoint trusts a slug from an unauthenticated payload, a malicious caller can pollute any associate's readiness record by submitting their slug with fabricated scores (the existing code accepts full session objects from untrusted clients).

**How to avoid:** Treat this as two separate flows at the controller level:
1. Anonymous: existing endpoint unchanged, sessions persist without associateId (no readiness pipeline triggered).
2. Authenticated associate: new endpoint `/api/associate/interview/complete` that requires the `associate_session` cookie and uses the auth token's slug — ignores any slug in the payload body.

Never add optional auth to the same endpoint (the `if token exists, trust it` pattern is an IDOR vulnerability). The slug must come from the verified token, not the payload.

**Warning signs:** Searching for `associateSlug` in the public/interview/complete request body being trusted without token verification — this is the injection point.

**Phase to address:** Associate Auth + Automated Interview Pipeline Integration

---

### Pitfall 4: Cohort Adds a Foreign Key to Associate — Existing `persistSessionToDb` Upserts Break

**What goes wrong:** Currently `persistSessionToDb` upserts an Associate by slug with only `displayName`. When Cohort is added and every Associate needs a `cohortId` foreign key, the upsert's `create` block becomes invalid — it creates an Associate without a cohort, violating any non-nullable FK constraint. If `cohortId` is nullable (to keep upsert working), orphaned associates accumulate outside any cohort and the cohort roster is incomplete.

**Why it happens:** The upsert was written for the minimal Associate model. Adding a FK feels like a simple schema change. The consequence on the upsert logic is non-obvious until the constraint fires at runtime.

**Consequences:** Trainer-led sessions for associates not yet assigned to a cohort fail at the DB write step. The error is caught by the try/catch in `persistSessionToDb` and returns `false`, but the file-based write already succeeded — divergence enters the system silently (known debt: INT-02 pattern repeating).

**How to avoid:** Make `cohortId` nullable on Associate with a clear semantic: `null` means "unassigned." Add a cohort assignment step in the trainer flow separately from session creation. Never require cohort assignment for session persistence to succeed. Document that unassigned associates appear in a special "Unassigned" group in the cohort dashboard, not as an error.

**Warning signs:** After adding Cohort schema, run the sync-check endpoint (`/api/sync-check`) — any sessions missing from DB that are present in file history indicate the upsert is failing.

**Phase to address:** Cohort Management (schema design step)

---

### Pitfall 5: Curriculum Scheduling Filter Applied at Question Selection Time Without Cache — Degrades Every Setup Page Load

**What goes wrong:** Curriculum-driven question selection means the setup wizard must know "which topics have been taught by today's date." This requires querying the curriculum schedule (a new DB table) on every setup page load to determine which question bank files are available for selection. If this query runs synchronously during the setup wizard's GitHub file listing step, it adds a serial DB round-trip to a flow that already awaits the GitHub API. At 200ms GitHub API + 50ms DB query, the setup wizard's tech selection phase now takes 250ms minimum — but in practice queries compose and the user perceives the delay as the wizard being "slow."

**Why it happens:** The curriculum filter is conceptually a WHERE clause on the question bank list — it feels natural to apply it at fetch time. The latency impact is invisible in dev (localhost DB, mock GitHub API).

**Consequences:** Setup wizard feels noticeably slower. On the Supabase free tier with connection pool constraints, the extra query during setup also consumes a connection slot during the interview peak hours when connections are most scarce.

**How to avoid:** Compute the "currently unlocked topics" set once per trainer session login and cache it server-side (Next.js route handler cache or a simple in-memory TTL cache). The curriculum schedule is not real-time — topics unlock by date, so a 15-minute cache is semantically correct. Do not fetch curriculum state per-request in the setup wizard's question loading path.

**Warning signs:** Adding `console.time('setup-wizard')` shows > 300ms to reach tech selection step after curriculum integration. The GitHub API fetch and curriculum fetch happen serially rather than in parallel via `Promise.all`.

**Phase to address:** Curriculum Scheduling

---

### Pitfall 6: Email Notifications Sent on Every Readiness Recomputation, Not Just on Status Change

**What goes wrong:** The current readiness pipeline runs `updateAssociateReadiness` at the end of every session save. When email notifications are added for readiness changes (e.g., "Alex is now Ready"), the naive implementation adds a `sendEmail()` call inside `updateAssociateReadiness`. Every session completion sends an email. If an associate completes 5 sessions in one day (plausible for associates doing practice sprints), the trainer receives 5 emails, 4 of which say "Alex is still Ready." Email fatigue causes trainers to disable notifications, defeating the feature.

**Why it happens:** The event "readiness recomputed" is fired on every session completion. It feels like the right hook for notification. The code path `computeReadiness → updateAssociate → sendEmail` is linear and obvious.

**Consequences:** Email volume overwhelms Resend's free tier (100 emails/day). Trainers stop trusting or reading notification emails. Potential Resend rate limit errors in the session save pipeline if the email call is synchronous (currently `/api/send-email` is an HTTP call, not a direct Resend SDK call in the pipeline).

**How to avoid:** Compare the new readiness status against the previous readiness status stored in `associate.readinessStatus` before sending. Only send when `oldStatus !== newStatus`. The `Associate` row already stores `readinessStatus` — read it before calling `computeReadiness`, then compare after. Implement this comparison inside `updateAssociateReadiness` before the `prisma.associate.update` call.

```typescript
const previous = await prisma.associate.findUnique({
  where: { id: associateId },
  select: { readinessStatus: true }
});
const result = await computeReadiness(associateId, threshold);
if (previous?.readinessStatus !== result.status) {
  await sendReadinessChangeNotification(associateId, result.status);
}
```

**Warning signs:** Setting up email notifications and immediately receiving duplicate emails during a test session that completes multiple times (re-review flow).

**Phase to address:** Email Notifications

---

### Pitfall 7: `recomputeAllReadiness` Called on Cohort Bulk Operations — Blocks Under Load

**What goes wrong:** `readinessService.ts` exports `recomputeAllReadiness(threshold)` which iterates sequentially over all associates (`for...of` loop with `await` inside). It was designed for the settings threshold change. When cohort management introduces bulk operations — assigning 20 associates to a cohort, importing a cohort roster, bulk-enrolling in a curriculum — any code that triggers a readiness recomputation for all affected associates will serialize 20 DB round-trips sequentially. At ~50ms per associate (gap score fetch + readiness computation + associate update), a 20-associate cohort takes 1 second minimum for the bulk operation to complete. The Next.js route handler times out at the Vercel/GCE default (if configured) or the UI appears frozen for 1+ seconds.

**Why it happens:** The sequential loop was explicitly documented in the code as "safe for MVP (<200 associates)" — but cohort bulk operations were not anticipated as a trigger at the time of writing.

**Consequences:** Cohort creation/assignment operations time out or produce partial state (some associates recomputed, others not) if the loop is interrupted. The UI shows a spinner for > 1 second on what should be an instant action.

**How to avoid:** Cohort bulk operations should NOT trigger synchronous bulk readiness recomputation. Instead, mark affected associates as `readinessStale: true` (add a boolean flag to the Associate model) and recompute lazily on next dashboard load for that associate. Alternatively, use `Promise.all` for parallel recomputation — but respect the Supabase connection pool (max 5 in current config) by batching in groups of 5.

**Warning signs:** Creating a cohort with multiple associates takes > 500ms server response time. Checking the DB shows partial updates — some associates have updated readiness, others have stale timestamps.

**Phase to address:** Cohort Management + Email Notifications

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems specific to this codebase.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Making `cohortId` required on Associate | Cleaner data model | Breaks `persistSessionToDb` upsert for sessions with unassigned associates | Never — keep nullable |
| Adding associate auth to existing `/api/public/interview/*` endpoints with optional token | Single endpoint handles both flows | IDOR: slug in payload trusted without verification; anonymous flow and auth flow share logic that diverges | Never — split into separate endpoints |
| Sending notification emails synchronously inside the session save pipeline | Simple linear code | Blocks session save on Resend API latency/failure; inflates save response time by 50-200ms | Never — fire-and-forget or queue |
| Reusing `nlm_session` cookie for associate auth by adding a role field | No new cookie infrastructure | Single cookie namespace means trainer-session and associate-session can collide; middleware logic becomes a tangle of role checks | Never — separate cookie names per identity type |
| Computing curriculum-unlocked topics inside the setup wizard's question fetch | No additional state to manage | Serial DB + GitHub API call per page load; 200ms+ latency added to critical path | Only if curriculum table has <10 rows and is heavily cached |
| Storing cohort assignments in Zustand persist | Cohort info available offline | Stale cohort data persists across sessions; associates appear in wrong cohort after reassignment | Never — cohort is DB-authoritative, never in localStorage |
| Triggering bulk readiness recompute on every cohort mutation | Readiness always current | Sequential await loop serializes DB calls; blocks route handler for 1+ seconds at 20 associates | Only if explicitly batched with `Promise.all` and pool-size limited |

---

## Integration Gotchas

Common mistakes when connecting v1.1 features to this specific system.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Associate auth + existing `isAuthenticatedSession()` | Returning `true` from `isAuthenticatedSession` for associate cookies (both are "authenticated") | `isAuthenticatedSession` should remain trainer-only; add separate `isAssociateAuthenticated()` that checks the associate cookie |
| Cohort FK + `persistSessionToDb` upsert | Making `cohortId` non-nullable on Associate, causing upsert to fail for unassigned associates | `cohortId` nullable; unassigned associates are valid; cohort assignment is a separate operation |
| Email notifications + existing Resend `/api/send-email` route | Calling `/api/send-email` as an internal fetch from `updateAssociateReadiness` (server → server HTTP call in Docker) | Use Resend SDK directly in a `notificationService.ts` lib — avoid internal HTTP calls from server code |
| Curriculum schedule + question bank selection | Fetching curriculum state and GitHub files serially in the setup wizard | `Promise.all([fetchCurriculumState(), fetchGitHubFiles()])` — parallel fetch, combine results |
| Public interview + associate auth | Adding auth as optional middleware on `/api/public/interview/*` | Split: public flow stays public, authenticated flow uses new `/api/associate/interview/*` endpoints |
| Cohort dashboard + existing trainer roster | Conditionally filtering the existing `/api/trainer` endpoint by cohort via query param | Keep existing endpoint unchanged; add `/api/trainer/cohorts/[cohortId]` for scoped roster — don't add query params that change the shape of an existing response |
| Automated interview pipeline + gap scoring | Wiring gap scoring into the existing fire-and-forget path at `/api/public/interview/complete` | The existing endpoint must remain anonymous; gap scoring should only run when an authenticated associate session is present via the new endpoint |

---

## Performance Traps

Patterns that work at small scale but fail as cohort data grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Fetching all associates then filtering by cohort in JS | Cohort dashboard loads slowly; unnecessary data transferred | Add `WHERE cohortId = ?` to the `/api/trainer` cohort variant at the DB query level | ~50+ associates |
| Loading full session JSON (assessments JSONB blob) for roster view | Roster page slow; high memory per request | Select only scalar fields (`overallTechnicalScore`, `readinessStatus`) for roster; reserve full JSONB load for drill-down | ~20 associates with 10+ sessions each |
| Sequential `Promise.all` gap score upserts per session | Session save grows linearly with question count | Current code already uses `Promise.all` for upsert — maintain this; do not convert to sequential for curriculum topic tracking additions | ~50+ questions per session |
| `recomputeAllReadiness` called on settings change with large cohort | Settings save blocks for seconds | Batch in chunks of 5 (match pool size) or move to background job | ~20+ associates |
| Curriculum schedule fetched per request without cache | Setup wizard latency spikes | Cache unlocked topics per trainer session (15min TTL) | Any scale — it's a serial DB call in the hot path |

---

## Security Mistakes

Domain-specific security issues for v1.1.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Accepting `associateSlug` from unauthenticated request body and using it to trigger gap/readiness pipeline | Any anonymous caller can pollute any associate's readiness record with fabricated scores | Slug must come from verified auth token only; public endpoint never triggers readiness pipeline |
| Issuing associate auth cookies without an expiry or rotation mechanism | A stolen cookie provides permanent access | Set `Max-Age` (recommend 8 hours for interview sessions); use `HttpOnly` + `SameSite=Strict`; rotate on each interview completion |
| Curriculum schedule accessible without trainer auth | Anonymous callers can enumerate what topics are taught and when | Add `isAuthenticatedSession()` guard to curriculum management API routes; curriculum data is business-sensitive |
| Associate seeing another associate's gap scores via slug enumeration on `/associate/[slug]` | Associates can compare their readiness to others or confirm slugs exist | Add auth guard to `/associate/[slug]` route: only the authenticated associate for that slug (or a trainer) may view |
| Email notifications containing readiness classification sent to wrong recipient | Trainer misconfigures notification email; wrong party receives associate data | Never include associate PII in notification subject line; confirm recipient is a trainer account before sending |

---

## UX Pitfalls

Common user experience mistakes specific to these features.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Associate auth login is the same URL as trainer login | Associates and trainers land on the same form, creating confusion about what credentials to enter | Separate login pages: `/login` (trainer, existing), `/associate/login` (associates) with clearly different visual treatment |
| Cohort dashboard shows "No Data" for associates < 3 sessions without explanation | Trainers think something is broken for new cohort members | Show "Needs 3 sessions to unlock readiness signal — N/3 complete" per associate in the roster |
| Curriculum schedule shows all topics including future ones | Associates (or trainers) select a question bank for topics not yet taught; students are tested on material they haven't seen | Default to hiding future-dated topics; add a "preview future topics" toggle for trainers only |
| Email notification arrives with no action link | Trainer reads "Alex is now Ready" but doesn't know where to go | Every notification email includes a deep link to `/trainer/[slug]` |
| Design cohesion pass changes button colors/spacing in the interview flow mid-session | Associates in the middle of an interview notice visual changes between questions if any CSS is applied inconsistently | Apply design cohesion pass only to pages outside the interview flow first; interview pages (`/interview`, `/review`) are highest-risk for mid-session visual breakage |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Associate auth:** Associate can log in and complete an interview — but verify the session's `associateSlug` in the DB matches the auth token's slug (not the payload's slug) before declaring pipeline attribution working.
- [ ] **Cohort creation:** Cohort row created in DB — but verify that existing sessions for associates added to the cohort are retrospectively visible in the cohort dashboard (cohort assignment is not retroactive by default).
- [ ] **Curriculum scheduling:** Question bank filter applies during setup — but verify that changing the curriculum date does not retroactively change what question banks were available for past sessions (curriculum state is point-in-time, not retroactive).
- [ ] **Automated interview pipeline integration:** Public interview session persists to DB — but verify gap scores and readiness actually recomputed for the associate (INT-02 tech debt from v1.0 — fire-and-forget path is confirmed to skip the gap pipeline).
- [ ] **Email notifications:** Email sends on first test — but verify no duplicate sends when the same session is saved twice (the re-review flow calls `POST /api/history` multiple times for the same session ID).
- [ ] **Design cohesion:** All pages render with DESIGN.md tokens — but verify that Tailwind's JIT compile didn't purge design-system classes that only appear in dynamically constructed strings (common with color interpolation like `text-${status}-500`).
- [ ] **Cohort dashboard:** Roster filtered by cohort renders correctly — but verify the "All Associates" view (existing `/trainer` page) still works and is not accidentally scoped to the first cohort.

---

## Recovery Strategies

When pitfalls occur despite prevention.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Middleware conflates trainer/associate auth | MEDIUM | Add route-level auth check as a secondary guard in each trainer route handler — middleware fix alone is not sufficient because sessions may already be mixed |
| Associate sessions persisted without associateId (orphaned) | MEDIUM | Write a one-time migration script: for orphaned Sessions with a non-null `candidateName`, attempt slug lookup from `data/interview-history.json`; manually re-link via `prisma.session.update({ where: { id }, data: { associateId } })` |
| Cohort FK causes upsert failures in production | LOW | Make `cohortId` nullable via `prisma migrate` — a non-breaking schema change; no data migration needed |
| Duplicate notification emails sent | LOW | Add `notificationSentAt` timestamp to Associate row; check before sending; deduplicate by (associateId, newStatus, date) |
| Curriculum filter breaks question bank loading entirely | MEDIUM | Curriculum filter should be additive (whitelist), never exclusive (blacklist that returns empty). If filter produces empty list, fall back to full question bank and log a warning |
| Design tokens purged by Tailwind JIT | LOW | Add dynamic color classes to `safelist` in `tailwind.config.ts`; run `npm run build` and inspect CSS output for missing classes |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Middleware conflating trainer/associate auth (Pitfall 1) | Associate Auth | Navigate to `/trainer` while holding only an associate session cookie — must get 403, not 200 or redirect to login |
| Zustand store slug origin collision (Pitfall 2) | Associate Auth | After associate login + interview complete, query `Session WHERE associateId IS NULL AND date > now-1hr` — must return 0 rows |
| Public interview endpoint IDOR / breaking change (Pitfall 3) | Associate Auth + Automated Interview Pipeline | Confirm `/api/public/interview/complete` unchanged; new `/api/associate/interview/complete` exists; anonymous test still completes without 401 |
| Cohort FK breaking associate upsert (Pitfall 4) | Cohort Management — schema design | Run `persistSessionToDb` for an associate with no cohort assigned — must succeed |
| Curriculum filter serial latency (Pitfall 5) | Curriculum Scheduling | Setup wizard phase 2 (tech selection) loads in < 400ms with curriculum filter active; verify with `console.time` |
| Email notification on every session, not on status change (Pitfall 6) | Email Notifications | Complete 3 sessions for same associate without status change — confirm 0 emails sent; then trigger status change — confirm exactly 1 email |
| Bulk readiness recompute blocking cohort operations (Pitfall 7) | Cohort Management + Email Notifications | Create a cohort with 10 associates — route handler response time must be < 500ms; readiness recomputation must not be in the critical path |

---

## Sources

- Direct codebase analysis:
  - `src/middleware.ts` — current auth logic, single-cookie pattern
  - `src/lib/auth-server.ts` — `isAuthenticatedSession()` implementation
  - `src/store/interviewStore.ts` — `associateSlug` parameter in `createSession`
  - `src/app/api/public/interview/complete/route.ts` — fingerprint-only auth, slug from payload
  - `src/app/api/public/interview/start/route.ts` — rate limit only, no identity
  - `src/lib/sessionPersistence.ts` — upsert logic, `associateId` linking
  - `src/lib/readinessService.ts` — `recomputeAllReadiness` sequential loop pattern
  - `src/lib/gapPersistence.ts` — `saveGapScores` pipeline
  - `src/app/api/history/route.ts` — dual-write pattern, fire-and-forget gap pipeline
  - `prisma/schema.prisma` — current Associate model, nullable fields, FK structure
- Project documentation:
  - `.planning/PROJECT.md` — v1.1 target features, constraints, decisions
  - `.planning/milestones/v1.0-MILESTONE-AUDIT.md` — known tech debt INT-02 (public interviews skip gap pipeline), FLOW-01 (no settings UI), 11 tracked debt items
  - `CLAUDE.md` — architecture overview, dual-write design, auth pattern
- Confidence note: All pitfalls derived from direct code inspection of this repository. No external web sources were available. Confidence is HIGH for pitfalls grounded in the actual code (auth middleware, upsert logic, readiness loop). Confidence is MEDIUM for performance thresholds (e.g., "breaks at 50 associates") — these are reasonable estimates based on Supabase free tier limits (60 connections, ~50ms query latency) documented in training data.

---
*Pitfalls research for: Next Level Mock v1.1 Cohort Readiness System*
*Researched: 2026-04-14*
