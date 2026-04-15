/**
 * ReadinessSummaryBar — aggregate readiness counts per DESIGN.md typography.
 *
 * Horizontal bar on a muted surface. Three large stat blocks with
 * Clash Display 48px tabular-nums numbers and 11px mono uppercase labels.
 * Tokens only — tone colors via var(--success|--accent|--danger).
 */

export interface ReadinessSummaryBarProps {
  ready: number;
  improving: number;
  notReady: number;
  cohortName: string;
}

interface BlockProps {
  value: number;
  label: string;
  color: string;
}

function Block({ value, label, color }: BlockProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <span
        style={{
          fontFamily: "var(--font-display), 'Clash Display', sans-serif",
          fontWeight: 600,
          fontSize: '48px',
          lineHeight: 1,
          color: 'var(--ink)',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.02em',
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
          color,
        }}
      >
        {label}
      </span>
    </div>
  );
}

export function ReadinessSummaryBar({
  ready,
  improving,
  notReady,
  cohortName,
}: ReadinessSummaryBarProps) {
  return (
    <section
      aria-label={`Readiness summary for ${cohortName}`}
      data-testid="readiness-summary-bar"
      style={{
        backgroundColor: 'var(--surface-muted)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '12px',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '48px',
        flexWrap: 'wrap',
        marginBottom: '24px',
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
          flex: '1 1 auto',
          minWidth: '180px',
        }}
      >
        {cohortName}
      </h2>
      <div style={{ display: 'flex', gap: '48px', flexWrap: 'wrap' }}>
        <Block value={ready} label="Ready" color="var(--success)" />
        <Block value={improving} label="Improving" color="var(--accent)" />
        <Block value={notReady} label="Not Ready" color="var(--danger)" />
      </div>
    </section>
  );
}

export default ReadinessSummaryBar;
