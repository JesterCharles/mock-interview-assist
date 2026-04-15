'use client';

/**
 * CurriculumFilterBadge — shows "Filtered by cohort curriculum (N taught skills)"
 * when a curriculum filter is active on the setup wizard tech list.
 *
 * Display-only: uses skillName (human-readable), NOT skillSlug, in the dropdown.
 * Ordered by weekNumber asc (D-18, 13-CONTEXT.md).
 *
 * Design tokens per DESIGN.md — warm authority, editorial/utilitarian aesthetic.
 * Rendered near the tech list header in Phase 1 of the setup wizard.
 * Hidden when taughtWeeks is empty (filter inactive).
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface TaughtWeek {
  weekNumber: number;
  skillName: string;
  skillSlug: string;
}

interface CurriculumFilterBadgeProps {
  taughtWeeks: TaughtWeek[];
}

export function CurriculumFilterBadge({ taughtWeeks }: CurriculumFilterBadgeProps) {
  const [open, setOpen] = useState(false);

  if (taughtWeeks.length === 0) return null;

  // Sort by weekNumber asc for display
  const sorted = [...taughtWeeks].sort((a, b) => a.weekNumber - b.weekNumber);

  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
        style={{
          backgroundColor: 'var(--surface-muted, #2E2A27)',
          color: 'var(--accent, #D4743F)',
          border: '1px solid var(--border, #3D3733)',
        }}
        data-testid="curriculum-filter-badge"
        aria-expanded={open}
      >
        <span>Filtered by cohort curriculum</span>
        <span
          className="font-bold rounded-full px-1.5 py-0.5 text-[10px]"
          style={{
            backgroundColor: 'var(--accent, #D4743F)',
            color: '#fff',
          }}
          data-testid="curriculum-filter-count"
        >
          {taughtWeeks.length}
        </span>
        {open ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </button>

      {open && (
        <div
          className="mt-1.5 rounded-lg border p-3 space-y-1 shadow-sm"
          style={{
            backgroundColor: 'var(--surface, #262220)',
            borderColor: 'var(--border, #3D3733)',
          }}
          data-testid="curriculum-filter-dropdown"
        >
          <p
            className="text-[11px] uppercase tracking-wide mb-2"
            style={{ color: 'var(--muted, #9C9488)', fontFamily: 'JetBrains Mono, monospace' }}
          >
            Taught skills
          </p>
          <ul className="space-y-1">
            {sorted.map(week => (
              <li
                key={week.weekNumber}
                className="flex items-center gap-2 text-sm"
                style={{ color: 'var(--ink, #E8E2D9)' }}
              >
                <span
                  className="text-[10px] font-mono tabular-nums w-8 text-right flex-shrink-0"
                  style={{ color: 'var(--muted, #9C9488)' }}
                >
                  W{week.weekNumber}
                </span>
                <span>{week.skillName}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
