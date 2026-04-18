/**
 * useChallengeList — Phase 40 Plan 02 Task 1
 *
 * Client hook for the /coding list page. Handles:
 *   - initial state hydration (SSR-first fetch is done by the page server component)
 *   - URL-synced filter state (language/difficulty/status/week)
 *   - cursor pagination (loadMore appends; filter change resets)
 *   - abort-in-flight fetches on filter changes or unmount
 *   - rate-limit surface (RATE_LIMITED with retryAfterSeconds)
 *
 * Import this from client components only.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export type ChallengeLanguage =
  | 'python'
  | 'javascript'
  | 'typescript'
  | 'java'
  | 'sql'
  | 'csharp';

export type ChallengeDifficulty = 'easy' | 'medium' | 'hard';

export type ChallengeStatus = 'unstarted' | 'attempted' | 'passed';

export interface ChallengeListItem {
  id: string;
  slug: string;
  title: string;
  language: string;
  difficulty: string;
  skillSlug: string;
  cohortId: number | null;
  latestAttempt: { verdict: string; submittedAt: string } | null;
}

export interface ChallengeFiltersState {
  language?: ChallengeLanguage;
  difficulty?: ChallengeDifficulty;
  status?: ChallengeStatus;
  week?: number;
}

export interface UseChallengeListOptions {
  initialItems?: ChallengeListItem[];
  initialCursor?: string | null;
}

export interface ChallengeListError {
  code: string;
  message: string;
  retryAfterSeconds?: number;
}

const LANGUAGE_ALLOWLIST: ChallengeLanguage[] = [
  'python',
  'javascript',
  'typescript',
  'java',
  'sql',
  'csharp',
];
const DIFFICULTY_ALLOWLIST: ChallengeDifficulty[] = ['easy', 'medium', 'hard'];
const STATUS_ALLOWLIST: ChallengeStatus[] = ['unstarted', 'attempted', 'passed'];

function narrowLanguage(v: string | null | undefined): ChallengeLanguage | undefined {
  return v && (LANGUAGE_ALLOWLIST as string[]).includes(v)
    ? (v as ChallengeLanguage)
    : undefined;
}
function narrowDifficulty(v: string | null | undefined): ChallengeDifficulty | undefined {
  return v && (DIFFICULTY_ALLOWLIST as string[]).includes(v)
    ? (v as ChallengeDifficulty)
    : undefined;
}
function narrowStatus(v: string | null | undefined): ChallengeStatus | undefined {
  return v && (STATUS_ALLOWLIST as string[]).includes(v)
    ? (v as ChallengeStatus)
    : undefined;
}
function narrowWeek(v: string | null | undefined): number | undefined {
  if (!v) return undefined;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function filtersFromParams(
  params: URLSearchParams | null,
): ChallengeFiltersState {
  if (!params) return {};
  return {
    language: narrowLanguage(params.get('language')),
    difficulty: narrowDifficulty(params.get('difficulty')),
    status: narrowStatus(params.get('status')),
    week: narrowWeek(params.get('week')),
  };
}

function buildQuery(
  filters: ChallengeFiltersState,
  cursor?: string | null,
  limit = 20,
): string {
  const params = new URLSearchParams();
  if (filters.language) params.set('language', filters.language);
  if (filters.difficulty) params.set('difficulty', filters.difficulty);
  if (filters.status) params.set('status', filters.status);
  if (filters.week !== undefined) params.set('week', String(filters.week));
  if (cursor) params.set('cursor', cursor);
  params.set('limit', String(limit));
  return params.toString();
}

export interface UseChallengeListReturn {
  items: ChallengeListItem[];
  loading: boolean;
  error: ChallengeListError | null;
  hasMore: boolean;
  filters: ChallengeFiltersState;
  setFilters: (partial: Partial<ChallengeFiltersState>) => void;
  loadMore: () => void;
}

export function useChallengeList(
  options: UseChallengeListOptions = {},
): UseChallengeListReturn {
  const router = useRouter();
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => filtersFromParams(searchParams),
    [searchParams],
  );

  // Key used to decide if we're on the SSR-hydrated initial view.
  const initialFilterKey = useRef<string | null>(null);
  if (initialFilterKey.current === null) {
    initialFilterKey.current = buildQuery(filters);
  }

  const [items, setItems] = useState<ChallengeListItem[]>(
    options.initialItems ?? [],
  );
  const [nextCursor, setNextCursor] = useState<string | null>(
    options.initialCursor ?? null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ChallengeListError | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const didInitRef = useRef(false);

  const fetchPage = useCallback(
    async (cursor: string | null, append: boolean, f: ChallengeFiltersState) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        const qs = buildQuery(f, cursor);
        const res = await fetch(`/api/coding/challenges?${qs}`, {
          credentials: 'include',
          signal: controller.signal,
        });

        if (!res.ok) {
          let code = 'UNKNOWN';
          let message = `Request failed: ${res.status}`;
          try {
            const body = await res.json();
            code = body?.error?.code ?? code;
            message = body?.error?.message ?? message;
          } catch {
            // ignore parse error; fall through
          }
          let retryAfterSeconds: number | undefined;
          if (res.status === 429) {
            const hdr = res.headers.get('Retry-After');
            if (hdr) {
              const n = Number.parseInt(hdr, 10);
              if (Number.isFinite(n)) retryAfterSeconds = n;
            }
          }
          // WR-02: 401 means the caller lost their session. Surface an
          // explicit AUTH_REQUIRED code; do not retry silently.
          if (res.status === 401) {
            code = 'AUTH_REQUIRED';
            message = 'Session expired — please sign in again';
          }
          // WR-03: 503 = upstream sandbox unavailable. Map to a clear user
          // message instead of "Request failed: 503".
          if (res.status === 503) {
            code = code === 'UNKNOWN' ? 'SANDBOX_UNAVAILABLE' : code;
            message = 'Judge0 sandbox temporarily unavailable — try again in a moment';
          }
          setError({ code, message, retryAfterSeconds });
          if (!append) setItems([]);
          setNextCursor(null);
          return;
        }

        const body = (await res.json()) as {
          items: ChallengeListItem[];
          nextCursor: string | null;
        };
        setItems((prev) => (append ? [...prev, ...body.items] : body.items));
        setNextCursor(body.nextCursor ?? null);
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return;
        setError({
          code: 'NETWORK_ERROR',
          message:
            err instanceof Error ? err.message : 'Network request failed',
        });
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
        setLoading(false);
      }
    },
    [],
  );

  // Refetch whenever filters change. Skip the initial run if SSR seeded items.
  useEffect(() => {
    const seeded = (options.initialItems?.length ?? 0) > 0;
    if (!didInitRef.current && seeded) {
      didInitRef.current = true;
      return;
    }
    didInitRef.current = true;
    void fetchPage(null, false, filters);
    return () => {
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.language, filters.difficulty, filters.status, filters.week]);

  const setFilters = useCallback(
    (partial: Partial<ChallengeFiltersState>) => {
      const current = new URLSearchParams(searchParams?.toString() ?? '');
      const apply = (key: keyof ChallengeFiltersState, val: unknown) => {
        if (val === undefined || val === null || val === '') {
          current.delete(key);
        } else {
          current.set(key, String(val));
        }
      };
      if ('language' in partial) apply('language', partial.language);
      if ('difficulty' in partial) apply('difficulty', partial.difficulty);
      if ('status' in partial) apply('status', partial.status);
      if ('week' in partial) apply('week', partial.week);
      const qs = current.toString();
      router.push(qs ? `/coding?${qs}` : '/coding', { scroll: false });
    },
    [router, searchParams],
  );

  const loadMore = useCallback(() => {
    if (!nextCursor || loading) return;
    void fetchPage(nextCursor, true, filters);
  }, [nextCursor, loading, fetchPage, filters]);

  return {
    items,
    loading,
    error,
    hasMore: nextCursor !== null,
    filters,
    setFilters,
    loadMore,
  };
}
