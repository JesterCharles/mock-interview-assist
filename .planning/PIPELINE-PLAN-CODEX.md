# v1.1 Architecture Review

Date: 2026-04-14
Reviewer: Codex
Scope read: `ROADMAP.md`, `REQUIREMENTS.md`, `PROJECT.md`, `research/ARCHITECTURE.md`, `research/PITFALLS.md`, phases 08-14

## Verdict

The milestone is viable for a solo 3-4 week push only if rollout boundaries get tighter. The additive schema itself is fine. The real risks are API contract breakage, an incomplete authenticated automated-interview path, identity spoofing on the public completion route, and a design pass that currently proposes deleting shared CSS utilities still used by live v1.0 flows.

Overall confidence: Medium.
Reason: the plans are directionally sound, but several phase plans only work if multiple dependent changes ship atomically, and a few assumptions conflict with the current codebase.

## Findings

### 1. `/api/trainer` is planned to change shape in a way that breaks existing v1.0 consumers during rollout

Evidence:
- Phase 12 changes `/api/trainer` from `RosterAssociate[]` to `{ associates, summary }` in `.planning/phases/12-cohort-dashboard-views/12-01-PLAN.md:93-125`.
- Current `/trainer` expects a raw array in `src/app/trainer/page.tsx:33-38`.
- Current `/dashboard` associate typeahead also expects a raw array in `src/app/dashboard/page.tsx:79-84`.

Why this matters:
- If Phase 12 backend lands before Phase 12 UI updates, `/trainer` and `/dashboard` can both regress immediately.
- This violates the stated v1.0 preservation goal more than any schema change does.

Safer alternative:
- Keep `/api/trainer` response stable.
- Add a new endpoint for cohort-filtered roster, or add an opt-in query like `?cohortId=X&includeSummary=true`.
- If you insist on reusing `/api/trainer`, ship backend and both consumers atomically behind one branch/release.

Confidence: High.
Reason: this is a direct contract mismatch against current code, not a hypothetical.

### 2. The planned PIN flow does not yet define a real authenticated automated-interview entry path

Evidence:
- Phase 9 PIN UI redirects to `?next=` or `/associate/{slug}` in `.planning/phases/09-associate-pin-auth/09-03-PLAN.md:105-107`.
- That same phase only guards `/associate/[slug]` in `.planning/phases/09-associate-pin-auth/09-03-PLAN.md:121-140`.
- The current automated public interview lives on `/` and is fully anonymous in `src/app/page.tsx:104-149` and `src/app/page.tsx:205-231`.

Why this matters:
- Phases 9 and 10 assume “authenticated automated interviews” exist, but the user journey is underspecified.
- You can ship PIN auth and still have no clean way for an associate to start an authenticated automated interview.

Safer alternative:
- Add an explicit authenticated entry route now.
- Best option: `/associate/[slug]/interview` or `/automated-interview` that requires `associate_session`, launches the existing interview UI, and carries identity server-side.
- Do not rely on a hidden cookie magically upgrading the anonymous root flow later.

Confidence: High.
Reason: the planned routes do not currently connect to the existing automated interview surface.

### 3. Reusing `/api/public/interview/complete` keeps an identity injection hole open

Evidence:
- Phase 10 keeps the anonymous path on the same route and preserves the original payload when no cookie exists in `.planning/phases/10-automated-interview-pipeline/10-01-PLAN.md:123-147`.
- Current public completion writes whatever `session` it receives to DB in `src/app/api/public/interview/complete/route.ts:39-55`.
- `persistSessionToDb()` upserts and links an associate whenever `session.associateSlug` is present in `src/lib/sessionPersistence.ts:16-31`.

Why this matters:
- An anonymous caller can still POST a forged `associateSlug` and create/link sessions to a real associate.
- Even if Phase 10 only runs readiness fan-out for cookie-authenticated requests, those forged linked sessions will still exist in DB and can later contaminate gap/readiness recomputation because the pipeline reads all completed sessions for an associate.

Safer alternative:
- Split endpoints:
- Anonymous stays on `/api/public/interview/complete` and the route strips `associateSlug` unconditionally.
- Authenticated associate flow uses a separate `/api/associate/interview/complete` endpoint and derives identity only from the verified cookie.
- If you keep one endpoint, anonymous requests must explicitly null out associate identity before persistence.

Confidence: High.
Reason: the current persistence layer already trusts `associateSlug`; the plan does not close that on the anonymous path.

### 4. The PIN auth and HMAC cookie design is too hard to revoke and couples two auth domains to `APP_PASSWORD`

