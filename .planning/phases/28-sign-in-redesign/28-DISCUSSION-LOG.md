# Phase 28: Sign-in Redesign - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-16
**Phase:** 28-sign-in-redesign
**Areas discussed:** Button expand behavior, First-login detection, Password upgrade UX, Visual style

---

## Button Expand Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Accordion collapse | Clicked button expands form below. Other button stays visible but dims. Clicking other swaps. | ✓ |
| Other hides | Clicked button expands. Other fades out. Back link to return. | |
| Slide transition | Both visible. Form slides in below clicked button. Other pushes down. | |

**User's choice:** Accordion collapse
**Notes:** Both buttons always visible. Expanded one shows form, other dims.

| Option | Description | Selected |
|--------|-------------|----------|
| Smooth height transition | CSS transition ~200ms ease | ✓ |
| Instant | No animation | |

**User's choice:** Smooth height transition

---

## First-Login Detection

| Option | Description | Selected |
|--------|-------------|----------|
| Supabase user_metadata flag | Set `password_set: true` in metadata. No DB migration. | ✓ |
| Associate DB field | Add `passwordSetAt` to Associate model. Requires migration. | |

**User's choice:** Initially wanted Profile table, but agreed to use user_metadata for Phase 28 and defer Profile table to Phase 28.1.
**Notes:** User suggested a Profile table for metadata, profile page, github/email, update password. This was captured as a deferred idea (Phase 28.1) since it's a new capability beyond sign-in redesign scope.

---

## Password Upgrade UX

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect to /auth/set-password | Dedicated page. Blocks access until set. | ✓ |
| Inline banner on dashboard | Persistent banner, non-blocking. | |
| Modal on first load | Modal overlay, must complete or skip. | |

**User's choice:** Redirect to /auth/set-password

| Option | Description | Selected |
|--------|-------------|----------|
| Their dashboard | Direct to home after password set. Already authenticated. | ✓ |
| Back to /signin | Redirect to sign-in to use new password. | |

**User's choice:** Their dashboard

| Option | Description | Selected |
|--------|-------------|----------|
| Mandatory | Must set password. Blocks until completed. | ✓ |
| Skippable with reminder | Skip for now, re-prompted next magic-link login. | |
| Skippable once | Skip once, never prompted again. | |

**User's choice:** Mandatory

---

## Visual Style

| Option | Description | Selected |
|--------|-------------|----------|
| Outlined with icon | Ghost/outlined buttons with lucide icons. Active gets accent fill. | ✓ |
| Filled buttons | Primary accent fill, secondary surface-muted fill. | |
| Text-only stacked | No button chrome. Text links with separator. | |

**User's choice:** Outlined with lucide icons (Mail, KeyRound)

| Option | Description | Selected |
|--------|-------------|----------|
| Lucide icons | Mail + KeyRound from lucide-react. Monochrome --ink color. | ✓ |
| You decide | Claude picks. | |

**User's choice:** Lucide icons

---

## Claude's Discretion

- Exact CSS transition implementation
- Whether to share password form component between update-password and set-password
- Form field layout within accordion sections
- Edge case handling for missing password_set metadata

## Deferred Ideas

- Profile table + profile page (Phase 28.1) — user explicitly requested this as a separate phase
- Associate password sign-in option — future consideration after all associates have passwords
