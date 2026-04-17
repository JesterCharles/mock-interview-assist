---
phase: 32-shell-overhaul
plan: 04
subsystem: profile-security
tags: [password-security, reauthentication, supabase-auth, otp, profile]
dependency_graph:
  requires: [32-02]
  provides: [password-re-verification, otp-flow]
  affects: [ProfileTabs, security-tab]
tech_stack:
  added: []
  patterns: [signInWithPassword-re-auth, reauthenticate-otp, two-step-verification]
key_files:
  created: []
  modified:
    - src/app/profile/ProfileTabs.tsx
decisions:
  - "Two-path verification: password users use signInWithPassword, magic-link users use reauthenticate() + verifyOtp()"
  - "verificationStep state ('verify' | 'update') gates new password fields behind successful verification"
  - "hasPasswordSet detected via user_metadata.password_set from supabase.auth.getUser() on tab mount"
  - "verificationStep resets to 'verify' after successful password change so next change requires re-verification"
  - "Rate limit errors from Supabase displayed verbatim per Pitfall 6 from RESEARCH"
metrics:
  duration: ~10min
  completed: 2026-04-16
  tasks_completed: 1
  files_modified: 1
---

# Phase 32 Plan 04: Password Re-verification Security Summary

**One-liner:** Security tab now gates password updates behind old-password verification (Path A) or email OTP (Path B) per D-14, eliminating direct updateUser without identity confirmation.

## What Was Built

Per D-14, RESEARCH patterns, and STRIDE T-32-05/T-32-06:

**ProfileTabs.tsx — Security tab overhaul:**

1. **New state** — `oldPassword`, `hasPasswordSet` (null=loading), `verificationStep` ('verify'|'update'), `otpSent`, `otpCode`, `otpError`

2. **Detection useEffect** — fires when `activeTab === 'security'`, calls `supabase.auth.getUser()` and reads `user_metadata.password_set` to set `hasPasswordSet`

3. **Path A (password users, `hasPasswordSet === true`)** — shows "Current password" field; on submit calls `signInWithPassword({ email, password: oldPassword })`; on error shows "Current password is incorrect."; on success sets `verificationStep = 'update'`

4. **Path B (magic-link users, `hasPasswordSet === false`)** — shows "Send verification email" button; calls `supabase.auth.reauthenticate()` which sends OTP; shows 6-digit OTP input (centered, letter-spaced, `inputMode="numeric"`); calls `supabase.auth.verifyOtp({ email, token, type: 'email' })`; on success sets `verificationStep = 'update'`

5. **Update step** — shown only after verification passes; existing new-password + confirm-password fields + `updateUser({ password })`; resets `verificationStep` to `'verify'` after success so next change requires re-verification

6. **Loading state** — while `hasPasswordSet === null`, shows "Checking…" inline

7. **Rate limit handling** — Supabase error messages displayed verbatim; no auto-retry

## Commits

| Task | Commit | Files |
|------|--------|-------|
| Task 1: Password re-verification in Security tab | d5205cc | ProfileTabs.tsx |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — changes are purely client-side Supabase auth API calls. No new API surface introduced. Mitigates T-32-05 (spoofing via password change without old password) and T-32-06 (password set for magic-link user without verification).

## Self-Check

### Files Exist
- `src/app/profile/ProfileTabs.tsx` — contains `signInWithPassword`, `reauthenticate`, `verifyOtp`, `verificationStep` state, `hasPasswordSet` useEffect

### Commits Exist
- d5205cc — verified via git log

## Self-Check: PASSED
