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

export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');

  useEffect(() => {
    // Verify the user is authenticated; redirect to /signin if not
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace('/signin');
      }
    });
  }, [router]);

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

    // Set password and mark password_set flag in one call
    const { error: updateError } = await supabase.auth.updateUser({
      password,
      data: { password_set: true },
    });

    if (updateError) {
      setError(updateError.message || 'Failed to set password. Please try again.');
      setStatus('idle');
      return;
    }

    setStatus('success');

    // Determine role-appropriate dashboard and redirect after brief delay
    const { data: { user } } = await supabase.auth.getUser();
    const role = user?.user_metadata?.role as string | undefined;

    setTimeout(async () => {
      if (role === 'trainer' || role === 'admin') {
        router.replace('/trainer');
        return;
      }

      // Associate — fetch slug from /api/associate/me
      try {
        const res = await fetch('/api/associate/me');
        if (res.ok) {
          const data = await res.json() as { slug?: string };
          if (data.slug) {
            router.replace(`/associate/${data.slug}/dashboard`);
            return;
          }
        }
      } catch {
        // fallthrough to /
      }

      router.replace('/');
    }, 1500);
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
          Set your password
        </h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 24px 0', lineHeight: 1.5 }}>
          Create a password so you can sign in directly next time.
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
            Password set. Redirecting…
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <label
              htmlFor="new-password"
              style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 6 }}
            >
              Password
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
              {status === 'submitting' ? 'Setting password…' : 'Set password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