Evidence:
- No PIN expiry is planned in `.planning/phases/09-associate-pin-auth/09-CONTEXT.md:20-24`.
- The cookie is signed with `APP_PASSWORD` in `.planning/phases/09-associate-pin-auth/09-CONTEXT.md:27-30`.
- The token contract only round-trips `associateId` in `.planning/phases/09-associate-pin-auth/09-01-PLAN.md:98-100`.

Why this matters:
- Regenerating a PIN does not automatically invalidate an existing cookie if the cookie only carries `associateId` and signature.
- Rotating the trainer password invalidates all associate sessions as a side effect.
- Reusing the human-entered trainer password as an HMAC secret is avoidable coupling.

Safer alternative:
- Add a dedicated `ASSOCIATE_SESSION_SECRET`.
- Include a version in the token, tied to `pinGeneratedAt` or a new `associate.sessionVersion`.
- Validate that version on associate-protected routes and the authenticated completion route. One DB lookup there is acceptable; you do not need DB work in middleware.

Confidence: Medium-High.
Reason: the cryptographic signing is fine, but revocation and secret separation are the missing pieces.

### 5. Fire-and-forget readiness updates are acceptable for v1.0 convenience, but fragile as a v1.1 system-of-record

Evidence:
- Current trainer-led history save writes file/DB, then runs gap/readiness asynchronously and swallows failures in `src/app/api/history/route.ts:50-71`.
- Phase 10 formalizes the same fire-and-forget model in `.planning/phases/10-automated-interview-pipeline/10-01-PLAN.md:103-110` and `.planning/phases/10-automated-interview-pipeline/10-01-PLAN.md:141-147`.

Why this matters:
- If the app restarts or errors after session persistence but before readiness update, the associate record stays stale.
- In v1.1, cohort summaries and trainer trust depend on readiness staying current.
- There is no repair path in the plan except “log and continue.”

Safer alternative:
- Minimal pragmatic version: persist a DB-backed “needs readiness recompute” marker or outbox row when a session completes, then clear it after successful recompute.
- If you want even less surface area, compute synchronously for trainer-led saves and keep async only for public completion, but still add a replay mechanism for failed recomputes.

Confidence: Medium-High.
Reason: the failure mode is real, but the impact depends on deployment churn and traffic volume.

### 6. Dual-write file+DB is now the weak point, and `/api/sync-check` is too weak to be a rollout guard

Evidence:
- The project still declares “Dual-write active” in `.planning/PROJECT.md:89-94`.
- Current trainer-led save writes file first, then DB, in `src/app/api/history/route.ts:35-52`.
- Current sync-check only compares counts and whether the latest 5 file IDs exist in DB in `src/app/api/sync-check/route.ts:14-32`.

Why this matters:
- v1.1 features are increasingly DB-only: cohorts, curriculum, PINs, authenticated pipeline.
- File-first plus weak parity checks means you can silently accept DB divergence while the product increasingly depends on DB correctness.

Safer alternative:
- Make Postgres the canonical source for v1.1.
- Keep file history only as a transitional export/backup for trainer-led sessions, not as a peer source of truth.
- If dual-write stays for this milestone, strengthen verification beyond “count + recent 5 IDs.”

Confidence: High.
Reason: this is already visible in the current architecture and gets worse as more features become DB-only.

### 7. The `<400ms` curriculum-fetch assumption is low-confidence with the current GitHub fetch model

Evidence:
- Phase 13 assumes `<400ms` by parallelizing curriculum + GitHub fetch in `.planning/phases/13-curriculum-schedule/13-CONTEXT.md:38-47`.
- The planned perf test explicitly allows mocking GitHub and curriculum responses in `.planning/phases/13-curriculum-schedule/13-03-PLAN.md:138-145`.
- Current wizard GitHub discovery recursively walks the repo through `/api/github` in `src/lib/github-service.ts:63-83` and starts fetching techs on mount in `src/app/dashboard/page.tsx:95-120`.

Why this matters:
- `Promise.all` only removes serial latency. It does not make a recursive remote GitHub listing fast.
- A mocked Playwright perf test proves client render speed, not real system latency.

Safer alternative:
- Cache or persist the question-bank manifest server-side and have the wizard load that precomputed list.
- Filter the cached manifest by curriculum, then fetch question content only after the trainer chooses topics.
- Until that exists, treat `<400ms` as a target, not a release gate.

Confidence: High.
Reason: the live dependency graph is visible in current code, and the proposed test strategy does not validate the real bottleneck.

### 8. Curriculum matching by free-form `skillName` substring is too brittle

Evidence:
- Phase 13 uses case-insensitive substring matching between `CurriculumWeek.skillName` and the first path segment in `.planning/phases/13-curriculum-schedule/13-CONTEXT.md:38-41`.

