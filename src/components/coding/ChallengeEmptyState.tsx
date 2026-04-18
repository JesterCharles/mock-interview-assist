/**
 * ChallengeEmptyState — Phase 40 Plan 02 Task 2
 *
 * Two variants:
 *   - no-cohort: associate is not assigned → contact trainer
 *   - no-matches: filter combination returned nothing → Clear filters CTA
 */
'use client';

export type ChallengeEmptyStateVariant = 'no-cohort' | 'no-matches';

export interface ChallengeEmptyStateProps {
  variant: ChallengeEmptyStateVariant;
  onClearFilters?: () => void;
}

export function ChallengeEmptyState({
  variant,
  onClearFilters,
}: ChallengeEmptyStateProps) {
  const heading =
    variant === 'no-cohort'
      ? "You're not assigned to a cohort yet"
      : 'No challenges match these filters';
  const body =
    variant === 'no-cohort'
      ? 'Ask your trainer to assign you to a cohort to see coding challenges for your curriculum.'
      : 'Try removing one of the filters to broaden the list.';

  return (
    <section
      data-testid="challenge-empty-state"
      data-variant={variant}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '48px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
      }}
    >
      <h2
        style={{
          fontFamily: "var(--font-display), 'Clash Display', sans-serif",
          fontWeight: 600,
          fontSize: '28px',
          lineHeight: 1.2,
          color: 'var(--ink)',
          margin: 0,
          letterSpacing: '-0.01em',
        }}
      >
        {heading}
      </h2>
      <p
        style={{
          fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
          fontSize: '16px',
          color: 'var(--muted)',
          margin: 0,
          maxWidth: '520px',
          lineHeight: 1.55,
        }}
      >
        {body}
      </p>
      {variant === 'no-matches' && onClearFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          style={{
            marginTop: '8px',
            background: 'var(--accent)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 20px',
            fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background-color 150ms ease-out',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--accent)';
          }}
        >
          Clear filters
        </button>
      )}
    </section>
  );
}

export default ChallengeEmptyState;
