'use client'

interface SkillFilterDropdownProps {
  skills: string[]
  selectedSkill: string
  onSelect: (skill: string) => void
}

export default function SkillFilterDropdown({
  skills,
  selectedSkill,
  onSelect,
}: SkillFilterDropdownProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label
        style={{
          fontSize: '11px',
          fontFamily: 'JetBrains Mono, monospace',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          color: 'var(--muted)',
        }}
      >
        skill
      </label>
      <select
        value={selectedSkill}
        onChange={(e) => onSelect(e.target.value)}
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '14px',
          fontWeight: 400,
          color: 'var(--ink)',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '6px 10px',
          cursor: 'pointer',
          outline: 'none',
          width: '100%',
          appearance: 'auto',
        }}
      >
        {skills.map((skill) => (
          <option key={skill} value={skill}>
            {skill}
          </option>
        ))}
      </select>
    </div>
  )
}