Why this matters:
- This can silently over-match or under-match.
- Examples: `sql` vs `postgresql`, `node` vs `nodejs`, `react` vs `react-native`.
- Silent fallback behavior means bad mappings can be hard to notice.

Safer alternative:
- Store a canonical `skillSlug` or exact `questionBankPath` in `CurriculumWeek`.
- Keep `skillName` as display text only.
- Add the uniqueness rule for `(cohortId, weekNumber)` now, not later, so the schedule cannot drift into ambiguous duplicates.

Confidence: High.
Reason: substring matching for identity is inherently brittle, and the repo already uses path-based skill identifiers.

### 9. Additive schema migration is the right schema strategy, but the proposed runtime migration rollout is brittle

Evidence:
- Phase 8 migration itself is additive and low-risk in `.planning/phases/08-schema-migration/08-CONTEXT.md:17-39`.
- The risky part is the rollout plan that puts `prisma migrate deploy` in container `CMD` in `.planning/phases/08-schema-migration/08-02-PLAN.md:107-130`.
- Current Dockerfile is a plain standalone runtime that just starts `node server.js` in `Dockerfile:67-95`.

Why this matters:
- App startup now depends on migration success and direct DB connectivity.
- A migration failure becomes a hard boot failure.
- This is acceptable for a one-container hobby app, but it is still a worse rollout boundary than a one-shot migration step.

Safer alternative:
- Keep the additive Prisma migration.
- Move migration execution to a release step, entrypoint script, or separate one-shot container/job.
- Do not tie the web process boot path to schema migration unless you are comfortable treating every deploy as “migrate or stay down.”

Confidence: Medium-High.
Reason: the schema shape is safe; the deployment coupling is the risky piece.

### 10. Phase 14’s global CSS cleanup is incompatible with the stated goal of leaving `/interview` and `/review` visually unchanged

Evidence:
- Phase 14 plans to delete shared utilities like `.nlm-bg`, `.glass-card`, `.gradient-text`, `.gradient-text-static`, and glow classes in `.planning/phases/14-design-cohesion/14-01-PLAN.md:88-105`.
- The current trainer-led interview still uses `nlm-bg`, `gradient-text-static`, and gradient classes in `src/app/interview/page.tsx:110-145`.
- The current public interview root page heavily uses `nlm-bg`, `glass-card`, `gradient-text`, and glow classes in `src/app/page.tsx:649-760`.

Why this matters:
- Deleting those utilities globally before all dependent pages are migrated will break live styling immediately.
- This is the clearest v1.0 regression risk in the entire milestone.

Safer alternative:
- Preserve legacy utility aliases until every consuming page is migrated.
- Or scope the new token system to new public/associate/cohort routes first, then remove old global classes after `/interview`, `/review`, and `/` are off them.
- For this milestone, I would explicitly de-scope the “delete old utilities” part.

Confidence: High.
Reason: this is a direct mismatch between the plan and current class usage.

## Assumption Ratings

- Additive schema migration: Medium-High confidence.
Reason: the schema changes are appropriately additive; the risky part is runtime rollout, not the table design.

- PIN auth design: Medium-Low confidence as written.
Reason: it lacks a concrete authenticated interview entry path and easy session revocation.

- HMAC-signed cookie identity enum: Medium confidence if secret split and versioning are added; Low confidence as written.
Reason: the enum idea is good, but `APP_PASSWORD` reuse and no revocation/version check are weak.

- Fire-and-forget gap/readiness pipeline: Medium-Low confidence.
Reason: okay for best-effort UX, weak for a readiness system that powers cohort summaries unless a repair path exists.

- `<400ms` curriculum fetch: Low confidence.
Reason: real GitHub discovery is the dominant latency source, and the proposed perf test can be satisfied with mocks.

- Dual-write file+DB: Low confidence as an ongoing v1.1 architecture.
Reason: it increasingly conflicts with the DB-only direction of the product and is weakly verified today.

## Recommended Cut Line For v1.1

- Must fix before implementation starts:
- Keep `/api/trainer` contract stable during rollout.
- Define the authenticated automated-interview entry route explicitly.
- Prevent anonymous `associateSlug` from ever linking public sessions.
- Split associate session secret from `APP_PASSWORD`, and add token versioning tied to PIN regeneration.

- Strongly recommended inside v1.1 if readiness is meant to be trusted:
- Add a minimal DB-backed replay/repair path for readiness recompute failures.
- Treat Postgres as canonical and stop relying on file parity as the main safety story.

- Best candidates to simplify or soften for this milestone:
- Downgrade the `<400ms` curriculum requirement unless a cached question-bank manifest exists.
- Do not delete legacy global CSS utilities in Phase 14.
- Prefer canonical `skillSlug`/`questionBankPath` over substring matching for curriculum filtering.
