# Phase 19: Bulk Invite — Context

**Gathered:** 2026-04-16
**Status:** Ready for planning
**Source:** /gsd-discuss-phase --auto (all decisions auto-selected)

<domain>
## Phase Boundary

Trainer onboarding flow: paste comma/newline-separated emails → pick target cohort (curriculum auto-follows) → preview per-email actions → confirm to execute bulk invite. Each email gets a transactional magic-link invite via existing `admin.generateLink` + Resend delivery primitive from Phase 18. 50 emails per call cap.

**Out of scope:** CSV/file upload (textarea only), per-email cohort override (single cohort per batch), OAuth/SSO, re-invite UI on associate detail page (already exists from P18), curriculum editing during invite flow.

</domain>

<decisions>
## Implementation Decisions

### Email Input (INVITE-01)
- **D-01:** Trainer pastes emails into a textarea at `/trainer/onboarding`. Comma-separated AND newline-separated accepted (split on both).
- **D-02:** Live validation chips below textarea — green chip for valid email, red for malformed, yellow for duplicate within batch. Count summary: "N valid, N invalid, N duplicate".
- **D-03:** 50-email cap enforced client-side. Textarea blocks submit when >50 valid emails parsed. Clear error: "Maximum 50 emails per batch".
- **D-04:** Trainer can remove individual chips before submit (click X on chip).

### Cohort + Curriculum Assignment (INVITE-02)
- **D-05:** Single cohort dropdown (required field). All existing cohorts listed. No "none" option — bulk invite always targets a cohort.
- **D-06:** Curriculum auto-assigned from cohort's `CurriculumWeek` records. No separate curriculum picker in the invite flow.
- **D-07:** Associates already in the target cohort show as "Skip — same cohort" in preview. Associates in a different cohort show as "Reassign cohort" (will move to target cohort + re-invite).

### Preview + Confirmation (INVITE-02)
- **D-08:** Preview screen renders after trainer clicks "Preview". Table columns: Email | Action | Notes.
- **D-09:** Action types:
  - **New** — no Associate row exists; will create Associate + send magic-link invite
  - **Reassign** — Associate exists in different cohort; will move to target cohort + re-invite
  - **Skip (same cohort)** — already in target cohort; no action taken
  - **Skip (invalid)** — malformed email; filtered out
  - **Skip (recently invited)** — `lastInvitedAt` within 5 minutes; throttled
- **D-10:** Trainer can uncheck individual rows to exclude from batch before confirming. "Confirm & Send Invites" button at bottom with count of actionable rows.

### Bulk API Strategy (INVITE-03)
- **D-11:** Endpoint: `POST /api/trainer/invites/bulk`. Trainer-only (`getCallerIdentity` → `trainer` or `admin`).
- **D-12:** Request body: `{ emails: string[], cohortId: number }`. Validated with Zod.
- **D-13:** Pre-flight check: count trainer's daily invite total (from `AuthEvent` table, type `trainer-invite`, last 24h). If `remaining < actionable emails in batch`, reject entire batch with 429 and message "Would exceed daily limit ({N} remaining of 20)".
- **D-14:** Sequential per-email processing: for each actionable email → upsert Associate by email → set `cohortId` → `admin.generateLink` → Resend send → update `lastInvitedAt` → record `AuthEvent`. Each email independent — partial failures don't roll back siblings.
- **D-15:** Response body: `{ results: [{ email: string, status: 'invited' | 'reassigned' | 'skipped' | 'failed', error?: string }] }`.
- **D-16:** Client replaces preview table with result table after API returns. Status column shows color-coded badges (green=invited/reassigned, gray=skipped, red=failed).

### Claude's Discretion
- Exact chip component implementation (could reuse existing UI primitives or build minimal)
- Toast/notification pattern after bulk complete
- Whether preview data comes from a separate dry-run endpoint or is computed client-side
- Loading state during bulk processing (progress bar vs spinner)
- Exact Zod schema field names and error messages

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap + Requirements
- `.planning/ROADMAP.md` — Phase 19 section, SC 1-3
- `.planning/REQUIREMENTS.md` — INVITE-01, INVITE-02, INVITE-03

