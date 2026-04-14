'use client'

import { useState } from 'react'

interface AddCurriculumWeekFormProps {
  cohortId: number
  onWeekAdded: () => void
}

interface FormState {
  weekNumber: string
  skillName: string
  skillSlug: string
  topicTags: string
  startDate: string
}

interface FormErrors {
  weekNumber?: string
  skillName?: string
  skillSlug?: string
  startDate?: string
  form?: string
}

const EMPTY_FORM: FormState = {
  weekNumber: '',
  skillName: '',
  skillSlug: '',
  topicTags: '',
  startDate: '',
}

/** Auto-generate a lowercase-kebab slug from a display name */
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function AddCurriculumWeekForm({ cohortId, onWeekAdded }: AddCurriculumWeekFormProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)

  function handleSkillNameChange(value: string) {
    setForm((f) => ({
      ...f,
      skillName: value,
      // Only auto-fill slug if it's empty or was auto-generated
      skillSlug: f.skillSlug === '' || f.skillSlug === toSlug(f.skillName)
        ? toSlug(value)
        : f.skillSlug,
    }))
  }

  function validate(): FormErrors {
    const e: FormErrors = {}
    const wn = parseInt(form.weekNumber, 10)
    if (!form.weekNumber || isNaN(wn) || wn < 1) {
      e.weekNumber = 'Week number must be an integer ≥ 1'
    }
    if (!form.skillName.trim()) {
      e.skillName = 'Skill name is required'
    }
    if (!form.skillSlug.trim()) {
      e.skillSlug = 'Skill slug is required'
    } else if (!/^[a-z0-9][a-z0-9-]*$/.test(form.skillSlug.trim())) {
      e.skillSlug = 'Slug must be lowercase-kebab (a-z, 0-9, hyphens)'
    }
    if (!form.startDate) {
      e.startDate = 'Start date is required'
    }
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setErrors({})
    setSubmitting(true)
    try {
      const res = await fetch(`/api/cohorts/${cohortId}/curriculum`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekNumber: parseInt(form.weekNumber, 10),
          skillName: form.skillName.trim(),
          skillSlug: form.skillSlug.trim(),
          topicTags: form.topicTags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          startDate: form.startDate,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setErrors({ form: body.error ?? `Failed to add week (${res.status})` })
        return
      }

      setForm(EMPTY_FORM)
      onWeekAdded()
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Failed to add week' })
    } finally {
      setSubmitting(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    background: '#FFFFFF',
    border: '1px solid #DDD5C8',
    borderRadius: '8px',
    padding: '10px 12px',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '14px',
    color: '#1A1A1A',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    transition: 'border-color 150ms ease-out',
  }

  const inputErrorStyle: React.CSSProperties = {
    ...inputStyle,
    borderColor: '#B83B2E',
  }

  const fieldLabelStyle: React.CSSProperties = {
    fontSize: '11px',
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    color: '#7A7267',
    display: 'block',
    marginBottom: '6px',
  }

  const fieldErrorStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#B83B2E',
    fontFamily: "'DM Sans', sans-serif",
    marginTop: '4px',
  }

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #DDD5C8',
        borderRadius: '12px',
        padding: '24px',
        marginTop: '24px',
      }}
    >
      <h3
        style={{
          fontFamily: "'Clash Display', sans-serif",
          fontWeight: 600,
          fontSize: '22px',
          color: '#1A1A1A',
          margin: '0 0 16px 0',
        }}
      >
        Add Week
      </h3>

      {errors.form && (
        <div
          style={{
            background: '#FDECEB',
            border: '1px solid #B83B2E',
            borderRadius: '8px',
            padding: '10px 12px',
            color: '#B83B2E',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '13px',
            marginBottom: '16px',
          }}
        >
          {errors.form}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '80px 1fr 1fr',
            gap: '16px',
            marginBottom: '16px',
          }}
        >
          {/* Week Number */}
          <div>
            <label style={fieldLabelStyle} htmlFor="add-weekNumber">
              Week #
            </label>
            <input
              id="add-weekNumber"
              type="number"
              min={1}
              value={form.weekNumber}
              onChange={(e) => {
                setForm((f) => ({ ...f, weekNumber: e.target.value }))
                setErrors((err) => ({ ...err, weekNumber: undefined }))
              }}
              style={errors.weekNumber ? inputErrorStyle : inputStyle}
              placeholder="1"
              aria-describedby={errors.weekNumber ? 'err-weekNumber' : undefined}
            />
            {errors.weekNumber && (
              <p id="err-weekNumber" style={fieldErrorStyle}>
                {errors.weekNumber}
              </p>
            )}
          </div>

          {/* Skill Name */}
          <div>
            <label style={fieldLabelStyle} htmlFor="add-skillName">
              Skill Name
            </label>
            <input
              id="add-skillName"
              type="text"
              value={form.skillName}
              onChange={(e) => {
                handleSkillNameChange(e.target.value)
                setErrors((err) => ({ ...err, skillName: undefined }))
              }}
              style={errors.skillName ? inputErrorStyle : inputStyle}
              placeholder="e.g. React"
              aria-describedby={errors.skillName ? 'err-skillName' : undefined}
            />
            {errors.skillName && (
              <p id="err-skillName" style={fieldErrorStyle}>
                {errors.skillName}
              </p>
            )}
          </div>

          {/* Skill Slug */}
          <div>
            <label style={fieldLabelStyle} htmlFor="add-skillSlug">
              Skill Slug
            </label>
            <input
              id="add-skillSlug"
              type="text"
              value={form.skillSlug}
              onChange={(e) => {
                setForm((f) => ({
                  ...f,
                  skillSlug: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                }))
                setErrors((err) => ({ ...err, skillSlug: undefined }))
              }}
              style={{
                ...(errors.skillSlug ? inputErrorStyle : inputStyle),
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '13px',
              }}
              placeholder="e.g. react"
              aria-describedby={errors.skillSlug ? 'err-skillSlug' : undefined}
            />
            {errors.skillSlug && (
              <p id="err-skillSlug" style={fieldErrorStyle}>
                {errors.skillSlug}
              </p>
            )}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 180px',
            gap: '16px',
            marginBottom: '20px',
          }}
        >
          {/* Topic Tags */}
          <div>
            <label style={fieldLabelStyle} htmlFor="add-topicTags">
              Topic Tags{' '}
              <span style={{ textTransform: 'none', letterSpacing: 0, fontFamily: "'DM Sans', sans-serif", color: '#DDD5C8' }}>
                (comma-separated, optional)
              </span>
            </label>
            <input
              id="add-topicTags"
              type="text"
              value={form.topicTags}
              onChange={(e) => setForm((f) => ({ ...f, topicTags: e.target.value }))}
              style={inputStyle}
              placeholder="hooks, state, effects"
            />
          </div>

          {/* Start Date */}
          <div>
            <label style={fieldLabelStyle} htmlFor="add-startDate">
              Start Date
            </label>
            <input
              id="add-startDate"
              type="date"
              value={form.startDate}
              onChange={(e) => {
                setForm((f) => ({ ...f, startDate: e.target.value }))
                setErrors((err) => ({ ...err, startDate: undefined }))
              }}
              style={errors.startDate ? inputErrorStyle : inputStyle}
              aria-describedby={errors.startDate ? 'err-startDate' : undefined}
            />
            {errors.startDate && (
              <p id="err-startDate" style={fieldErrorStyle}>
                {errors.startDate}
              </p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            disabled={submitting}
            style={{
              background: submitting ? '#DDD5C8' : '#C85A2E',
              color: '#FFFFFF',
              border: `1px solid ${submitting ? '#DDD5C8' : '#C85A2E'}`,
              borderRadius: '8px',
              padding: '10px 24px',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '14px',
              fontWeight: 500,
              cursor: submitting ? 'not-allowed' : 'pointer',
              transition: 'background-color 150ms ease-out',
            }}
          >
            {submitting ? 'Adding…' : 'Add Week'}
          </button>
        </div>
      </form>
    </div>
  )
}
