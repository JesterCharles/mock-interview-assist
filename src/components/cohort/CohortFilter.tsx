'use client';

/**
 * CohortFilter — native <select> dropdown to filter trainer roster by cohort.
 *
 * DESIGN.md tokens. First option is always "All Associates" (empty value).
 * Label to the left in 11px mono uppercase tracking.
 */

export interface CohortFilterOption {
  id: string | number;
  name: string;
}

export interface CohortFilterProps {
  cohorts: CohortFilterOption[];
  selectedId: string | null;
  onChange: (id: string | null) => void;
  label?: string;
}

export function CohortFilter({
  cohorts,
  selectedId,
  onChange,
  label = 'Cohort',
}: CohortFilterProps) {
  const value = selectedId ?? '';
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '12px',
        fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
      }}
    >
      <label
        htmlFor="cohort-filter-select"
        style={{
          fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
          fontWeight: 500,
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--muted)',
        }}
      >
        {label}
      </label>
      <select
        id="cohort-filter-select"
        value={value}
        onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--accent)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--border)';
        }}
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '8px 16px',
          fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
          fontSize: '14px',
          color: 'var(--ink)',
          minWidth: '240px',
          cursor: 'pointer',
          outline: 'none',
        }}
      >
        <option value="">All Associates</option>
        {cohorts.map((c) => (
          <option key={String(c.id)} value={String(c.id)}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export default CohortFilter;
