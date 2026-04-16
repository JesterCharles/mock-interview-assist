---
phase: 19-bulk-invite
verified: 2026-04-16T06:23:25Z
status: human_needed
score: 5/6 must-haves automated-verified
human_verification:
  - test: "Full end-to-end bulk invite flow at /trainer/onboarding"
    expected: |
      1. Page loads with 'Bulk Invite' title and subtitle
      2. Paste 'valid@test.com, invalid-email, valid@test.com, another@test.com'
         → 2 green chips, 1 red chip, 1 yellow chip
         → Count summary: "2 valid · 1 invalid · 1 duplicate"
      3. Click X on a chip → removed, counts update, former duplicate promoted to valid
      4. Select cohort from dropdown → 'Preview Invites' button enables
      5. Click 'Preview Invites' → preview table shows per-email actions (New/Reassign/Skip rows)
         → New/Reassign rows have active checkboxes; Skip rows have disabled checkboxes
      6. Click 'Back to Edit' → textarea content and cohort selection preserved
      7. (If Resend key available) Click 'Confirm' → result table with color badges + toast
         → Success toast: 'All invites sent.' OR partial-failure toast with failed count
    why_human: "Visual chip colors, table interactions, checkbox behavior, toast firing, and redirect chain after magic-link click-through cannot be verified programmatically"
---

# Phase 19: Bulk Invite Verification Report

**Phase Goal:** Trainer can onboard a cohort by pasting 1-50 emails and triggering transactional magic-link invites with curriculum auto-assignment.
**Verified:** 2026-04-16T06:23:25Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Trainer pastes comma- or newline-separated emails at `/trainer/onboarding`; malformed/duplicate emails surface as inline chips before submit | ✓ VERIFIED | `emailParser.ts` exports `parseEmails` splitting on `/[\s,]+/`, classifying valid/invalid/duplicate; `EmailChipInput.tsx` renders chips with semantic colors (`#E8F5EE`, `#FDECEB`, `#FEF3E0`); 16/16 `emailParser.test.ts` tests pass |
| 2 | Submissions over 50 emails are blocked with a clear error message | ✓ VERIFIED | `isOverCap(chips, 50)` in `emailParser.ts`; `EmailChipInput.tsx` renders "Maximum 50 emails per batch. Remove {N} to continue."; bulk route has `z.array(z.string().email()).max(50)`; Preview Invites button disabled when over cap |
| 3 | Preview screen shows per-email action (new / reassign cohort / skip-same-cohort / skip-invalid) before execution | ✓ VERIFIED | `classifyEmails` in `bulkInvitePreview.ts` returns all 5 action types; 9/9 `bulkInvitePreview.test.ts` tests pass; `BulkPreviewTable.tsx` renders action badges; `page.tsx` transitions to `screen === 'preview'` |
| 4 | `/api/trainer/invites/bulk` runs per-email transactions; partial failures do not roll back siblings; response is a result table with per-email status | ✓ VERIFIED | `bulk/route.ts` has sequential `for (const email of emails)` loop with try/catch per email; 18/18 integration tests pass including partial-failure isolation test; response shape `{ results: [{ email, status, error? }] }` confirmed |
| 5 | Re-invite throttle (`lastInvitedAt` < 5 min) blocks repeat sends with a clear message | ✓ VERIFIED | `inviteHelper.ts`: `THROTTLE_MS = 5 * 60 * 1000`, returns `{ status: 'skipped', error: 'Recently invited -- throttled' }`; 429 from bulk route surfaces via `setApiError` in `page.tsx` with banner at line 292 |
| 6 | New invitee receives a Resend-delivered magic link that lands them on `/associate/[slug]/dashboard` after click-through | ? HUMAN NEEDED | `inviteHelper.ts` calls `supabaseAdmin.auth.admin.generateLink` + Resend send; `exchange/route.ts` line 121 redirects to `/associate/${assoc.slug}/dashboard`; dashboard stub at `src/app/associate/[slug]/dashboard/page.tsx` exists and redirects to `/associate/${slug}`. Email delivery and click-through redirect chain require live Resend key + human verification |

**Score:** 5/6 truths automated-verified (SC 6 partial — code path verified, email delivery needs human)

### Deferred Items

