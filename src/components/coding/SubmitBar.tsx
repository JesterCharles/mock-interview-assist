/**
 * SubmitBar — Phase 40 Plan 03 Task 2
 *
 * Horizontal control strip: Submit (primary) + Run (disabled, "Coming soon").
 * Per CONTEXT D-09/D-10: Submit hits /api/coding/submit; Run has no backend
 * in v1.4 (v1.5 deferred).
 */
'use client';

import { useState } from 'react';

export interface SubmitBarError {
  code?: string;
  message: string;
  retryAfterSeconds?: number;
}

export interface SubmitBarProps {
  challengeId: string;
  language: string;
  code: string;
  onAttemptStarted: (attemptId: string) => void;
  onError?: (err: SubmitBarError) => void;
}

export function SubmitBar({
  challengeId,
  language,
  code,
  onAttemptStarted,
  onError,
}: SubmitBarProps) {
  const [pending, setPending] = useState(false);
  const trimmedEmpty = code.trim().length === 0;
  const submitDisabled = pending || trimmedEmpty;

  const handleSubmit = async () => {
    if (submitDisabled) return;
    setPending(true);
    try {
      const res = await fetch('/api/coding/submit', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId, language, code }),
      });
      if (res.ok) {
        const body = (await res.json()) as { attemptId: string };
        onAttemptStarted(body.attemptId);
        return;
      }
      // Error path
      let code2: string | undefined;
      let message = `HTTP ${res.status}`;
      let body503Enabled: boolean | undefined;
      try {
        const body = await res.json();
        code2 = body?.error?.code;
        message = body?.error?.message ?? body?.message ?? message;
        // Phase 50 (JUDGE-INTEG-02 / D-05): flag-dark 503 has shape
        // { enabled: false, message: "..." }. Detect it here so SolveWorkspace
        // can swap in the ComingSoon card instead of toasting "sandbox down".
        if (typeof body?.enabled === 'boolean') body503Enabled = body.enabled;
      } catch {
        /* ignore */
      }
      let retryAfterSeconds: number | undefined;
      if (res.status === 429) {
        const hdr = res.headers.get('Retry-After');
        if (hdr) {
          const n = Number.parseInt(hdr, 10);
          if (Number.isFinite(n)) retryAfterSeconds = n;
        }
      }
      // WR-02: 401 indicates session expiry. Surface AUTH_REQUIRED so the
      // host page can redirect to /signin instead of a generic toast.
      if (res.status === 401) {
        code2 = 'AUTH_REQUIRED';
        message = 'Session expired — please sign in again';
      }
      // Phase 50: flag-dark 503 → FEATURE_DISABLED so SolveWorkspace swaps
      // in the ComingSoon card. Use error code, not string matching.
      if (res.status === 503 && body503Enabled === false) {
        code2 = 'FEATURE_DISABLED';
        message = message || 'Coding challenges coming soon. Check back later!';
      } else if (res.status === 503) {
        // WR-03: real Judge0 outage (v1.6+) — keep the sandbox-unavailable
        // mapping for non-flag 503s.
        code2 = code2 ?? 'SANDBOX_UNAVAILABLE';
        message = 'Judge0 sandbox temporarily unavailable — try again in a moment';
      }
      onError?.({ code: code2, message, retryAfterSeconds });
    } catch (err) {
      onError?.({
        code: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : 'Network error',
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: '12px',
        justifyContent: 'flex-end',
        alignItems: 'center',
      }}
    >
      <button
        type="button"
        disabled
        aria-disabled="true"
        title="Coming soon — Submit runs all tests"
        style={{
          background: 'transparent',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '10px 20px',
          fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--muted)',
          cursor: 'not-allowed',
          opacity: 0.6,
        }}
      >
        Run
      </button>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitDisabled}
        aria-busy={pending ? 'true' : 'false'}
        style={{
          background: 'var(--accent)',
          color: 'var(--text-on-accent)',
          border: 'none',
          borderRadius: '8px',
          padding: '10px 20px',
          fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
          fontSize: '13px',
          fontWeight: 600,
          cursor: submitDisabled ? 'not-allowed' : 'pointer',
          opacity: submitDisabled ? 0.6 : 1,
          transition: 'background-color 150ms ease-out',
        }}
        onMouseEnter={(e) => {
          if (!submitDisabled)
            e.currentTarget.style.background = 'var(--accent-hover)';
        }}
        onMouseLeave={(e) => {
          if (!submitDisabled) e.currentTarget.style.background = 'var(--accent)';
        }}
      >
        {pending ? 'Submitting…' : 'Submit'}
      </button>
    </div>
  );
}

export default SubmitBar;
