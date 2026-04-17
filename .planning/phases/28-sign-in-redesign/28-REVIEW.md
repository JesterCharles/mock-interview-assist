---
phase: 28-sign-in-redesign
reviewed: 2026-04-16T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - src/app/signin/SignInTabs.tsx
  - src/app/signin/page.tsx
  - src/app/api/auth/exchange/route.ts
  - src/app/auth/set-password/page.tsx
  - src/app/api/auth/exchange/route.test.ts
findings:
  critical: 1
  warning: 3
  info: 2
  total: 6
status: issues_found
---

# Phase 28: Code Review Report

**Reviewed:** 2026-04-16T00:00:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Five files covering the sign-in redesign: the unified sign-in page and accordion component, the auth exchange route handler (session establishment + associate linkage), the set-password page, and the exchange route's test suite.

The overall approach is solid — open-redirect protection in `safeNext`, security-blind success response for password reset, race-condition handling (P2002) on `authUserId` linkage. One critical issue: the exchange route redirects authenticated users who have not set a password to `/auth/set-password` *before* checking role, meaning a trainer who hasn't set `password_set: true` in metadata will be bounced to the set-password page on every magic-link use (including password-reset recovery). Three warnings cover a subtle open-redirect bypass, a `setTimeout` closure capturing stale user data, and missing test coverage for the `password_set: false` first-login path.

---

## Critical Issues

### CR-01: Role check skipped for non-`password_set` users including trainers

**File:** `src/app/api/auth/exchange/route.ts:72-75`

**Issue:** The `password_set` gate fires before the role branch. A trainer or admin authenticating via magic-link (e.g., after a password reset) with `password_set` absent or `false` in their metadata will be redirected to `/auth/set-password` instead of `/auth/update-password` or their dashboard. More critically, the `type === 'recovery'` check at line 64 runs *before* the `password_set` check at line 73, so the recovery redirect is correct — but `password_set` guard still intercepts any non-recovery magic-link use by a trainer whose metadata lacks the flag. This will break trainer sign-in flows in any environment where `password_set` was not backfilled.

Additionally, the `password_set` flag is set client-side in `set-password/page.tsx` via `supabase.auth.updateUser`. A user who aborts mid-flow (closes the tab after submitting the form but before the Supabase call completes) will be stuck in a redirect loop on every subsequent sign-in.

**Fix:** Move the `password_set` check inside the associate branch only, after the role branch. Trainers should never be routed through `set-password`.

```typescript
// After role check, before associate DB lookup:
if (role === 'trainer' || role === 'admin') {
  return redirectWith('/trainer');
}

// Only apply first-login gate to associates
const passwordSet = user.user_metadata?.password_set === true;
if (!passwordSet) {
  return redirectWith('/auth/set-password');
}

// Associate — authUserId linkage
```

---

## Warnings

### WR-01: Open-redirect bypass via URL-encoded double-slash

**File:** `src/app/signin/page.tsx:14-18`

**Issue:** `safeNext` rejects `//` at position 0-1 but a URL-encoded variant `/%2F...` passes the check (`raw.startsWith('//') === false`) and Next.js `redirect()` will interpret it as a protocol-relative redirect to an external host in some deployment environments. This is a low-probability bypass but is a known class of open-redirect vulnerability.

**Fix:**

```typescript
function safeNext(raw: string | undefined): string | null {
  if (!raw) return null;
  // Decode first, then check — catches %2F%2F and similar encodings
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  if (!decoded.startsWith('/') || decoded.startsWith('//')) return null;
  return raw; // return original (Next.js redirect handles encoding)
}
```

### WR-02: Stale user data captured in `setTimeout` closure

**File:** `src/app/auth/set-password/page.tsx:70-94`

**Issue:** After calling `supabase.auth.updateUser()` at line 56, the code fetches the user again at line 70 *inside* `handleSubmit` but *outside* the `setTimeout` callback. The `role` variable is closed over by the `setTimeout` callback. If the `getUser` call fails silently or returns `null` (e.g., network blip post-update), `role` will be `undefined` and the user will be redirected to `/` silently. There is no error handling around the post-update `getUser`.

More directly: `getUser` is called at line 70 before `setTimeout` fires, meaning the 1500ms delay does not help with any race — but `role` is already resolved. The structure is fine but there's no guard if `user` is `null` at line 71. `user?.user_metadata?.role` will produce `undefined` without any indication to the user.

**Fix:**

```typescript
setStatus('success');

const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  // Session lost after update — send to sign-in
  setTimeout(() => router.replace('/signin'), 1500);
  return;
}
const role = user.user_metadata?.role as string | undefined;

setTimeout(async () => {
  // ... rest of redirect logic
}, 1500);
```

### WR-03: Test suite does not cover the `password_set: false` first-login redirect

**File:** `src/app/api/auth/exchange/route.test.ts`

**Issue:** Every test in the suite defaults `password_set: true` in the mocked user metadata (set in `beforeEach` at line 66-70). There is no test asserting that a user with `password_set: false` (or absent) is redirected to `/auth/set-password`. This is the primary new behavior introduced by this phase and it has zero coverage. A regression here would silently break first-login UX for all associates.

**Fix:** Add the following test case:

```typescript
it('redirects to /auth/set-password when password_set is false', async () => {
  mockGetUser.mockResolvedValue({
    data: {
      user: {
        id: 'u1',
        email: 'new@test.com',
        user_metadata: { role: 'associate', password_set: false },
      },
    },
  });
  const res = await GET(makeRequest({ access_token: 'at', refresh_token: 'rt' }));
  expect(getRedirectPath(res)).toBe('/auth/set-password');
});
```

---

## Info

### IN-01: Magic-link flow returns non-specific error for unregistered emails

**File:** `src/app/signin/SignInTabs.tsx:148-158`

**Issue:** The associate magic-link handler at line 149 checks `!res.ok` and shows a generic "Something went wrong" error. However, if the `/api/auth/magic-link` endpoint distinguishes between "email not found" (404) and server error (500), this surface hides actionable information. For associate login, a user who types the wrong email gets no hint. This is a UX friction point, not a bug — flagging as info since the current behavior is deliberate for some flows (reset endpoints intentionally mask existence). Evaluate whether magic-link should follow the same policy.

### IN-02: `inputBase` style object duplicated across two files

**File:** `src/app/signin/SignInTabs.tsx:12-23`, `src/app/auth/set-password/page.tsx:7-18`

**Issue:** The `inputBase` style object is copy-pasted verbatim in both files. Any future change (border style, font, padding) must be made in two places.

**Fix:** Extract to a shared location, e.g., `src/lib/ui/styles.ts` or a shared component:

```typescript
// src/lib/ui/styles.ts
export const inputBase: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  fontSize: '14px',
  color: 'var(--ink)',
  backgroundColor: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif",
};
```

---

_Reviewed: 2026-04-16T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
