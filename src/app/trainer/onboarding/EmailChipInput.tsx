'use client';

import { useRef, useCallback } from 'react';
import {
  parseEmails,
  getChipSummary,
  isOverCap,
  removeChip,
  type ParsedEmail,
} from '@/lib/emailParser';

const CAP = 50;

const CHIP_STYLES: Record<ParsedEmail['state'], { background: string; color: string }> = {
  valid: { background: '#E8F5EE', color: '#2D6A4F' },
  invalid: { background: '#FDECEB', color: '#B83B2E' },
  duplicate: { background: '#FEF3E0', color: '#B7791F' },
};

interface EmailChipInputProps {
  chips: ParsedEmail[];
  onChipsChange: (chips: ParsedEmail[]) => void;
}

export function EmailChipInput({ chips, onChipsChange }: EmailChipInputProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const summary = getChipSummary(chips);
  const overCap = isOverCap(chips, CAP);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onChipsChange(parseEmails(value));
      }, 150);
    },
    [onChipsChange],
  );

  const handleRemove = useCallback(
    (index: number) => {
      onChipsChange(removeChip(chips, index));
    },
    [chips, onChipsChange],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Textarea */}
      <textarea
        onChange={handleChange}
        placeholder="Paste emails — comma or newline separated"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '16px',
          minHeight: '120px',
          maxHeight: '240px',
          overflowY: 'auto',
          resize: 'vertical',
          fontSize: '13px',
          fontFamily: 'DM Sans, sans-serif',
          fontWeight: 400,
          color: 'var(--ink)',
          width: '100%',
          boxSizing: 'border-box',
          outline: 'none',
        }}
        onFocus={e => {
          e.target.style.outline = '2px solid var(--accent)';
          e.target.style.outlineOffset = '2px';
        }}
        onBlur={e => {
          e.target.style.outline = 'none';
        }}
      />

      {/* Chip list */}
      {chips.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            rowGap: '8px',
            maxHeight: '160px',
            overflowY: 'auto',
          }}
        >
          {chips.map((chip, index) => {
            const { background, color } = CHIP_STYLES[chip.state];
            return (
              <span
                key={`${chip.normalized}-${index}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  borderRadius: '9999px',
                  paddingTop: '6px',
                  paddingBottom: '6px',
                  paddingLeft: '12px',
                  paddingRight: '4px',
                  fontSize: '13px',
                  fontFamily: 'DM Sans, sans-serif',
                  fontWeight: 400,
                  background,
                  color,
                  gap: '4px',
                }}
              >
                {chip.value}
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  aria-label={`Remove ${chip.value}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '44px',
                    minHeight: '44px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color,
                    fontSize: '16px',
                    lineHeight: 1,
                    padding: '0 8px',
                    borderRadius: '9999px',
                  }}
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Count summary */}
      {chips.length > 0 && (
        <div
          style={{
            fontSize: '12px',
            fontFamily: 'DM Sans, sans-serif',
            fontWeight: 600,
            display: 'flex',
            gap: '4px',
            alignItems: 'center',
          }}
        >
          <span style={{ color: 'var(--success)' }}>{summary.valid} valid</span>
          <span style={{ color: 'var(--muted)' }}>·</span>
          <span style={{ color: 'var(--danger)' }}>{summary.invalid} invalid</span>
          <span style={{ color: 'var(--muted)' }}>·</span>
          <span style={{ color: 'var(--warning)' }}>{summary.duplicate} duplicate</span>
        </div>
      )}

      {/* Cap error */}
      {overCap && (
        <p
          style={{
            fontSize: '13px',
            fontFamily: 'DM Sans, sans-serif',
            fontWeight: 400,
            color: 'var(--danger)',
            margin: 0,
          }}
        >
          Maximum 50 emails per batch. Remove {summary.valid - CAP} to continue.
        </p>
      )}
    </div>
  );
}

export default EmailChipInput;
