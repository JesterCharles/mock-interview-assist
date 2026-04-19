/**
 * useCodingStatus — Phase 50 (JUDGE-INTEG-02 / D-06)
 *
 * Client hook that fetches GET /api/coding/status and caches the result
 * for 60 seconds (matches Cache-Control: public, s-maxage=60 from the
 * endpoint).
 *
 * Fail-open: if the fetch errors, returns {status: 'error', enabled: null}.
 * Callers should treat null as "assume enabled" — we'd rather render the
 * workspace and let a subsequent submit return 503 than block users when
 * a transient network hiccup occurs.
 */
'use client';

import { useEffect, useState } from 'react';

export type CodingStatus =
  | { status: 'loading'; enabled: null }
  | { status: 'ready'; enabled: boolean }
  | { status: 'error'; enabled: null };

const CACHE_TTL_MS = 60_000;
let moduleCache: { value: boolean; fetchedAt: number } | null = null;

/**
 * Test helper — resets the module-scope cache so each test sees a fresh fetch.
 * Not called in production code paths.
 */
export function resetCodingStatusCache(): void {
  moduleCache = null;
}

export function useCodingStatus(): CodingStatus {
  const initial: CodingStatus =
    moduleCache && Date.now() - moduleCache.fetchedAt < CACHE_TTL_MS
      ? { status: 'ready', enabled: moduleCache.value }
      : { status: 'loading', enabled: null };

  const [state, setState] = useState<CodingStatus>(initial);

  useEffect(() => {
    if (moduleCache && Date.now() - moduleCache.fetchedAt < CACHE_TTL_MS) {
      setState({ status: 'ready', enabled: moduleCache.value });
      return;
    }
    let aborted = false;
    (async () => {
      try {
        const res = await fetch('/api/coding/status', { credentials: 'include' });
        if (aborted) return;
        if (!res.ok) {
          setState({ status: 'error', enabled: null });
          return;
        }
        const body = (await res.json()) as { enabled?: unknown };
        const enabled = body.enabled === true;
        moduleCache = { value: enabled, fetchedAt: Date.now() };
        setState({ status: 'ready', enabled });
      } catch {
        if (!aborted) setState({ status: 'error', enabled: null });
      }
    })();
    return () => {
      aborted = true;
    };
  }, []);

  return state;
}
