/**
 * ChallengeFilters — Phase 40 Plan 02 Task 1
 *
 * Sticky filter bar (language, week, difficulty, status). Native selects for
 * v1.4 per CONTEXT D-05 + plan (smaller bundle, accessible by default).
 * URL state lifted by parent via `useChallengeList`.
 */
'use client';

import type {
  ChallengeDifficulty,
  ChallengeFiltersState,
  ChallengeLanguage,
  ChallengeStatus,
} from '@/hooks/useChallengeList';

export interface ChallengeFiltersProps {
  filters: ChallengeFiltersState;
  onChange: (partial: Partial<ChallengeFiltersState>) => void;
  availableWeeks?: number[];
}

const LANGUAGE_LABELS: Record<ChallengeLanguage, string> = {
  python: 'Python',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  java: 'Java',
  sql: 'SQL',
  csharp: 'C#',
};

const DIFFICULTY_LABELS: Record<ChallengeDifficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

const STATUS_LABELS: Record<ChallengeStatus, string> = {
  unstarted: 'Unstarted',
  attempted: 'Attempted',
  passed: 'Passed',
};

const DEFAULT_WEEKS = Array.from({ length: 11 }, (_, i) => i + 1);

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
  fontWeight: 500,
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--muted)',
  marginBottom: '4px',
};

const selectStyle: React.CSSProperties = {
  backgroundColor: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  padding: '8px 10px',
  fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
  fontSize: '13px',
  color: 'var(--ink)',
  cursor: 'pointer',
  outline: 'none',
  minWidth: '120px',
};

export function ChallengeFilters({
  filters,
  onChange,
  availableWeeks = DEFAULT_WEEKS,
}: ChallengeFiltersProps) {
  const hasAny =
    filters.language !== undefined ||
    filters.difficulty !== undefined ||
    filters.status !== undefined ||
    filters.week !== undefined;

  return (
    <div
      role="region"
      aria-label="Challenge filters"
      data-testid="challenge-filters"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 5,
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        padding: '12px 24px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        alignItems: 'flex-end',
      }}
    >
      <Field label="Language">
        <select
          aria-label="Language"
          value={filters.language ?? ''}
          onChange={(e) =>
            onChange({
              language:
                e.target.value === ''
                  ? undefined
                  : (e.target.value as ChallengeLanguage),
            })
          }
          style={selectStyle}
        >
          <option value="">All</option>
          {(Object.keys(LANGUAGE_LABELS) as ChallengeLanguage[]).map((l) => (
            <option key={l} value={l}>
              {LANGUAGE_LABELS[l]}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Week">
        <select
          aria-label="Week"
          value={filters.week !== undefined ? String(filters.week) : ''}
          onChange={(e) =>
            onChange({
              week:
                e.target.value === '' ? undefined : Number.parseInt(e.target.value, 10),
            })
          }
          style={selectStyle}
        >
          <option value="">All</option>
          {availableWeeks.map((w) => (
            <option key={w} value={w}>
              Week {w}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Difficulty">
        <select
          aria-label="Difficulty"
          value={filters.difficulty ?? ''}
          onChange={(e) =>
            onChange({
              difficulty:
                e.target.value === ''
                  ? undefined
                  : (e.target.value as ChallengeDifficulty),
            })
          }
          style={selectStyle}
        >
          <option value="">All</option>
          {(Object.keys(DIFFICULTY_LABELS) as ChallengeDifficulty[]).map((d) => (
            <option key={d} value={d}>
              {DIFFICULTY_LABELS[d]}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Status">
        <select
          aria-label="Status"
          value={filters.status ?? ''}
          onChange={(e) =>
            onChange({
              status:
                e.target.value === ''
                  ? undefined
                  : (e.target.value as ChallengeStatus),
            })
          }
          style={selectStyle}
        >
          <option value="">All</option>
          {(Object.keys(STATUS_LABELS) as ChallengeStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </Field>

      {hasAny && (
        <button
          type="button"
          onClick={() =>
            onChange({
              language: undefined,
              difficulty: undefined,
              status: undefined,
              week: undefined,
            })
          }
          style={{
            marginLeft: 'auto',
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            padding: '8px 14px',
            fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
            fontSize: '13px',
            color: 'var(--muted)',
            cursor: 'pointer',
          }}
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={labelStyle}>{label}</span>
      {children}
    </label>
  );
}
