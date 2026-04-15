'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import fpPromise from '@fingerprintjs/fingerprintjs';

interface PinEntryFormProps {
  nextPath: string | null;
}

/**
 * Phase 14 restyle: all hex literals replaced with DESIGN.md CSS vars
 * (Codex finding #8 scope). PIN input uses 32px JetBrains Mono with wide
 * tracking per DESIGN.md PIN entry spec.
 */

export function PinEntryForm({ nextPath }: PinEntryFormProps) {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [fingerprint, setFingerprint] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        body: JSON.stringify({ pin, fingerprint }),
      });

      if (res.ok) {
        const data = (await res.json().catch(() => ({}))) as { slug?: string };
        const slug = data.slug ?? '';
        // Redirect straight into the interview, not the profile page (15-02 UX fix).
        const dest = nextPath ?? (slug ? `/associate/${slug}/interview` : '/');
        router.replace(dest);
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
      <div style={{ marginBottom: '24px' }}>
        <label
          htmlFor="associate-pin"
          style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--ink)',
            marginBottom: '8px',
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
            width: '12rem',
            padding: '12px 14px',
            fontSize: '32px',
            letterSpacing: '0.4em',
            fontVariantNumeric: 'tabular-nums',
            textAlign: 'center',
            fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
            color: 'var(--ink)',
            backgroundColor: 'var(--bg)',
            border: '1px solid var(--border)',
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
            color: 'var(--danger)',
            fontSize: '13px',
            marginBottom: '16px',
          }}
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="btn-accent-flat"
        style={{ width: '100%' }}
      >
        {submitting ? 'Verifying…' : 'Sign in'}
      </button>
    </form>
  );
}
