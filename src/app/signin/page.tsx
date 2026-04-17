import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { SignInTabs } from './SignInTabs';

/**
 * Unified sign-in. Two tabs — Trainer (email/password) and Associate (magic link).
 * Both tabs always visible. Already-authenticated callers are forwarded to their landing.
 */

interface PageProps {
  searchParams: Promise<{ next?: string }>;
}

function safeNext(raw: string | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith('/') || raw.startsWith('//')) return null;
  return raw;
}

export default async function SignInPage({ searchParams }: PageProps) {
  const { next } = await searchParams;
  const nextPath = safeNext(next);

  // Bounce if already signed in via Supabase session
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const role = user.user_metadata?.role as string | undefined;
    if (nextPath) {
      redirect(nextPath);
    } else if (role === 'trainer' || role === 'admin') {
      redirect('/trainer');
    } else {
      redirect('/');
    }
  }

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: 'var(--bg)',
        color: 'var(--ink)',
        fontFamily: "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif",
      }}
    >
      <main
        className="mx-auto w-full px-6 py-12"
        style={{ maxWidth: '1120px' }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '460px',
            margin: '0 auto',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '40px',
          }}
        >
          <h1
            style={{
              fontFamily: "var(--font-clash-display), 'Clash Display', system-ui, sans-serif",
              fontSize: '40px',
              fontWeight: 600,
              margin: '0 0 24px 0',
              letterSpacing: '-0.02em',
              color: 'var(--ink)',
              lineHeight: 1.1,
            }}
          >
            Sign in
          </h1>
          <SignInTabs nextPath={nextPath} />
        </div>
      </main>
    </div>
  );
}