### Prior Phase Context + Code
- `.planning/phases/18-supabase-auth-install/18-CONTEXT.md` — Auth decisions: three-role model, magic-link primitive, 20/day/trainer throttle, `lastInvitedAt` 5-min throttle
- `src/app/api/trainer/associates/[id]/invite/route.ts` — Single invite endpoint (Phase 18). Bulk endpoint follows same pattern: `getCallerIdentity` → lookup → `admin.generateLink` → Resend → update `lastInvitedAt` → `recordAuthEvent`
- `src/lib/authRateLimit.ts` — Sliding-window rate limiter. Bulk endpoint reuses `checkAuthRateLimit` pattern but needs aggregate daily count check
- `src/lib/email/auth-templates.ts` — `getMagicLinkEmailHtml` template (reuse as-is for bulk invites)
- `src/app/api/auth/magic-link/route.ts` — Self-serve magic-link flow (separate from trainer-issued; reference for Resend + generateLink pattern)

### Database Schema
- `prisma/schema.prisma` — `Associate` model (email, authUserId, lastInvitedAt, cohortId), `Cohort` model, `CurriculumWeek` model, `AuthEvent` model
- `.planning/phases/17-schema-prep-email-backfill/17-01-PLAN.md` — Schema migration that added email/authUserId/lastInvitedAt columns

### Design System
- `DESIGN.md` — All UI must match design tokens

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/api/trainer/associates/[id]/invite/route.ts` — Single invite logic (generateLink + Resend + update lastInvitedAt). Bulk endpoint extracts this into a shared helper function.
- `src/lib/authRateLimit.ts` — `checkAuthRateLimit` + `recordAuthEvent`. Daily aggregate check is new but follows same pattern.
- `src/lib/email/auth-templates.ts` — `getMagicLinkEmailHtml` reused directly for each bulk invite email.
- `src/lib/supabase/admin.ts` — `supabaseAdmin` client for `admin.generateLink`.
- `src/lib/prisma.ts` — Prisma singleton for Associate/Cohort lookups.

### Established Patterns
- Route handlers use `getCallerIdentity()` for auth gating
- Zod validation on request bodies (see `src/app/api/auth/magic-link/route.ts`)
- Fire-and-forget event recording via `recordAuthEvent`
- `lastInvitedAt` updated per-invite for throttle enforcement

### Integration Points
- New route: `/trainer/onboarding` page (client component with form + preview)
- New API route: `/api/trainer/invites/bulk`
- Connects to existing Cohort data via `prisma.cohort.findMany()` for dropdown
- Connects to existing Associate data for upsert + cohort reassignment

</code_context>

<specifics>
## Specific Ideas

- Bulk endpoint wraps the single-invite primitive from Phase 18 — extract shared `inviteAssociate(email, cohortId)` helper.
- Preview can be computed entirely client-side by querying `/api/trainer` roster data (already has email + cohortId per associate) — no separate dry-run endpoint needed unless the roster grows large.
- 20/day/trainer limit checked pre-flight (aggregate from AuthEvent) so trainer knows before committing, not mid-batch.
- The `lastInvitedAt` 5-min throttle from P18 applies per-associate within the batch — recently-invited associates auto-skip.

</specifics>

<deferred>
## Deferred Ideas

- **CSV/file upload** — Textarea is sufficient for 50-email cap. File upload adds complexity (parsing, encoding) for marginal gain.
- **Per-email cohort override** — Batch = one cohort. Per-email override is a power-user feature that adds significant UI complexity.
- **Invite templates** — Customizable email subject/body per cohort. Current single template is fine for MVP.
- **Re-invite all** — Button to re-send invites to all associates who haven't logged in. Separate from bulk invite flow.
- **Invite history page** — Trainer view of all sent invites with status tracking. Currently visible via AuthEvent table but no UI.

None — discussion stayed within phase scope (deferred ideas noted above for future consideration).

</deferred>

---

*Phase: 19-bulk-invite*
*Context gathered: 2026-04-16 via /gsd-discuss-phase --auto*
