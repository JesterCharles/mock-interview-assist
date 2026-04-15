/**
 * CohortCard — DESIGN.md-styled cohort list item.
 *
 * Tokens only. No ad-hoc hex, no glass morphism, no gradients, no glow.
 * Typography per DESIGN.md:
 *   - Cohort name: Clash Display 22px 600
 *   - Dates:       DM Sans 14px tabular-nums, var(--muted)
 *   - Description: DM Sans 16px, var(--ink)
 *   - Stats number: Clash Display 28px tabular-nums
 *   - Stats label:  11px mono uppercase 0.08em tracking, var(--muted)
 *
 * Border rule separates header from the 4-column stats row.
 */

export interface CohortCardData {
  id: string | number;
  name: string;
  startDate: Date | string;
  endDate: Date | string | null;
  description?: string | null;
  associateCount: number;
  readyCount: number;
  improvingCount: number;
  notReadyCount: number;
}

export interface CohortCardProps {
  cohort: CohortCardData;
  onEdit?: () => void;
  onDelete?: () => void;
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return 'ongoing';
  try {
    const date = typeof d === 'string' ? new Date(d) : d;
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(date);
  } catch {
    return String(d);
  }
}

interface StatProps {
  value: number;
  label: string;
  tone?: 'default' | 'success' | 'accent' | 'danger';
}

function Stat({ value, label, tone = 'default' }: StatProps) {
  const color =
    tone === 'success'
      ? 'var(--success)'
      : tone === 'accent'
        ? 'var(--accent)'
        : tone === 'danger'
          ? 'var(--danger)'
          : 'var(--ink)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <span
        style={{
          fontFamily: "var(--font-display), 'Clash Display', sans-serif",
          fontWeight: 600,
          fontSize: '28px',
          lineHeight: 1,
          color,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </span>
      <span
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
      </span>
    </div>
  );
}

export function CohortCard({ cohort, onEdit, onDelete }: CohortCardProps) {
  const dateRange = `${formatDate(cohort.startDate)} – ${formatDate(cohort.endDate)}`;

  return (
    <article
      data-testid="cohort-card"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '24px',
        transition: 'border-color 150ms ease-out',
        display: 'flex',
        flexDirection: 'column',
        gap: '0',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
      }}
    >
      <header style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: '16px',
          }}
        >
          <h3
            style={{
              fontFamily: "var(--font-display), 'Clash Display', sans-serif",
              fontWeight: 600,
              fontSize: '22px',
              lineHeight: 1.2,
              color: 'var(--ink)',
              margin: 0,
              letterSpacing: '-0.01em',
            }}
          >
            {cohort.name}
          </h3>
          {(onEdit || onDelete) && (
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              {onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  aria-label={`Edit ${cohort.name}`}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--muted)',
                    fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
                    fontSize: '13px',
                    fontWeight: 500,
                    padding: '4px 8px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'color 100ms ease-out',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--accent)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--muted)';
                  }}
                >
                  Edit
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  aria-label={`Delete ${cohort.name}`}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--muted)',
                    fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
                    fontSize: '13px',
                    fontWeight: 500,
                    padding: '4px 8px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'color 100ms ease-out',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--danger)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--muted)';
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
        <span
          style={{
            fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
            fontSize: '14px',
            color: 'var(--muted)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {dateRange}
        </span>
        {cohort.description && (
          <p
            style={{
              fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
              fontSize: '16px',
              color: 'var(--ink)',
              margin: '4px 0 0 0',
              lineHeight: 1.4,
            }}
          >
            {cohort.description}
          </p>
        )}
      </header>

      <div
        style={{
          borderTop: '1px solid var(--border-subtle)',
          marginTop: '16px',
          paddingTop: '16px',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
        }}
      >
        <Stat value={cohort.associateCount} label="Total" />
        <Stat value={cohort.readyCount} label="Ready" tone="success" />
        <Stat value={cohort.improvingCount} label="Improving" tone="accent" />
        <Stat value={cohort.notReadyCount} label="Not Ready" tone="danger" />
      </div>
    </article>
  );
}

export default CohortCard;
