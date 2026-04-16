import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { SignInTabs } from './SignInTabs';
import { PublicShell } from '@/components/layout/PublicShell';

/**
 * Unified sign-in. Two tabs — Trainer (email/password) and Associate (magic link).
 * Both tabs always visible. Already-authenticated callers are forwarded to their landing.
 */

interface PageProps {
  searchParams: Promise<{ as?: string; next?: string }>;
}

function safeNext(raw: string | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith('/') || raw.startsWith('//')) return null;
  return raw;
}

export default async function SignInPage({ searchParams }: PageProps) {
  const { as, next } = await searchParams;
  const nextPath = safeNext(next);
  const initialTab: 'trainer' | 'associate' = as === 'associate' ? 'associate' : 'trainer';

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
    <PublicShell>
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
        <SignInTabs initialTab={initialTab} nextPath={nextPath} showAssociateTab={true} />
      </div>
    </PublicShell>
  );
}
