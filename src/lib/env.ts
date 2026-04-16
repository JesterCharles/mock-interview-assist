const LOCALHOST_PATTERNS = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];

const REQUIRED_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SITE_URL',
] as const;

/**
 * Boot-time environment assertions. Call from `instrumentation.ts` register().
 * Throws with [FATAL] prefix so boot logs are clearly actionable.
 * No-op outside production.
 */
export function assertProductionEnv(): void {
  if (process.env.NODE_ENV !== 'production') return;

  // Check required vars present
  for (const varName of REQUIRED_VARS) {
    if (!process.env[varName]) {
      throw new Error(
        `[FATAL] Missing required environment variable: ${varName}. ` +
          `Set it before starting the server in production.`
      );
    }
  }

  // Reject localhost/loopback in NEXT_PUBLIC_SITE_URL
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  const hasLocalhost = LOCALHOST_PATTERNS.some((pattern) => siteUrl.includes(pattern));
  if (hasLocalhost) {
    throw new Error(
      `[FATAL] NEXT_PUBLIC_SITE_URL is set to a local address ("${siteUrl}") in production. ` +
        `Set it to your production domain (e.g. https://nlm.example.com).`
    );
  }
}
