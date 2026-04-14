/**
 * CurriculumWeekList — token-driven week-by-week schedule list.
 *
 * Per DESIGN.md D-10:
 *   - Week number: Clash Display 28px tabular-nums, fixed-width left column
 *   - Skill name:  Clash Display 22px
 *   - Topic tags:  warm chip (surface-muted + border-subtle, rounded-full)
 *   - Start date:  DM Sans 14px tabular-nums, right-aligned, muted
 *   - Status:      11px mono uppercase — "taught" (success), "this week" (accent),
 *                  "upcoming" (muted)
 *
 * Today marker: the "current" week (startDate <= now < nextWeek.startDate OR last
 * week whose startDate <= now) gets a 3px burnt-orange left border.
 */

export interface CurriculumWeekItem {
  id: string | number;
  weekNumber: number;
  skillName: string;
  topicTags: string[];
  startDate: Date | string;
}

export interface CurriculumWeekListProps {
  weeks: CurriculumWeekItem[];
  onEdit?: (id: string | number) => void;
  onDelete?: (id: string | number) => void;
  now?: Date; // injectable for tests
}

function toDate(v: Date | string): Date {
  return typeof v === 'string' ? new Date(v) : v;
}

function formatDate(d: Date): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

type Status = 'taught' | 'this-week' | 'upcoming';

function computeStatuses(
  weeks: CurriculumWeekItem[],
  now: Date,
): Status[] {
  // Sort ascending by startDate for status computation, map back to original order.
  const indexed = weeks.map((w, i) => ({ i, start: toDate(w.startDate) }));
  const sorted = [...indexed].sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );
  const statuses: Status[] = new Array(weeks.length).fill('upcoming');

  // Find last entry with start <= now → that's "this week"; earlier ones "taught".
  let currentIdx = -1;
  for (let k = 0; k < sorted.length; k++) {
    if (sorted[k].start.getTime() <= now.getTime()) {
      currentIdx = k;
    } else {
      break;
    }
  }
  if (currentIdx >= 0) {
    for (let k = 0; k < currentIdx; k++) {
      statuses[sorted[k].i] = 'taught';
    }
    statuses[sorted[currentIdx].i] = 'this-week';
  }
  return statuses;
}

function statusLabel(s: Status): string {
  return s === 'taught'
    ? 'Taught'
    : s === 'this-week'
      ? 'This Week'
      : 'Upcoming';
}

function statusColor(s: Status): string {
  return s === 'taught'
    ? 'var(--success)'
    : s === 'this-week'
      ? 'var(--accent)'
      : 'var(--muted)';
}

export function CurriculumWeekList({
  weeks,
  onEdit,
  onDelete,
  now,
}: CurriculumWeekListProps) {
  const currentNow = now ?? new Date();
  const statuses = computeStatuses(weeks, currentNow);

  if (weeks.length === 0) {
    return (
      <div
        style={{
          padding: '48px 24px',
          textAlign: 'center',
          color: 'var(--muted)',
          fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
          fontSize: '14px',
          fontStyle: 'italic',
        }}
      >
        No curriculum weeks yet.
      </div>
    );
  }

  return (
    <ol
      role="list"
      style={{
        listStyle: 'none',
        margin: 0,
        padding: 0,
      }}
    >
      {weeks.map((week, idx) => {
        const status = statuses[idx];
        const isCurrent = status === 'this-week';
        return (
          <li
            key={String(week.id)}
            data-testid="curriculum-week-row"
            data-status={status}
            style={{
              padding: '20px 24px 20px 24px',
              borderBottom: '1px solid var(--border-subtle)',
              borderLeft: isCurrent
                ? '3px solid var(--accent)'
                : '3px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '32px',
              backgroundColor: 'var(--surface)',
            }}
          >
            {/* Week number */}
            <div
              style={{
                flex: '0 0 72px',
                fontFamily: "var(--font-display), 'Clash Display', sans-serif",
                fontWeight: 600,
                fontSize: '28px',
                lineHeight: 1,
                color: 'var(--ink)',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.01em',
              }}
            >
              {week.weekNumber}
            </div>

            {/* Skill name + tags */}
            <div
              style={{
                flex: '1 1 auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                minWidth: 0,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-display), 'Clash Display', sans-serif",
                  fontWeight: 600,
                  fontSize: '22px',
                  color: 'var(--ink)',
                  letterSpacing: '-0.01em',
                }}
              >
                {week.skillName}
              </span>
              {week.topicTags.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    gap: '6px',
                    flexWrap: 'wrap',
                  }}
                >
                  {week.topicTags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        backgroundColor: 'var(--surface-muted)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '9999px',
                        padding: '4px 12px',
                        fontSize: '12px',
                        fontFamily:
                          "var(--font-dm-sans), 'DM Sans', sans-serif",
                        color: 'var(--muted)',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Date + status */}
            <div
              style={{
                flex: '0 0 auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '4px',
                minWidth: '120px',
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
                  fontSize: '14px',
                  color: 'var(--muted)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatDate(toDate(week.startDate))}
              </span>
              <span
                style={{
                  fontFamily:
                    "var(--font-jetbrains-mono), 'JetBrains Mono', monospace",
                  fontWeight: 500,
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: statusColor(status),
                }}
              >
                {statusLabel(status)}
              </span>
            </div>

            {/* Actions */}
            {(onEdit || onDelete) && (
              <div
                style={{
                  flex: '0 0 auto',
                  display: 'flex',
                  gap: '8px',
                }}
              >
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(week.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--muted)',
                      fontFamily:
                        "var(--font-dm-sans), 'DM Sans', sans-serif",
                      fontSize: '13px',
                      fontWeight: 500,
                      padding: '4px 8px',
                      borderRadius: '6px',
                      cursor: 'pointer',
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
                    onClick={() => onDelete(week.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--muted)',
                      fontFamily:
                        "var(--font-dm-sans), 'DM Sans', sans-serif",
                      fontSize: '13px',
                      fontWeight: 500,
                      padding: '4px 8px',
                      borderRadius: '6px',
                      cursor: 'pointer',
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
          </li>
        );
      })}
    </ol>
  );
}

export default CurriculumWeekList;
