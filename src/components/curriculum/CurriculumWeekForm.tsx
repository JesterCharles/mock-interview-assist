'use client';

/**
 * CurriculumWeekForm — token-driven create/edit form for curriculum weeks.
 *
 * Mirrors CohortForm styling: DESIGN.md labels + inputs + btn-accent-flat.
 * Fields: weekNumber (number), skillName (text), topicTags (comma→array),
 * startDate (date).
 */

import { useState, type FormEvent } from 'react';

export interface CurriculumWeekInput {
  weekNumber: number;
  skillName: string;
  topicTags: string[];
  startDate: string; // yyyy-mm-dd
}

export interface CurriculumWeekFormProps {
  initial?: Partial<CurriculumWeekInput>;
  onSubmit: (input: CurriculumWeekInput) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel?: string;
  title?: string;
}

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

export function CurriculumWeekForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = 'Save Week',
  title = 'Add Curriculum Week',
}: CurriculumWeekFormProps) {
  const [weekNumber, setWeekNumber] = useState<string>(
    initial?.weekNumber != null ? String(initial.weekNumber) : '',
  );
  const [skillName, setSkillName] = useState<string>(initial?.skillName ?? '');
  const [topicTags, setTopicTags] = useState<string>(
    initial?.topicTags?.join(', ') ?? '',
  );
  const [startDate, setStartDate] = useState<string>(
    initial?.startDate ?? '',
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [topError, setTopError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};
    const wn = parseInt(weekNumber, 10);
    if (!weekNumber || Number.isNaN(wn) || wn < 1) {
      errs.weekNumber = 'Week number must be 1 or greater';
    }
    if (!skillName.trim()) errs.skillName = 'Skill name is required';
    if (!startDate) errs.startDate = 'Start date is required';
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
        weekNumber: parseInt(weekNumber, 10),
        skillName: skillName.trim(),
        topicTags: topicTags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        startDate,
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

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '120px 1fr',
          gap: '16px',
        }}
      >
        <div>
          <label htmlFor="cw-form-number" style={LABEL_STYLE}>
            Week #
          </label>
          <input
            id="cw-form-number"
            type="number"
            min={1}
            value={weekNumber}
            onChange={(e) => setWeekNumber(e.target.value)}
            style={INPUT_STYLE}
            aria-invalid={!!errors.weekNumber}
          />
          {errors.weekNumber && (
            <span style={ERROR_STYLE}>{errors.weekNumber}</span>
          )}
        </div>
        <div>
          <label htmlFor="cw-form-skill" style={LABEL_STYLE}>
            Skill Name
          </label>
          <input
            id="cw-form-skill"
            type="text"
            value={skillName}
            onChange={(e) => setSkillName(e.target.value)}
            style={INPUT_STYLE}
            aria-invalid={!!errors.skillName}
          />
          {errors.skillName && (
            <span style={ERROR_STYLE}>{errors.skillName}</span>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="cw-form-tags" style={LABEL_STYLE}>
          Topic Tags (comma-separated)
        </label>
        <input
          id="cw-form-tags"
          type="text"
          value={topicTags}
          onChange={(e) => setTopicTags(e.target.value)}
          placeholder="hooks, state, effects"
          style={INPUT_STYLE}
        />
      </div>

      <div>
        <label htmlFor="cw-form-start" style={LABEL_STYLE}>
          Start Date
        </label>
        <input
          id="cw-form-start"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          style={{ ...INPUT_STYLE, maxWidth: '240px' }}
          aria-invalid={!!errors.startDate}
        />
        {errors.startDate && <span style={ERROR_STYLE}>{errors.startDate}</span>}
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
        <button type="submit" className="btn-accent-flat" disabled={submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}

export default CurriculumWeekForm;
