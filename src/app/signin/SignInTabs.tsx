'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import fpPromise from '@fingerprintjs/fingerprintjs';
import { useAuth } from '@/lib/auth-context';

interface SignInTabsProps {
  initialTab: 'trainer' | 'associate';
  nextPath: string | null;
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

  // Trainer state
  const [password, setPassword] = useState('');
  const [trainerError, setTrainerError] = useState<string | null>(null);
  const [trainerSubmitting, setTrainerSubmitting] = useState(false);

  // Associate state
  const [pin, setPin] = useState('');
  const [fingerprint, setFingerprint] = useState('');
  const [associateError, setAssociateError] = useState<string | null>(null);
  const [associateSubmitting, setAssociateSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fp = await fpPromise.load();
        const r = await fp.get();
        if (!cancelled) setFingerprint(r.visitorId);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleTrainerSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (trainerSubmitting) return;
    setTrainerError(null);
    setTrainerSubmitting(true);
    const ok = await login(password);
    if (ok) {
      router.replace(nextPath ?? '/trainer');
      router.refresh();
      return;
    }
    setTrainerError('Invalid password.');
    setPassword('');
    setTrainerSubmitting(false);
  }

  async function handleAssociateSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (associateSubmitting) return;
    setAssociateError(null);
    if (!/^\d{6}$/.test(pin)) {
      setAssociateError('PIN must be 6 digits.');
      return;
    }
    if (!fingerprint) {
      setAssociateError('Still loading. Please try again in a moment.');
      return;
    }
    setAssociateSubmitting(true);
    try {
      const res = await fetch('/api/associate/pin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, fingerprint }),
      });
      if (res.ok) {
        const data = (await res.json().catch(() => ({}))) as { slug?: string };
        const slug = data.slug ?? '';
        const dest = nextPath ?? (slug ? `/associate/${slug}/interview` : '/');
        router.replace(dest);
        router.refresh();
        return;
      }
      if (res.status === 429) setAssociateError('Too many attempts. Please wait 15 minutes.');
      else if (res.status === 401) setAssociateError('Invalid PIN.');
      else setAssociateError('Sign-in failed. Please try again.');
    } catch {
      setAssociateError('Network error. Please try again.');
    } finally {
      setAssociateSubmitting(false);
    }
  }

  const activeStyle = (active: boolean): React.CSSProperties => ({
    ...tabBtnBase,
    background: active ? 'var(--surface)' : 'var(--surface-muted)',
    color: active ? 'var(--ink)' : 'var(--muted)',
    borderBottom: active ? '2px solid var(--accent)' : '1px solid var(--border)',
  });

  return (
    <div>
      <div role="tablist" aria-label="Sign-in role" style={{ display: 'flex', gap: 0, marginBottom: 24 }}>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'trainer'}
          onClick={() => setTab('trainer')}
          style={{ ...activeStyle(tab === 'trainer'), borderRadius: '8px 0 0 8px' }}
        >
          Trainer
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'associate'}
          onClick={() => setTab('associate')}
          style={{ ...activeStyle(tab === 'associate'), borderRadius: '0 8px 8px 0' }}
        >
          Associate
        </button>
      </div>

      {tab === 'trainer' ? (
        <form onSubmit={handleTrainerSubmit} noValidate>
          <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 16px 0', lineHeight: 1.5 }}>
            Trainer access. Enter the team password.
          </p>
          <label htmlFor="trainer-password" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 6 }}>
            Team password
          </label>
          <input
            id="trainer-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            required
            disabled={trainerSubmitting}
            style={{ ...inputBase, marginBottom: 16 }}
          />
          {trainerError && (
            <div role="alert" style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 16 }}>
              {trainerError}
            </div>
          )}
          <button type="submit" disabled={trainerSubmitting || !password} className="btn-accent-flat" style={{ width: '100%' }}>
            {trainerSubmitting ? 'Verifying…' : 'Sign in as trainer'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleAssociateSubmit} noValidate>
          <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 16px 0', lineHeight: 1.5 }}>
            Enter the 6-digit PIN your trainer gave you.
          </p>
          <label htmlFor="associate-pin" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 8 }}>
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
            disabled={associateSubmitting}
            required
            autoFocus
            style={{
              ...inputBase,
              width: '12rem',
              padding: '12px 14px',
              fontSize: 32,
              letterSpacing: '0.4em',
              fontVariantNumeric: 'tabular-nums',
              textAlign: 'center',
              fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
              marginBottom: 24,
            }}
          />
          {associateError && (
            <div role="alert" style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 16 }}>
              {associateError}
            </div>
          )}
          <button type="submit" disabled={associateSubmitting} className="btn-accent-flat" style={{ width: '100%' }}>
            {associateSubmitting ? 'Verifying…' : 'Sign in as associate'}
          </button>
        </form>
      )}
    </div>
  );
}
