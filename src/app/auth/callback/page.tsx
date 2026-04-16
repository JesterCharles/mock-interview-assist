'use client';

import { useEffect } from 'react';

/**
 * /auth/callback — thin client that extracts hash tokens and forwards to server.
 *
 * Magic links from admin.generateLink use implicit flow (#access_token in hash).
 * Server can't read hash fragments, so this page extracts them and redirects
 * to a server route that sets httpOnly session cookies properly.
 */
export default function AuthCallbackPage() {
  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const type = params.get('type');

    // Also check query params for PKCE flow
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
      // PKCE flow — forward code to server
      window.location.href = `/api/auth/exchange?code=${encodeURIComponent(code)}&type=${type ?? ''}`;
    } else if (accessToken && refreshToken) {
      // Implicit flow — forward tokens to server
      window.location.href = `/api/auth/exchange?access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}&type=${type ?? ''}`;
    } else {
      window.location.href = '/signin?error=missing-code';
    }
  }, []);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      fontFamily: 'var(--font-body)',
      color: 'var(--text-primary)',
    }}>
      <p>Completing sign-in...</p>
    </div>
  );
}
