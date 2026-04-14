'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { PublicShell } from '@/components/layout/PublicShell';

export default function LoginPage() {
    const router = useRouter();
    const { login, isAuthenticated, isLoading } = useAuth();
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isAuthenticated && !isLoading) {
            router.push('/dashboard');
        }
    }, [isAuthenticated, isLoading, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        const success = await login(password);

        if (success) {
            router.push('/dashboard');
        } else {
            setError('Invalid password. Please try again.');
            setPassword('');
        }

        setIsSubmitting(false);
    };

    if (isLoading) {
        return (
            <PublicShell title="Trainer Sign In">
                <div
                    style={{
                        textAlign: 'center',
                        color: 'var(--muted)',
                        fontSize: '14px',
                        padding: '48px 0',
                    }}
                >
                    Loading…
                </div>
            </PublicShell>
        );
    }

    return (
        <PublicShell title="Trainer Sign In">
            <div
                style={{
                    maxWidth: '420px',
                    margin: '0 auto',
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '32px',
                }}
            >
                <h1
                    style={{
                        fontFamily: "var(--font-clash-display), 'Clash Display', system-ui, sans-serif",
                        fontSize: '28px',
                        fontWeight: 600,
                        color: 'var(--ink)',
                        margin: '0 0 8px 0',
                        letterSpacing: '-0.01em',
                    }}
                >
                    Sign in
                </h1>
                <p
                    style={{
                        fontSize: '14px',
                        color: 'var(--muted)',
                        margin: '0 0 24px 0',
                        lineHeight: 1.5,
                    }}
                >
                    Trainer access. Enter the team password to continue.
                </p>

                <form onSubmit={handleSubmit}>
                    <label
                        htmlFor="password"
                        style={{
                            display: 'block',
                            fontSize: '13px',
                            fontWeight: 500,
                            color: 'var(--ink)',
                            marginBottom: '6px',
                        }}
                    >
                        Team password
                    </label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoFocus
                        required
                        style={{
                            width: '100%',
                            padding: '10px 14px',
                            fontSize: '14px',
                            color: 'var(--ink)',
                            backgroundColor: 'var(--bg)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            outline: 'none',
                            boxSizing: 'border-box',
                            marginBottom: '16px',
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.borderColor = 'var(--accent)';
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border)';
                        }}
                    />

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
                        disabled={isSubmitting || !password}
                        className="btn-accent-flat"
                        style={{ width: '100%' }}
                    >
                        {isSubmitting ? 'Verifying…' : 'Access dashboard'}
                    </button>
                </form>
            </div>

            <p
                style={{
                    textAlign: 'center',
                    color: 'var(--muted)',
                    fontSize: '12px',
                    marginTop: '24px',
                }}
            >
                Contact your team lead if you need access.
            </p>
        </PublicShell>
    );
}
