'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

const inputBase: React.CSSProperties = {
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

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');

  // Supabase client auto-detects the recovery token from the URL hash
  // after /auth/callback redirects here with type=recovery.
  useEffect(() => {
    // Trigger a session check so the recovery token in the hash is consumed
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getSession();
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === 'submitting') return;

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setError(null);
    setStatus('submitting');

    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message || 'Failed to update password. Please try again.');
      setStatus('idle');
      return;
    }

    setStatus('success');
    setTimeout(() => {
      router.replace('/signin');
    }, 2000);
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg)',
        padding: '24px 16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '40px',
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-clash-display), 'Clash Display', system-ui, sans-serif",
            fontSize: '28px',
            fontWeight: 600,
            margin: '0 0 8px 0',
            letterSpacing: '-0.02em',
            color: 'var(--ink)',
            lineHeight: 1.2,
          }}
        >
          Set new password
        </h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 24px 0', lineHeight: 1.5 }}>
          Choose a password with at least 8 characters.
        </p>

        {status === 'success' ? (
          <div
            role="status"
            style={{
              padding: '16px',
              backgroundColor: 'var(--surface-muted)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontSize: 14,
              color: 'var(--ink)',
              lineHeight: 1.5,
            }}
          >
            Password updated. Redirecting to sign in…
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <label
              htmlFor="new-password"
              style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 6 }}
            >
              New password
            </label>
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              autoComplete="new-password"
              required
              minLength={8}
              disabled={status === 'submitting'}
              style={{ ...inputBase, marginBottom: 16 }}
            />

            <label
              htmlFor="confirm-password"
              style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 6 }}
            >
              Confirm password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
              disabled={status === 'submitting'}
              style={{ ...inputBase, marginBottom: 16 }}
            />

            {error && (
              <div role="alert" style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 16 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'submitting' || !password || !confirm}
              className="btn-accent-flat"
              style={{ width: '100%' }}
            >
              {status === 'submitting' ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
