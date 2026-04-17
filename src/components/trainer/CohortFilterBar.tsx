'use client'

/**
 * CohortFilterBar — dropdown above the trainer roster to filter by cohort.
 *
 * Design tokens match DESIGN.md:
 *   - DM Sans body
 *   - Warm parchment surface (#FFFFFF card on #F5F0E8 page)
 *   - Burnt orange focus ring (#C85A2E)
 *   - JetBrains Mono uppercase section label (per trainer.css .trainer-section-label)
 *
 * "All Associates" is always the first, default option (D-02).
 */

interface CohortOption {
  id: string
  name: string
}

interface CohortFilterBarProps {
  cohorts: CohortOption[]
  selectedCohortId: string
  onChange: (id: string) => void
}

export default function CohortFilterBar({
  cohorts,
  selectedCohortId,
  onChange,
}: CohortFilterBarProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '24px',
        fontFamily: 'DM Sans, sans-serif',
      }}
    >
      <label
        htmlFor="cohort-filter"
        style={{
          fontSize: '11px',
          fontFamily: 'JetBrains Mono, monospace',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          color: 'var(--muted)',
        }}
      >
        Cohort
      </label>
      <select
        id="cohort-filter"
        value={selectedCohortId}
        onChange={(e) => onChange(e.target.value)}
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '14px',
          color: 'var(--ink)',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '8px 12px',
          minWidth: '240px',
          cursor: 'pointer',
          outline: 'none',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--accent)'
          e.currentTarget.style.boxShadow = '0 0 0 3px var(--chart-highlight)'
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--border)'
          e.currentTarget.style.boxShadow = 'none'
        }}
      >
        <option value="all">All Associates</option>
        {cohorts.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  )
}
