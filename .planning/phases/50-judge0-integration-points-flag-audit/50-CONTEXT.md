# Phase 50: Judge0 Integration Points + Flag Audit - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning
**Mode:** `--auto`

<domain>
## Phase Boundary

Phase 50 **flag-darks the entire coding-challenge stack** for v1.5 prod while preserving all integration points for v1.6 Judge0 drop-in. Every `src/lib/judge0*` + `src/app/api/coding/*` + `src/app/coding/*` call site checks `CODING_CHALLENGES_ENABLED` and returns a friendly "coming soon" response when off. The v1.4 GCE Judge0 terraform is relabeled as a v1.6 reference template; a disabled Cloud Run VPC connector stub is committed for v1.6.

**In scope:** Flag-check wrapper (`isCodingEnabled()` helper), short-circuit every Judge0 call site, gap-score hook short-circuit, `/coding` UI "coming soon" state, `iac/cloudrun/judge0.tf.disabled` stub, `iac/gce-judge0/README.md` relabel, vitest coverage for flag-off and flag-on paths.

**Out of scope:** Judge0 VM provisioning, real Judge0 integration testing, VPC connector deployment (all deferred to v1.6).

</domain>

<decisions>
## Implementation Decisions

### Flag Plumbing (JUDGE-INTEG-01)
- **D-01:** `CODING_CHALLENGES_ENABLED` secret already exists in Phase 45 D-09 list. Phase 50 sets its **value** in Secret Manager: `false` in `nlm-prod`, `true` in `nlm-staging-493715` (so staging stays usable for dev/testing). Flag mounted into Cloud Run env per Phase 47 D-06.
- **D-02:** Helper `src/lib/codingFeatureFlag.ts` exports `isCodingEnabled(): boolean` which reads `process.env.CODING_CHALLENGES_ENABLED === 'true'`. Single source of truth; no scattered string comparisons.
- **D-03:** `JUDGE0_URL` and `JUDGE0_AUTH_TOKEN` secrets exist in Phase 45 D-09 list. Phase 50 populates placeholder values: `JUDGE0_URL=http://placeholder.invalid` + `JUDGE0_AUTH_TOKEN=placeholder-will-be-set-in-v1.6`. Ensures env-var mount doesn't 500 at boot.

### Short-Circuit Call Sites (JUDGE-INTEG-02)
- **D-04:** Call sites discovered via grep:
  - **API routes**: `src/app/api/coding/submit/route.ts`, `src/app/api/coding/challenges/[id]/route.ts`, `src/app/api/coding/bank/route.ts`, `src/app/api/coding/attempts/[id]/route.ts`, `src/app/api/trainer/[slug]/coding/route.ts`
  - **Client components**: `src/app/coding/page.tsx`, `src/app/coding/[challengeId]/page.tsx`, `src/components/coding/SubmitBar.tsx`
  - **Services + hooks**: `src/lib/judge0Client.ts` (thin Judge0 HTTP client), `src/lib/codingSignalService.ts` (gap-score hook from Phase 41), `src/lib/codingAttemptPoll.ts`, `src/hooks/usePollAttempt.ts`, `src/hooks/useChallengeList.ts`.
- **D-05:** Short-circuit pattern per layer:
  - **API routes**: When `!isCodingEnabled()`, return `Response.json({ enabled: false, message: "Coding challenges coming soon. Check back later!" }, { status: 503 })`. Status 503 (Service Unavailable) is technically appropriate for feature-dark; clients get a structured body to render.
  - **Client pages/components**: When `process.env.NEXT_PUBLIC_CODING_CHALLENGES_ENABLED !== 'true'`, render a "Coming soon" card (uses existing design tokens from DESIGN.md). A new `NEXT_PUBLIC_CODING_CHALLENGES_ENABLED` secret is added... **but this adds to Phase 45's secret list**. Alternative: read the server-side flag via a tiny `/api/coding/status` endpoint that returns `{enabled: boolean}`. Pick **the endpoint approach** to avoid client-side env-var bloat and because `NEXT_PUBLIC_*` bakes into the bundle at build time (changing the flag requires rebuild, defeating the purpose).
  - **Services**: `judge0Client.ts` already has HTTP calls; add a check at the top of every exported function that throws `CodingFeatureDisabledError` if `!isCodingEnabled()`. Callers (API routes) catch this + return "coming soon".
  - **Gap-score hook** (`codingSignalService.ts`): wrap the write in `if (isCodingEnabled()) { ... }`. When off, no-op silently.