Items not yet met but explicitly addressed in later milestone phases.

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | `/associate/[slug]/dashboard` is a redirect shim, not a real dashboard | Phase 23 | REQUIREMENTS.md ASELF-01: "New route `/associate/[slug]/dashboard`... replaces stub shim" |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/emailParser.ts` | parseEmails + removeChip pure functions | ✓ VERIFIED | Exports: `parseEmails`, `getChipSummary`, `isOverCap`, `removeChip`, `ChipState`, `ParsedEmail` |
| `src/lib/emailParser.test.ts` | Unit tests, min 40 lines | ✓ VERIFIED | 142 lines, 16 passing tests |
| `src/app/trainer/onboarding/EmailChipInput.tsx` | Textarea + chip list + count summary | ✓ VERIFIED | 'use client', imports `parseEmails`, renders chips with semantic colors, aria-labels, cap error |
| `src/app/trainer/onboarding/page.tsx` | Full onboarding page with 3-screen state machine | ✓ VERIFIED | 'use client', Screen type, imports all 4 sub-components, fetches /api/cohorts + /api/trainer/associates, posts to /api/trainer/invites/bulk, toast wired |
| `src/app/trainer/onboarding/BulkPreviewTable.tsx` | Preview table with checkboxes and action badges | ✓ VERIFIED | 'Confirm & Send', `#E8F5EE`, Back to Edit, isSending prop |
| `src/app/trainer/onboarding/BulkResultTable.tsx` | Result table with status badges | ✓ VERIFIED | 'Invite More' button present |
| `src/app/trainer/onboarding/CohortDropdown.tsx` | Cohort select dropdown | ✓ VERIFIED | 'Select a cohort' placeholder, no-cohorts error message |
| `src/lib/bulkInvitePreview.ts` | Client-side preview classification logic | ✓ VERIFIED | Exports `classifyEmails`, `PreviewAction`, `PreviewRow`; all 5 action types implemented |
| `src/lib/bulkInvitePreview.test.ts` | Unit tests, min 30 lines | ✓ VERIFIED | 137 lines, 9 passing tests |
| `src/lib/inviteHelper.ts` | Shared inviteAssociate function | ✓ VERIFIED | Exports `inviteAssociate`, `InviteResult`, `generateSlug`; full pipeline: findUnique → throttle → cohort-check → generateLink → Resend → lastInvitedAt → recordAuthEvent |
| `src/app/api/trainer/invites/bulk/route.ts` | POST /api/trainer/invites/bulk endpoint | ✓ VERIFIED | Auth gate, Zod validation, cohort check, 20/day pre-flight, sequential processing, partial failure isolation |
| `src/app/api/trainer/invites/bulk/route.test.ts` | Integration tests, min 60 lines | ✓ VERIFIED | 199 lines, 18 passing tests |
| `src/app/associate/[slug]/dashboard/page.tsx` | Dashboard stub — redirect shim | ✓ VERIFIED (intentional shim) | Redirects to `/associate/${slug}`; Phase 23 replaces with real content |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `EmailChipInput.tsx` | `emailParser.ts` | `import { parseEmails, ParsedEmail }` | ✓ WIRED | Line 3: `import { parseEmails, isOverCap, removeChip, ParsedEmail }` |
| `page.tsx` | `/api/trainer/invites/bulk` | fetch POST on confirm | ✓ WIRED | Line 106: `fetch('/api/trainer/invites/bulk', ...)` |
| `page.tsx` | `/api/trainer/associates` | fetch GET for roster | ✓ WIRED | Line 65: `fetch('/api/trainer/associates')` |
| `page.tsx` | `EmailChipInput.tsx` | import EmailChipInput | ✓ WIRED | Line 5: `import { EmailChipInput } from './EmailChipInput'` |
| `bulkInvitePreview.ts` | `emailParser.ts` | import ParsedEmail type | ✓ WIRED | Line 1: `import type { ParsedEmail } from '@/lib/emailParser'` |
| `bulk/route.ts` | `inviteHelper.ts` | import inviteAssociate | ✓ WIRED | Line 5: `import { inviteAssociate } from '@/lib/inviteHelper'` |
| `bulk/route.ts` | `prisma.authEvent.count` | DB count for daily limit | ✓ WIRED | Line 56: `await prisma.authEvent.count(...)` |
| `inviteHelper.ts` | `supabaseAdmin.auth.admin.generateLink` | Supabase admin SDK | ✓ WIRED | Line 110: `await supabaseAdmin.auth.admin.generateLink(...)` |
| `exchange/route.ts` | `/associate/[slug]/dashboard/page.tsx` | redirect to /associate/${slug}/dashboard | ✓ WIRED | Line 121: `redirectWith('/associate/${assoc.slug}/dashboard')` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `page.tsx` | `cohorts` | `fetch('/api/cohorts')` → `setCohorts` | Yes — live DB-backed API | ✓ FLOWING |
| `page.tsx` | `roster` | `fetch('/api/trainer/associates')` → `setRoster` | Yes — live DB-backed API with `lastInvitedAt` | ✓ FLOWING |
| `page.tsx` | `results` | `POST /api/trainer/invites/bulk` → `setResults` | Yes — real per-email processing results | ✓ FLOWING |
| `BulkPreviewTable.tsx` | `rows` | `classifyEmails(chips, roster, cohortId, cohorts)` in `page.tsx` | Yes — derived from live roster fetch | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| emailParser correctly classifies emails | `npx vitest run src/lib/emailParser.test.ts` | 16/16 pass | ✓ PASS |
| bulkInvitePreview classifies all 5 action types | `npx vitest run src/lib/bulkInvitePreview.test.ts` | 9/9 pass | ✓ PASS |
| bulk route: auth, validation, rate limit, processing | `npx vitest run .../bulk/route.test.ts` | 18/18 pass | ✓ PASS |
| TypeScript compilation clean | `npx tsc --noEmit` | 0 errors | ✓ PASS |
| Full test suite | `npm run test` | 395/395 pass (4 skipped) | ✓ PASS |
| UI end-to-end flow | Manual browser test | Not yet run | ? SKIP (needs human) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| INVITE-01 | 19-01, 19-02 | Live validation chips, 50-cap, malformed/duplicate flagging | ✓ SATISFIED | `emailParser.ts`, `EmailChipInput.tsx`, `isOverCap` check in page, Zod max(50) in route |
| INVITE-02 | 19-02 | Preview screen with per-email action, cohort auto-assignment on confirm | ✓ SATISFIED | `classifyEmails` + `BulkPreviewTable` + 3-screen state machine; cohortId sent in bulk POST |
| INVITE-03 | 19-03 | Bulk API: per-email transaction, partial failure isolation, `lastInvitedAt` throttle, result table | ✓ SATISFIED | `bulk/route.ts` sequential loop, try/catch isolation, `inviteHelper.ts` throttle, result array response |

