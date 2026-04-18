/**
 * ChallengeList — Phase 40 Plan 02 Task 3
 *
 * Client-side orchestrator: sticky filter bar → grid of cards → Load more.
 * Uses useChallengeList for state; server component (page.tsx) hydrates
 * initialItems + initialCursor to avoid a double-fetch on first paint.
 */
'use client';

import { useChallengeList } from '@/hooks/useChallengeList';
import type { ChallengeListItem } from '@/hooks/useChallengeList';
import { ChallengeFilters } from './ChallengeFilters';
import { ChallengeCard } from './ChallengeCard';
import { ChallengeEmptyState } from './ChallengeEmptyState';

export interface ChallengeListProps {
  initialItems: ChallengeListItem[];
  initialCursor: string | null;
  callerHasCohort: boolean;
  availableWeeks?: number[];
}

export function ChallengeList({
  initialItems,
  initialCursor,
  callerHasCohort,
  availableWeeks,
}: ChallengeListProps) {
  const h = useChallengeList({ initialItems, initialCursor });

  const hasFiltersApplied =
    h.filters.language !== undefined ||
    h.filters.difficulty !== undefined ||
    h.filters.status !== undefined ||
    h.filters.week !== undefined;

  // Derive available weeks: union of seed list + observed weeks in items (best-effort)
  const weeks = availableWeeks ?? undefined;

  const showNoCohort = !callerHasCohort && h.items.length === 0 && !hasFiltersApplied;
  const showNoMatches =
    callerHasCohort &&
    h.items.length === 0 &&
    hasFiltersApplied &&
    !h.loading &&
    !h.error;
  const showEmptyAvailable =
    callerHasCohort &&
    h.items.length === 0 &&
    !hasFiltersApplied &&
    !h.loading &&
    !h.error;

  return (
    <div>
      <ChallengeFilters
        filters={h.filters}
        onChange={(p) => h.setFilters(p)}
        availableWeeks={weeks}
      />

      <div
        style={{
          padding: '24px',
        }}
      >
        {h.error && (
          <div
            role="alert"
            style={{
              background: 'var(--danger-bg)',
              color: 'var(--danger)',
              border: '1px solid var(--danger)',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px',
              fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
              fontSize: '14px',
            }}
          >
            {h.error.code === 'RATE_LIMITED' && h.error.retryAfterSeconds
              ? `Too many requests — try again in ${h.error.retryAfterSeconds}s.`
              : h.error.message}
          </div>
        )}

        {showNoCohort && <ChallengeEmptyState variant="no-cohort" />}

        {showNoMatches && (
          <ChallengeEmptyState
            variant="no-matches"
            onClearFilters={() =>
              h.setFilters({
                language: undefined,
                difficulty: undefined,
                status: undefined,
                week: undefined,
              })
            }
          />
        )}

        {showEmptyAvailable && (
          <p
            style={{
              fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
              color: 'var(--muted)',
              fontSize: '14px',
              padding: '24px',
              textAlign: 'center',
            }}
          >
            No challenges available yet.
          </p>
        )}

        {h.items.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '16px',
            }}
          >
            {h.items.map((c) => (
              <ChallengeCard key={c.id} challenge={c} />
            ))}
          </div>
        )}

        {h.hasMore && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: '24px',
            }}
          >
            <button
              type="button"
              onClick={() => h.loadMore()}
              disabled={h.loading}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '10px 20px',
                fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--ink)',
                cursor: h.loading ? 'default' : 'pointer',
                opacity: h.loading ? 0.6 : 1,
              }}
            >
              {h.loading ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChallengeList;
