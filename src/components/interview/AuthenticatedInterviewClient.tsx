'use client';

interface AuthenticatedInterviewClientProps {
  /** Server-resolved associate slug — NEVER trust client cookie parsing. */
  associateSlug: string;
  /** Server-resolved numeric associate id — the identity Phase 10's completion route will receive. */
  associateId: number;
}

const tokens = {
  bg: '#F5F0E8',
  surface: '#FFFFFF',
  ink: '#1A1A1A',
  muted: '#7A7267',
  accent: '#C85A2E',
  border: '#DDD5C8',
  surfaceMuted: '#F0EBE2',
} as const;

/**
 * Minimal authenticated automated-interview shell (Plan 09-03, D-26).
 *
 * Identity (`associateSlug`, `associateId`) is passed server-side as props.
 * The client NEVER re-derives identity from cookies — that is the attack
 * surface Codex #2 specifically called out.
 *
 * Phase 10 wires this shell to `/api/associate/interview/complete` to carry
 * the server-provided identity through to persistence. The full interview UI
 * (currently at `src/app/page.tsx`) remains untouched in this phase to keep
 * scope bounded per the plan's explicit guidance.
 */
export function AuthenticatedInterviewClient({
  associateSlug,
  associateId,
}: AuthenticatedInterviewClientProps) {
  return (
    <div
      data-authenticated-interview-shell
      data-associate-slug={associateSlug}
      data-associate-id={associateId}
      style={{
        minHeight: '100vh',
        backgroundColor: tokens.bg,
        padding: '48px 24px',
        fontFamily: "'DM Sans', sans-serif",
        color: tokens.ink,
      }}
    >
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <p
          style={{
            fontSize: '11px',
            fontFamily: "'JetBrains Mono', monospace",
            color: tokens.muted,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            margin: '0 0 8px 0',
          }}
        >
          automated interview
        </p>
        <h1
          style={{
            fontFamily: "'Clash Display', sans-serif",
            fontSize: '48px',
            fontWeight: 600,
            margin: '0 0 12px 0',
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
          }}
        >
          Ready, {associateSlug}?
        </h1>
        <p
          style={{
            fontSize: '16px',
            color: tokens.muted,
            lineHeight: 1.5,
            margin: '0 0 32px 0',
          }}
        >
          Your identity is verified. The adaptive interview engine wires up in
          the next phase — when you complete a session, results will be saved
          against your profile automatically.
        </p>

        <div
          style={{
            backgroundColor: tokens.surface,
            border: `1px solid ${tokens.border}`,
            borderRadius: '12px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: '12px',
              borderBottom: `1px solid ${tokens.border}`,
            }}
          >
            <span style={{ fontSize: '13px', color: tokens.muted }}>Signed in as</span>
            <span
              style={{
                fontSize: '13px',
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 600,
                color: tokens.ink,
              }}
            >
              {associateSlug}
              <span style={{ color: tokens.muted }}> · id {associateId}</span>
            </span>
          </div>

          <p
            style={{
              fontSize: '14px',
              color: tokens.muted,
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Interview runtime ships in Phase 10 (automated interview pipeline).
            This page is the authenticated entry point — the server has already
            verified your cookie and is carrying your identity forward.
          </p>
        </div>
      </div>
    </div>
  );
}
