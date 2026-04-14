'use client';

/**
 * CohortForm — DESIGN.md-styled create/edit form for cohorts.
 *
 * Tokens only. Mirrors the DESIGN.md field pattern:
 *   - Label: 13px DM Sans 500 uppercase tracking-wider, var(--muted)
 *   - Input: 16px DM Sans on var(--bg), border var(--border), focus border var(--accent)
 *   - Submit: .btn-accent-flat; Cancel: .btn-secondary-flat
 *
 * Client-side validation:
 *   - name required, 1–80 chars
 *   - endDate >= startDate (if both provided)
 */

import { useState, type FormEvent } from 'react';

export interface CohortInput {
  name: string;
  startDate: string; // yyyy-mm-dd
  endDate: string; // yyyy-mm-dd or ''
  description: string;
}

export interface CohortFormProps {
  initial?: Partial<CohortInput>;
  onSubmit: (input: CohortInput) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel?: string;
  title?: string;
}

const EMPTY: CohortInput = {
  name: '',
  startDate: '',
  endDate: '',
  description: '',
};

const LABEL_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
  fontSize: '13px',
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--muted)',
  display: 'block',
  marginBottom: '6px',
};

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  backgroundColor: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '12px 16px',
  fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
  fontSize: '16px',
  color: 'var(--ink)',
  outline: 'none',
  boxSizing: 'border-box',
};

const ERROR_STYLE: React.CSSProperties = {
  color: 'var(--danger)',
  fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
  fontSize: '13px',
  marginTop: '4px',
  display: 'block',
};

export function CohortForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = 'Save',
  title,
}: CohortFormProps) {
  const [state, setState] = useState<CohortInput>({ ...EMPTY, ...initial });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [topError, setTopError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};
    const name = state.name.trim();
    if (!name) errs.name = 'Name is required';
    else if (name.length > 80) errs.name = 'Name must be 80 characters or fewer';
    if (!state.startDate) errs.startDate = 'Start date is required';
    if (state.endDate && state.startDate) {
      if (new Date(state.endDate) < new Date(state.startDate)) {
        errs.endDate = 'End date must be on or after start date';
      }
    }
    return errs;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTopError(null);
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await onSubmit({
        ...state,
        name: state.name.trim(),
        description: state.description.trim(),
      });
    } catch (err) {
      setTopError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {title && (
        <h2
          style={{
            fontFamily: "var(--font-display), 'Clash Display', sans-serif",
            fontWeight: 600,
            fontSize: '22px',
            color: 'var(--ink)',
            margin: 0,
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </h2>
      )}

      {topError && (
        <div
          role="alert"
          style={{
            backgroundColor: 'var(--surface-muted)',
            border: '1px solid var(--danger)',
            borderRadius: '8px',
            padding: '12px 16px',
            color: 'var(--danger)',
            fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
            fontSize: '14px',
          }}
        >
          {topError}
        </div>
      )}

      <div>
        <label htmlFor="cohort-form-name" style={LABEL_STYLE}>
          Name
        </label>
        <input
          id="cohort-form-name"
          type="text"
          maxLength={80}
          value={state.name}
          onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)';
          }}
          style={INPUT_STYLE}
          aria-invalid={!!errors.name}
        />
        {errors.name && <span style={ERROR_STYLE}>{errors.name}</span>}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
        }}
      >
        <div>
          <label htmlFor="cohort-form-start" style={LABEL_STYLE}>
            Start Date
          </label>
          <input
            id="cohort-form-start"
            type="date"
            value={state.startDate}
            onChange={(e) =>
              setState((s) => ({ ...s, startDate: e.target.value }))
            }
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
            style={INPUT_STYLE}
            aria-invalid={!!errors.startDate}
          />
          {errors.startDate && (
            <span style={ERROR_STYLE}>{errors.startDate}</span>
          )}
        </div>
        <div>
          <label htmlFor="cohort-form-end" style={LABEL_STYLE}>
            End Date
          </label>
          <input
            id="cohort-form-end"
            type="date"
            value={state.endDate}
            onChange={(e) =>
              setState((s) => ({ ...s, endDate: e.target.value }))
            }
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
            style={INPUT_STYLE}
            aria-invalid={!!errors.endDate}
          />
          {errors.endDate && <span style={ERROR_STYLE}>{errors.endDate}</span>}
        </div>
      </div>

      <div>
        <label htmlFor="cohort-form-desc" style={LABEL_STYLE}>
          Description
        </label>
        <textarea
          id="cohort-form-desc"
          value={state.description}
          onChange={(e) =>
            setState((s) => ({ ...s, description: e.target.value }))
          }
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)';
          }}
          rows={3}
          style={{ ...INPUT_STYLE, resize: 'vertical', minHeight: '80px' }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
        }}
      >
        {onCancel && (
          <button
            type="button"
            className="btn-secondary-flat"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="btn-accent-flat"
          disabled={submitting}
        >
          {submitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}

export default CohortForm;
