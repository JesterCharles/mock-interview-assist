'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, KeyRound } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface SignInAccordionProps {
  nextPath: string | null;
}

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

function AccordionButton({
  icon: Icon,
  label,
  expanded,
  dimmed,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  expanded: boolean;
  dimmed: boolean;
  onClick: () => void;
}) {
  const style: React.CSSProperties = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '14px 16px',
    fontSize: '14px',
    fontWeight: 500,
    borderRadius: '8px',
    cursor: 'pointer',
    outline: 'none',
    textAlign: 'left',
    transition: 'background 150ms ease, border-color 150ms ease, color 150ms ease, opacity 150ms ease',
    border: expanded
      ? '1px solid var(--accent)'
      : '1px solid var(--border)',
    background: dimmed ? 'var(--surface-muted)' : 'var(--surface)',
    color: dimmed ? 'var(--muted)' : 'var(--ink)',
    opacity: dimmed ? 0.7 : 1,
  };

  return (
    <button type="button" style={style} onClick={onClick}>
      <Icon size={18} color={dimmed ? 'var(--muted)' : 'var(--ink)'} />
      {label}
    </button>
  );
}

export function SignInTabs({ nextPath }: SignInAccordionProps) {
  const router = useRouter();
  const { login } = useAuth();
  const [expanded, setExpanded] = useState<'email' | 'password' | null>(null);

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

  // Associate magic link state
  const [assocEmail, setAssocEmail] = useState('');
  const [assocStatus, setAssocStatus] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle');
  const [assocError, setAssocError] = useState<string | null>(null);

  function toggleExpanded(type: 'email' | 'password') {
    setExpanded((prev) => (prev === type ? null : type));
  }

  // Phase 33 / SIGNIN-02 (P1 fix): Trainer first-login password gate.
  // After a successful Supabase login, call the Profile-first password-status
  // endpoint (same source of truth as the exchange route's magic-link gate).
  // If Profile.passwordSetAt is null (and metadata.password_set is falsy), or
  // if the endpoint errors, send the trainer to /auth/set-password.
  // FAIL-CLOSED: middleware does not enforce this gate, so we must default to
  // /auth/set-password on any indeterminate state. Only an explicit
  // `{ passwordSet: true }` allows redirect to /trainer.
  async function handleTrainerSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (trainerSubmitting) return;
    setTrainerError(null);
    setTrainerSubmitting(true);
    const ok = await login(email, password);
    if (ok) {
      try {
        const res = await fetch('/api/auth/password-status', {
          method: 'GET',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) {
          // Fail-closed: any non-200 response routes to /auth/set-password.
          router.replace('/auth/set-password');
          router.refresh();
          return;
        }
        const body = (await res.json()) as { passwordSet?: unknown };
        if (body?.passwordSet === true) {
          router.replace(nextPath ?? '/trainer');
          router.refresh();
          return;
        }
        router.replace('/auth/set-password');
        router.refresh();
        return;
      } catch {
        // Fail-closed on network/parse error.
        router.replace('/auth/set-password');
        router.refresh();
        return;
      }
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

  const emailExpanded = expanded === 'email';
  const passwordExpanded = expanded === 'password';
  const somethingExpanded = expanded !== null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Email link accordion */}
      <div>
        <AccordionButton
          icon={Mail}
          label="Continue with email link"
          expanded={emailExpanded}
          dimmed={somethingExpanded && !emailExpanded}
          onClick={() => toggleExpanded('email')}
        />
        {/* Accordion panel using grid-template-rows trick for smooth animation */}
        <div
          style={{
            display: 'grid',
            gridTemplateRows: emailExpanded ? '1fr' : '0fr',
            transition: 'grid-template-rows 200ms ease',
          }}
        >
          <div style={{ overflow: 'hidden' }}>
            <div
              style={{
                paddingTop: '16px',
                opacity: emailExpanded ? 1 : 0,
                transition: 'opacity 150ms ease',
              }}
            >
              {assocStatus === 'sent' ? (
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
          </div>
        </div>
      </div>

      {/* Password accordion */}
      <div>
        <AccordionButton
          icon={KeyRound}
          label="Sign in with password"
          expanded={passwordExpanded}
          dimmed={somethingExpanded && !passwordExpanded}
          onClick={() => toggleExpanded('password')}
        />
        {/* Accordion panel using grid-template-rows trick for smooth animation */}
        <div
          style={{
            display: 'grid',
            gridTemplateRows: passwordExpanded ? '1fr' : '0fr',
            transition: 'grid-template-rows 200ms ease',
          }}
        >
          <div style={{ overflow: 'hidden' }}>
            <div
              style={{
                paddingTop: '16px',
                opacity: passwordExpanded ? 1 : 0,
                transition: 'opacity 150ms ease',
              }}
            >
              {!showReset ? (
                <form onSubmit={handleTrainerSubmit} noValidate>
                  <label htmlFor="trainer-email" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 6 }}>
                    Email
                  </label>
                  <input
                    id="trainer-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
          </div>
        </div>
      </div>
    </div>
  );
}
