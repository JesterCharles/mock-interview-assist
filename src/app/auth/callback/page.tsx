'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

/**
 * /auth/callback — handles magic link and password reset callbacks.
 *
 * Magic links from admin.generateLink use implicit flow (tokens in URL hash).
 * @supabase/ssr's createBrowserClient does NOT auto-detect hash fragments,
 * so we manually extract tokens and call setSession().
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Completing sign-in...');

  useEffect(() => {
    async function handleCallback() {
      const supabase = createSupabaseBrowserClient();

      // Parse hash fragment: #access_token=...&refresh_token=...&type=magiclink
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const type = params.get('type');

      // Also check query params for PKCE flow (code=...)
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');

      if (code) {
        // PKCE flow
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          router.replace('/signin?error=invalid-link');
          return;
        }
      } else if (accessToken && refreshToken) {
        // Implicit flow — manually set session from hash tokens
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          console.error('[auth/callback] setSession error:', error.message);
          router.replace('/signin?error=invalid-link');
          return;
        }
      } else {
        // No tokens at all
        router.replace('/signin?error=missing-code');
        return;
      }

      // Recovery flow → update-password page
      if (type === 'recovery') {
        router.replace('/auth/update-password');
        return;
      }

      // Session established — call server for authUserId linkage + redirect
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
  }, [router]);

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
