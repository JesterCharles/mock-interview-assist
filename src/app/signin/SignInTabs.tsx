'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

interface SignInTabsProps {
  initialTab: 'trainer' | 'associate';
  nextPath: string | null;
  /** Both tabs are always visible in v1.2+. This prop is kept for API compat. */
  showAssociateTab?: boolean;
}

const tabBtnBase: React.CSSProperties = {
  flex: 1,
  padding: '10px 0',
  fontSize: '14px',
  fontWeight: 600,
  border: '1px solid var(--border)',
  background: 'var(--surface-muted)',
  color: 'var(--muted)',
  cursor: 'pointer',
  outline: 'none',
};

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

export function SignInTabs({ initialTab, nextPath }: SignInTabsProps) {
  const router = useRouter();
  const { login } = useAuth();
  const [tab, setTab] = useState<'trainer' | 'associate'>(initialTab);

  // Trainer sign-in state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [trainerError, setTrainerError] = useState<string | null>(null);
  const [trainerSubmitting, setTrainerSubmitting] = useState(false);

  // Forgot-password inline form state
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatus, setResetStatus] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle');
  const [resetError, setResetError] = useState<string | null>(null);

  // Associate magic link state (wired in Plan 04)
  const [assocEmail, setAssocEmail] = useState('');
  const [assocStatus, setAssocStatus] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle');
  const [assocError, setAssocError] = useState<string | null>(null);

  async function handleTrainerSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (trainerSubmitting) return;
    setTrainerError(null);
    setTrainerSubmitting(true);
    const ok = await login(email, password);
    if (ok) {
      router.replace(nextPath ?? '/trainer');
      router.refresh();
      return;
    }
    setTrainerError('Invalid email or password.');
    setPassword('');
    setTrainerSubmitting(false);
  }

  async function handleResetSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (resetStatus === 'submitting') return;
    setResetStatus('submitting');
    setResetError(null);
    try {
      const res = await fetch('/api/auth/reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });
      if (res.status === 429) {
        setResetStatus('error');
        setResetError('Too many requests. Please try again later.');
        return;
      }
      // Always show success regardless of whether email exists (security)
      setResetStatus('sent');
    } catch {
      setResetStatus('error');
      setResetError('Network error. Please try again.');
    }
  }

  async function handleAssocSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (assocStatus === 'submitting') return;
    setAssocStatus('submitting');
    setAssocError(null);
    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: assocEmail }),
      });
      if (res.status === 429) {
        setAssocStatus('error');
        setAssocError('Too many requests. Please try again later.');
        return;
      }
      if (!res.ok) {
        setAssocStatus('error');
        setAssocError('Something went wrong. Please try again.');
        return;
      }
      setAssocStatus('sent');
    } catch {
      setAssocStatus('error');
      setAssocError('Network error. Please try again.');
    }
  }

  const activeTabStyle = (active: boolean): React.CSSProperties => ({
    ...tabBtnBase,
    background: active ? 'var(--surface)' : 'var(--surface-muted)',
    color: active ? 'var(--ink)' : 'var(--muted)',
    borderBottom: active ? '2px solid var(--accent)' : '1px solid var(--border)',
  });

  return (
    <div>
      {/* Tab switcher — both tabs always visible */}
      <div role="tablist" aria-label="Sign-in role" style={{ display: 'flex', gap: 0, marginBottom: 24 }}>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'trainer'}
          onClick={() => setTab('trainer')}
          style={{ ...activeTabStyle(tab === 'trainer'), borderRadius: '8px 0 0 8px' }}
        >
          Trainer
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'associate'}
          onClick={() => setTab('associate')}
          style={{ ...activeTabStyle(tab === 'associate'), borderRadius: '0 8px 8px 0' }}
        >
          Associate
        </button>
      </div>

      {tab === 'trainer' ? (
        <div>
          {!showReset ? (
            <form onSubmit={handleTrainerSubmit} noValidate>
              <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                Trainer access. Sign in with your email and password.
              </p>

              <label htmlFor="trainer-email" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 6 }}>
                Email
              </label>
              <input
                id="trainer-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                autoComplete="email"
                required
                disabled={trainerSubmitting}
                style={{ ...inputBase, marginBottom: 16 }}
              />

              <label htmlFor="trainer-password" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 6 }}>
                Password
              </label>
              <input
                id="trainer-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                disabled={trainerSubmitting}
                style={{ ...inputBase, marginBottom: 8 }}
              />

              <button
                type="button"
                onClick={() => {
                  setResetEmail(email);
                  setShowReset(true);
                  setResetStatus('idle');
                  setResetError(null);
                }}
                style={{ color: 'var(--accent)', fontSize: 13, cursor: 'pointer', background: 'none', border: 'none', padding: 0, marginBottom: 16, display: 'block' }}
              >
                Forgot password?
              </button>

              {trainerError && (
                <div role="alert" style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 16 }}>
                  {trainerError}
                </div>
              )}

              <button type="submit" disabled={trainerSubmitting || !email || !password} className="btn-accent-flat" style={{ width: '100%' }}>
                {trainerSubmitting ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          ) : (
            <div>
              <button
                type="button"
                onClick={() => setShowReset(false)}
                style={{ color: 'var(--accent)', fontSize: 13, cursor: 'pointer', background: 'none', border: 'none', padding: 0, marginBottom: 16, display: 'block' }}
              >
                ← Back to sign in
              </button>

              {resetStatus === 'sent' ? (
                <p style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.5 }}>
                  Check your email for a reset link.
                </p>
              ) : (
                <form onSubmit={handleResetSubmit} noValidate>
                  <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                    Enter your email and we&apos;ll send a reset link.
                  </p>
                  <label htmlFor="reset-email" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 6 }}>
                    Email
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    autoFocus
                    required
                    disabled={resetStatus === 'submitting'}
                    style={{ ...inputBase, marginBottom: 16 }}
                  />
                  {resetError && (
                    <div role="alert" style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 16 }}>
                      {resetError}
                    </div>
                  )}
                  <button type="submit" disabled={resetStatus === 'submitting' || !resetEmail} className="btn-accent-flat" style={{ width: '100%' }}>
                    {resetStatus === 'submitting' ? 'Sending…' : 'Send reset link'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      ) : assocStatus === 'sent' ? (
        <div>
          <p style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.5, marginBottom: 16 }}>
            Check your email — we sent a sign-in link to <strong>{assocEmail}</strong>.
          </p>
          <button
            type="button"
            onClick={() => { setAssocStatus('idle'); setAssocError(null); }}
            style={{ color: 'var(--accent)', fontSize: 13, cursor: 'pointer', background: 'none', border: 'none', padding: 0, display: 'block' }}
          >
            Didn&apos;t get it? Try again
          </button>
        </div>
      ) : (
        <form onSubmit={handleAssocSubmit} noValidate>
          <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 16px 0', lineHeight: 1.5 }}>
            Enter your email to receive a sign-in link.
          </p>
          <label htmlFor="assoc-email" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 6 }}>
            Email
          </label>
          <input
            id="assoc-email"
            type="email"
            value={assocEmail}
            onChange={(e) => setAssocEmail(e.target.value)}
            autoFocus
            autoComplete="email"
            required
            disabled={assocStatus === 'submitting'}
            style={{ ...inputBase, marginBottom: 16 }}
          />
          {assocError && (
            <div role="alert" style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 16 }}>
              {assocError}
            </div>
          )}
          <button type="submit" disabled={assocStatus === 'submitting' || !assocEmail} className="btn-accent-flat" style={{ width: '100%' }}>
            {assocStatus === 'submitting' ? 'Sending…' : 'Send sign-in link'}
          </button>
        </form>
      )}
    </div>
  );
}
