/**
 * LanguageToggle — Phase 40 Plan 03 Task 1
 *
 * Native <select> showing only the languages the challenge supports.
 * Emits `onChange(lang)` on selection.
 */
'use client';

const LABELS: Record<string, string> = {
  python: 'Python',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  java: 'Java',
  sql: 'SQL',
  csharp: 'C#',
};

export interface LanguageToggleProps {
  languages: string[];
  value: string;
  onChange: (lang: string) => void;
}

export function LanguageToggle({
  languages,
  value,
  onChange,
}: LanguageToggleProps) {
  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
      }}
    >
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
        Language
      </span>
      <select
        aria-label="Editor language"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          padding: '8px 10px',
          fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
          fontSize: '13px',
          color: 'var(--ink)',
          cursor: 'pointer',
          outline: 'none',
          minWidth: '140px',
        }}
      >
        {languages.map((l) => (
          <option key={l} value={l}>
            {LABELS[l] ?? l}
          </option>
        ))}
      </select>
    </label>
  );
}

export default LanguageToggle;