No orphaned requirements — all 3 IDs (INVITE-01, INVITE-02, INVITE-03) from REQUIREMENTS.md Phase 19 are claimed and satisfied.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/app/associate/[slug]/dashboard/page.tsx` | 9 | `redirect('/associate/${slug}')` — shim, not real dashboard | ℹ️ Info | Intentional forward-compat shim per plan; Phase 23 (ASELF-01) replaces with real dashboard. Not a blocker for Phase 19 goals. |

### Human Verification Required

#### 1. End-to-End Bulk Invite Flow

**Test:** Sign in as trainer at `/signin`, navigate to `/trainer/onboarding`, and exercise the full 3-screen flow.

**Detailed steps:**
1. Paste `valid@test.com, invalid-email, valid@test.com, another@test.com`
2. Verify: 2 green chips (valid), 1 red chip (invalid), 1 yellow chip (duplicate)
3. Verify count summary: "2 valid · 1 invalid · 1 duplicate"
4. Remove a chip via X button — verify counts update and former duplicate promotes to valid
5. Select a cohort → click "Preview Invites" → verify table loads with action classifications
6. Verify New/Reassign rows have active checkboxes; Skip rows are disabled
7. Click "Back to Edit" — verify textarea content and cohort selection are preserved
8. (If Resend test key available) Confirm → verify result table with colored badges + toast fires

**Expected:** All steps produce the described behavior with correct visual styling per DESIGN.md tokens.

**Why human:** Chip semantic colors, checkbox interaction states, toast animation, and magic-link email delivery + redirect chain require live browser and Resend credentials.

### Gaps Summary

No automated gaps. All 6 success criteria are either fully verified by code inspection + tests (SC 1-5) or have the correct code path in place with email delivery requiring a live Resend key (SC 6). The dashboard stub is an intentional shim explicitly deferred to Phase 23.

Status is `human_needed` because the end-to-end UI flow (Task 4 in Plan 02) requires a trainer to manually confirm visual behavior and interaction states in a browser.

---

_Verified: 2026-04-16T06:23:25Z_
_Verifier: Claude (gsd-verifier)_
