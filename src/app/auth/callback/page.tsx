'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

/**
 * /auth/callback — handles magic link and password reset callbacks.
 *
 * Magic links from admin.generateLink use implicit flow (tokens in URL hash).
 * The Supabase browser client auto-detects #access_token and sets the session.
 * After session is established, we call /api/auth/callback-link for:
 * - Role auto-assignment
 * - authUserId linkage (associate first sign-in)
 * - Redirect destination
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Completing sign-in...');

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const type = searchParams.get('type');

    async function handleCallback() {
      // Check for PKCE code first (if PKCE ever gets enabled)
      const code = searchParams.get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          router.replace('/signin?error=invalid-link');
          return;
        }
      }

      // For implicit flow, @supabase/ssr auto-detects #access_token on page load.
      // Wait briefly for the session to establish from the hash fragment.
      // onAuthStateChange fires when the session is ready.
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // Session not yet available — wait for onAuthStateChange
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            if (event === 'SIGNED_IN' && newSession) {
              subscription.unsubscribe();
              await completeCallback(type);
            }
          }
        );

        // Timeout: if no session after 5s, redirect to signin
        setTimeout(() => {
          subscription.unsubscribe();
          router.replace('/signin?error=invalid-link');
        }, 5000);
        return;
      }

      // Recovery flow → update-password page
      if (type === 'recovery') {
        router.replace('/auth/update-password');
        return;
      }

      await completeCallback(type);
    }

    async function completeCallback(callbackType: string | null) {
      if (callbackType === 'recovery') {
        router.replace('/auth/update-password');
        return;
      }

      setStatus('Linking account...');

      try {
        const res = await fetch('/api/auth/callback-link', { method: 'POST' });
        const data = await res.json();
        router.replace(data.redirect ?? '/');
      } catch {
        router.replace('/signin?error=invalid-link');
      }
    }

    handleCallback();
  }, [router, searchParams]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      fontFamily: 'var(--font-body)',
      color: 'var(--text-primary)',
    }}>
      <p>{status}</p>
    </div>
  );
}
