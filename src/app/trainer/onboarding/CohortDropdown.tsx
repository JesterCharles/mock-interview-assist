'use client';

import type { CohortOption } from '@/lib/bulkInvitePreview';

interface CohortDropdownProps {
  cohorts: CohortOption[];
  selectedId: number | null;
  onChange: (id: number) => void;
}

export function CohortDropdown({ cohorts, selectedId, onChange }: CohortDropdownProps) {
  if (cohorts.length === 0) {
    return (
      <div>
        <p
          style={{
            fontFamily: 'Clash Display, sans-serif',
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--ink)',
            margin: '0 0 8px',
          }}
        >
          Target Cohort
        </p>
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '13px',
            fontWeight: 400,
            color: 'var(--danger)',
            margin: 0,
          }}
        >
          No cohorts exist yet. Create a cohort before inviting associates.
        </p>
      </div>
    );
  }

  const sorted = [...cohorts].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <label
        style={{
          display: 'block',
          fontFamily: 'Clash Display, sans-serif',
          fontSize: '16px',
          fontWeight: 600,
          color: 'var(--ink)',
          marginBottom: '8px',
        }}
      >
        Target Cohort
      </label>
      <select
        value={selectedId ?? ''}
        onChange={e => {
          const val = Number(e.target.value);
          if (!isNaN(val) && val > 0) onChange(val);
        }}
        style={{
          width: '100%',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '0 16px',
          minHeight: '44px',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '13px',
          fontWeight: 400,
          color: 'var(--ink)',
          cursor: 'pointer',
          boxSizing: 'border-box',
        }}
      >
        <option value="" disabled>
          Select a cohort
        </option>
        {sorted.map(c => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export default CohortDropdown;
