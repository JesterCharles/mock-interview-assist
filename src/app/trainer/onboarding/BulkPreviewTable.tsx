'use client';

import type { PreviewRow } from '@/lib/bulkInvitePreview';

interface BulkPreviewTableProps {
  rows: PreviewRow[];
  onToggleRow: (index: number) => void;
  onConfirm: () => void;
  onBack: () => void;
  isSending: boolean;
}

const ACTION_BADGE_STYLES: Record<
  PreviewRow['action'],
  { background: string; color: string }
> = {
  new: { background: 'var(--success-bg)', color: 'var(--success)' },
  reassign: { background: 'var(--success-bg)', color: 'var(--success)' },
  'skip-same-cohort': { background: 'var(--surface-muted)', color: 'var(--muted)' },
  'skip-recently-invited': { background: 'var(--surface-muted)', color: 'var(--muted)' },
  'skip-invalid': { background: 'var(--danger-bg)', color: 'var(--danger)' },
};

const ACTION_LABELS: Record<PreviewRow['action'], string> = {
  new: 'New',
  reassign: 'Reassign cohort',
  'skip-same-cohort': 'Skip — same cohort',
  'skip-recently-invited': 'Skip — recently invited',
  'skip-invalid': 'Skip — invalid email',
};

export function BulkPreviewTable({
  rows,
  onToggleRow,
  onConfirm,
  onBack,
  isSending,
}: BulkPreviewTableProps) {
  const invited = rows.filter(r => r.action === 'new' && r.checked).length;
  const reassigned = rows.filter(r => r.action === 'reassign' && r.checked).length;
  const skipped = rows.filter(r => !r.checkable).length;
  const actionableCheckedCount = rows.filter(r => r.checkable && r.checked).length;

  const willBeInvited = rows.filter(r => r.action === 'new').length;
  const willBeReassigned = rows.filter(r => r.action === 'reassign').length;
  const willBeSkipped = rows.filter(r => !r.checkable).length;

  return (
    <div>
      {/* Preview summary */}
      <p
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '16px',
          fontWeight: 400,
          color: 'var(--muted)',
          margin: '0 0 16px',
        }}
      >
        {willBeInvited} will be invited{' '}
        <span style={{ color: 'var(--muted)' }}>·</span>{' '}
        {willBeReassigned} will be reassigned{' '}
        <span style={{ color: 'var(--muted)' }}>·</span>{' '}
        {willBeSkipped} will be skipped
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
              <th style={{ width: '40px', padding: '8px 12px' }} />
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
                Action
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
            {rows.map((row, index) => {
              const badgeStyle = ACTION_BADGE_STYLES[row.action];
              return (
                <tr
                  key={`${row.email}-${index}`}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    opacity: isSending ? 0.5 : 1,
                    transition: 'background 150ms ease-out',
                    cursor: 'default',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLTableRowElement).style.background =
                      'var(--highlight)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLTableRowElement).style.background = '';
                  }}
                >
                  <td style={{ width: '40px', padding: '8px 12px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={row.checked}
                      disabled={!row.checkable || isSending}
                      onChange={() => onToggleRow(index)}
                      title={row.checkable ? 'Exclude from batch' : undefined}
                      style={{
                        cursor: row.checkable ? 'pointer' : 'not-allowed',
                        opacity: row.checkable ? 1 : 0.4,
                      }}
                    />
                  </td>
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
                      {ACTION_LABELS[row.action]}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '12px',
                      fontWeight: 400,
                      color: 'var(--muted)',
                    }}
                  >
                    {row.notes}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button
          type="button"
          className="btn-accent-flat"
          onClick={onConfirm}
          disabled={actionableCheckedCount === 0 || isSending}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          {isSending ? (
            <>
              <Spinner />
              Sending...
            </>
          ) : (
            `Confirm & Send ${actionableCheckedCount} Invites`
          )}
        </button>
        <button
          type="button"
          className="btn-secondary-flat"
          onClick={onBack}
          disabled={isSending}
        >
          Back to Edit
        </button>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      style={{ animation: 'spin 1s linear infinite' }}
    >
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
      <path
        d="M14 8a6 6 0 0 0-6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}

export default BulkPreviewTable;
