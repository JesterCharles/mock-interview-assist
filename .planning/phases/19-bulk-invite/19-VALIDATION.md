---
phase: 19
slug: bulk-invite
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-16
---

# Phase 19 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npm run test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 19-01-01 | 01 | 1 | INVITE-01 | — | Email validation rejects malformed input | unit | `npx vitest run src/lib/emailParser.test.ts` | ❌ W0 | ⬜ pending |
| 19-01-02 | 01 | 1 | INVITE-01 | — | 50-email cap enforced | unit | `npx vitest run src/lib/emailParser.test.ts` | ❌ W0 | ⬜ pending |
| 19-02-01 | 02 | 1 | INVITE-02 | — | Preview computes correct actions per email | unit | `npx vitest run src/lib/bulkInvitePreview.test.ts` | ❌ W0 | ⬜ pending |
| 19-02-02 | 02 | 1 | INVITE-02 | — | Cohort assignment applied to all actionable emails | unit | `npx vitest run src/lib/bulkInvitePreview.test.ts` | ❌ W0 | ⬜ pending |
| 19-03-01 | 03 | 2 | INVITE-03 | T-19-01 | Daily limit pre-flight rejects over-quota batches | integration | `npx vitest run src/app/api/trainer/invites/bulk/route.test.ts` | ❌ W0 | ⬜ pending |
| 19-03-02 | 03 | 2 | INVITE-03 | T-19-02 | Partial failures don't roll back siblings | integration | `npx vitest run src/app/api/trainer/invites/bulk/route.test.ts` | ❌ W0 | ⬜ pending |
| 19-03-03 | 03 | 2 | INVITE-03 | T-19-03 | lastInvitedAt throttle blocks re-invite within 5 min | integration | `npx vitest run src/app/api/trainer/invites/bulk/route.test.ts` | ❌ W0 | ⬜ pending |
| 19-03-04 | 03 | 2 | INVITE-03 | — | Result table returned with per-email status | integration | `npx vitest run src/app/api/trainer/invites/bulk/route.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/emailParser.test.ts` — stubs for INVITE-01 (email parsing, validation, dedup, 50-cap)
- [ ] `src/lib/bulkInvitePreview.test.ts` — stubs for INVITE-02 (preview action computation)
- [ ] `src/app/api/trainer/invites/bulk/route.test.ts` — stubs for INVITE-03 (bulk API, rate limits, partial failures)

*Existing infrastructure covers framework + fixtures.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Email chip UI renders correctly | INVITE-01 | Visual component behavior | Navigate to `/trainer/onboarding`, paste mixed valid/invalid emails, verify chip colors |
| Magic link email received | INVITE-03 | Requires Resend delivery | Send test invite, check inbox for branded email |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
