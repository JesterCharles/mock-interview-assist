'use client';

interface ResultRow {
  email: string;
  status: string;
  error?: string;
}

interface BulkResultTableProps {
  results: ResultRow[];
  onInviteMore: () => void;
}

const STATUS_ORDER: Record<string, number> = {
  invited: 0,
  reassigned: 1,
  skipped: 2,
  failed: 3,
};

const STATUS_BADGE_STYLES: Record<string, { background: string; color: string }> = {
  invited: { background: '#E8F5EE', color: '#2D6A4F' },
  reassigned: { background: '#E8F5EE', color: '#2D6A4F' },
  skipped: { background: 'var(--surface-muted)', color: 'var(--muted)' },
  failed: { background: '#FDECEB', color: '#B83B2E' },
};

function getStatusStyle(status: string): { background: string; color: string } {
  return STATUS_BADGE_STYLES[status] ?? { background: 'var(--surface-muted)', color: 'var(--muted)' };
}

export function BulkResultTable({ results, onInviteMore }: BulkResultTableProps) {
  const sorted = [...results].sort((a, b) => {
    const aOrder = STATUS_ORDER[a.status] ?? 99;
    const bOrder = STATUS_ORDER[b.status] ?? 99;
    return aOrder - bOrder;
  });

  const invitedCount = results.filter(r => r.status === 'invited' || r.status === 'reassigned').length;
  const skippedCount = results.filter(r => r.status === 'skipped').length;
  const failedCount = results.filter(r => r.status === 'failed').length;

  return (
    <div>
      {/* Results summary */}
      <p
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '16px',
          fontWeight: 400,
          color: 'var(--muted)',
          margin: '0 0 16px',
        }}
      >
        {invitedCount} invited{' '}
        <span style={{ color: 'var(--muted)' }}>·</span>{' '}
        {skippedCount} skipped{' '}
        <span style={{ color: 'var(--muted)' }}>·</span>{' '}
        {failedCount} failed
      </p>

      {/* Table */}
      <div
        style={{
          width: '100%',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          overflow: 'hidden',
          marginBottom: '16px',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr
              style={{
                background: 'var(--surface-muted)',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <th
                style={{
                  padding: '8px 12px',
                  textAlign: 'left',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--muted)',
                }}
              >
                Email
              </th>
              <th
                style={{
                  padding: '8px 12px',
                  textAlign: 'left',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--muted)',
                }}
              >
                Status
              </th>
              <th
                style={{
                  padding: '8px 12px',
                  textAlign: 'left',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--muted)',
                }}
              >
                Notes
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, index) => {
              const badgeStyle = getStatusStyle(row.status);
              return (
                <tr
                  key={`${row.email}-${index}`}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    transition: 'background 150ms ease-out',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLTableRowElement).style.background =
                      'var(--highlight)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLTableRowElement).style.background = '';
                  }}
                >
                  <td
                    style={{
                      padding: '10px 12px',
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '13px',
                      fontWeight: 400,
                      color: 'var(--ink)',
                    }}
                  >
                    {row.email}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        background: badgeStyle.background,
                        color: badgeStyle.color,
                        borderRadius: '9999px',
                        padding: '2px 10px',
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: '12px',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '12px',
                      fontWeight: 400,
                      color: row.status === 'failed' ? 'var(--danger)' : 'var(--muted)',
                    }}
                  >
                    {row.error ?? ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Invite More button */}
      <button
        type="button"
        className="btn-secondary-flat"
        onClick={onInviteMore}
      >
        Invite More
      </button>
    </div>
  );
}

export default BulkResultTable;
