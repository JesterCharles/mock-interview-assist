'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import fpPromise from '@fingerprintjs/fingerprintjs';

interface PinEntryFormProps {
  nextPath: string | null;
}

const tokens = {
  ink: '#1A1A1A',
  muted: '#7A7267',
  accent: '#C85A2E',
  accentHover: '#B04E27',
  border: '#DDD5C8',
  danger: '#B83B2E',
  dangerBg: '#FDECEB',
  surface: '#FFFFFF',
} as const;

export function PinEntryForm({ nextPath }: PinEntryFormProps) {
  const router = useRouter();
  const [slug, setSlug] = useState('');
  const [pin, setPin] = useState('');
  const [fingerprint, setFingerprint] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load fingerprint on mount (same pattern as public interview flow).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fp = await fpPromise.load();
        const result = await fp.get();
        if (!cancelled) setFingerprint(result.visitorId);
      } catch (err) {
        console.error('[PinEntryForm] fingerprint load failed', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    const trimmedSlug = slug.trim();
    if (!trimmedSlug) {
      setError('Slug is required.');
      return;
    }
    if (!/^\d{6}$/.test(pin)) {
      setError('PIN must be 6 digits.');
      return;
    }
    if (!fingerprint) {
      setError('Still loading. Please try again in a moment.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/associate/pin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: trimmedSlug, pin, fingerprint }),
      });

      if (res.ok) {
        const dest = nextPath ?? `/associate/${trimmedSlug}`;
        // Use replace so the login page isn't in history.
        router.replace(dest);
        // Force a server-side re-render so guarded routes pick up the cookie.
        router.refresh();
        return;
      }

      if (res.status === 429) {
        setError('Too many attempts. Please wait 15 minutes.');
      } else if (res.status === 401) {
        setError('Invalid slug or PIN.');
      } else {
        setError('Sign-in failed. Please try again.');
      }
    } catch (err) {
      console.error('[PinEntryForm] submit failed', err);
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div style={{ marginBottom: '16px' }}>
        <label
          htmlFor="associate-slug"
          style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: 500,
            color: tokens.ink,
            marginBottom: '6px',
          }}
        >
          Associate slug
        </label>
        <input
          id="associate-slug"
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          disabled={submitting}
          required
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: '14px',
            fontFamily: "'DM Sans', sans-serif",
            color: tokens.ink,
            backgroundColor: tokens.surface,
            border: `1px solid ${tokens.border}`,
            borderRadius: '8px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label
          htmlFor="associate-pin"
          style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: 500,
            color: tokens.ink,
            marginBottom: '6px',
          }}
        >
          PIN
        </label>
        <input
          id="associate-pin"
          type="text"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          autoComplete="one-time-code"
          disabled={submitting}
          required
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: '18px',
            letterSpacing: '0.3em',
            fontFamily: "'JetBrains Mono', monospace",
            color: tokens.ink,
            backgroundColor: tokens.surface,
            border: `1px solid ${tokens.border}`,
            borderRadius: '8px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {error && (
        <div
          role="alert"
          style={{
            backgroundColor: tokens.dangerBg,
            border: `1px solid ${tokens.danger}`,
            color: tokens.danger,
            fontSize: '13px',
            padding: '10px 12px',
            borderRadius: '8px',
            marginBottom: '16px',
          }}
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        style={{
          width: '100%',
          padding: '12px 16px',
          fontSize: '14px',
          fontWeight: 600,
          fontFamily: "'DM Sans', sans-serif",
          color: '#FFFFFF',
          backgroundColor: submitting ? tokens.muted : tokens.accent,
          border: 'none',
          borderRadius: '8px',
          cursor: submitting ? 'not-allowed' : 'pointer',
          transition: 'background-color 150ms ease-out',
        }}
        onMouseEnter={(e) => {
          if (!submitting) e.currentTarget.style.backgroundColor = tokens.accentHover;
        }}
        onMouseLeave={(e) => {
          if (!submitting) e.currentTarget.style.backgroundColor = tokens.accent;
        }}
      >
        {submitting ? 'Verifying…' : 'Sign in'}
      </button>
    </form>
  );
}
