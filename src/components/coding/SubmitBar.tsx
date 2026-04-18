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
      try {
        const body = await res.json();
        code2 = body?.error?.code;
        message = body?.error?.message ?? message;
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
          color: '#FFFFFF',
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