### `/api/coding/status` Endpoint
- **D-06:** New route `src/app/api/coding/status/route.ts`: `GET` returns `{ enabled: boolean }` — does NOT require auth (it's a feature-availability probe). Used by `/coding` page + `SubmitBar.tsx` to conditionally render.
- **D-07:** Status endpoint response cached for 60s via `Cache-Control: public, s-maxage=60` (limits load on Cloud Run if traffic spikes).

### UI "Coming Soon" State
- **D-08:** New component `src/components/coding/CodingComingSoon.tsx` — renders a centered card with: headline "Coding Challenges Coming Soon", body copy "We're building an in-browser coding environment. Check back in a few weeks.", back-to-dashboard link. Uses existing `src/app/globals.css` design tokens. Reused by `/coding` + `/coding/[id]`.
- **D-09:** Trainer coding admin surfaces (`/trainer/[slug]/coding/*`) follow the same pattern — flag-gated. Trainer sees the same "coming soon" card (no admin bypass — reduces surface area).

### v1.6 Terraform Stub (JUDGE-INTEG-03)
- **D-10:** File `iac/cloudrun/judge0.tf.disabled` — literal `.disabled` extension means Terraform ignores it. Contents: commented HCL describing v1.6 VPC connector + private IP range + firewall rule + Judge0 Compute Engine VM + Cloud Run VPC egress config. Also a `## Activation` section with step-by-step instructions for v1.6.
- **D-11:** No provider blocks in `.disabled` file (would cause state conflicts if renamed). Resources only.

### v1.4 Reference Labeling (JUDGE-INTEG-04)
- **D-12:** Rename `infra/terraform/` to `iac/gce-judge0/` (git mv to preserve history). Update path references in any markdown. Per CONTEXT D-01 from Phase 45 this relabel was deferred to Phase 50.
- **D-13:** Rewrite `iac/gce-judge0/README.md` top-of-file: "**⚠ REFERENCE TEMPLATE — NOT ACTIVE INFRASTRUCTURE.** This directory captures the v1.4 GCE Judge0 layout for future reference. v1.5 uses `iac/cloudrun/` (Cloud Run). This code is NOT applied by the v1.5 CI/CD pipeline." Then retain existing content below.
- **D-14:** Add `iac/gce-judge0/.terraform.lock.hcl` to `.gitignore` (if present). Remove any symlinks pointing into the old path.

### Tests
- **D-15:** New tests:
  - `src/lib/__tests__/codingFeatureFlag.test.ts` — unit tests for `isCodingEnabled()` with env var matrix (true, false, undefined, "TRUE", garbage).
  - Extend `src/app/api/coding/submit/route.test.ts` + adjacent route tests — assert 503 + "coming soon" body when flag off, assert normal pass-through when flag on.
  - `src/lib/__tests__/judge0Client.test.ts` already exists — extend to assert `CodingFeatureDisabledError` thrown when flag off.
  - `src/components/coding/SolveWorkspace.test.tsx` already exists — extend to assert "coming soon" UI renders when status endpoint returns `enabled: false`.

### Claude's Discretion
- Exact copy of "coming soon" card (headline + body copy).
- Cache TTL for `/api/coding/status` (60s recommended; 30-120 is fine).
- Whether to mark `judge0Client.ts` functions `@deprecated` or just add the flag check.
- `iac/cloudrun/judge0.tf.disabled` content verbosity — planner decides the scope.

### Folded Todos
None.

</decisions>

<canonical_refs>
## Canonical References

- `.planning/REQUIREMENTS.md` §JUDGE-INTEG (01-04)
- `.planning/ROADMAP.md` §Phase 50
- `.planning/phases/45-*/45-CONTEXT.md` (D-09 secret list — includes JUDGE0_URL, JUDGE0_AUTH_TOKEN, CODING_CHALLENGES_ENABLED; D-01 infra/terraform/ untouched — Phase 50 is the relabel)
- `.planning/phases/47-*/47-CONTEXT.md` (D-06 env-var mount pattern)
- `.planning/milestones/v1.4-ROADMAP.md` (archived — where the coding stack was built)
- Existing code: `src/lib/judge0Client.ts`, `src/lib/codingSignalService.ts`, `src/lib/codingAttemptPoll.ts`, `src/hooks/usePollAttempt.ts`, `src/app/api/coding/**`, `src/app/coding/**`, `src/components/coding/*`
- DESIGN.md (UI tokens for ComingSoon card)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/judge0Errors.ts` — custom error classes already exist; extend with `CodingFeatureDisabledError`.
- Existing vitest test files for coding layer — extend rather than create new.
- Design tokens in `src/app/globals.css` — reused by ComingSoon card.

### Established Patterns
- API routes use `NextResponse.json()` / `Response.json()` pattern.
- Feature flags: none established. Phase 50 sets the precedent.

### Integration Points
- Phase 49 k6 load test already assumes flag-off (`D-02: 0% /api/coding/* traffic during CODING_CHALLENGES_ENABLED=false`).
- Phase 48 `/api/metrics` pattern (feature-flagged) is analogous.

</code_context>

<specifics>
## Specific Ideas

- **Never break the existing coding features during v1.6** — Phase 50 is pure guard insertion; no feature removal.
- **Status endpoint, not bundled env var** — because flipping the flag in v1.6 must NOT require a rebuild + redeploy.
- **Prod flag default `false`** — explicit per success criterion 1.
- **Trainer admin also flag-gated** — no special admin bypass.

</specifics>

<deferred>
## Deferred Ideas

- **Actual v1.6 Judge0 enable path** — documented in `judge0.tf.disabled` but not executed.
- **Multiple feature flags** (e.g., analytics, beta features) — Phase 50 establishes the single-flag precedent; generalization to a flag service deferred.
- **Client-side flag hydration via React context** — for now, direct fetch from `/api/coding/status` is sufficient.

### Reviewed Todos (not folded)
None.

</deferred>

---

*Phase: 50-judge0-integration-points-flag-audit*
*Context gathered: 2026-04-18 (auto mode)*
