/**
 * ReadinessSignal — typographic readiness display per DESIGN.md
 * "Readiness Signal Pattern".
 *
 * Format: "**82** ascending"
 *   - Score: Clash Display 700, tabular-nums (lg=64px / md=48px)
 *   - Trend word: DM Sans 600, 11px, lowercase, 0.08em tracking
 *   - Trend color: --success ascending | --accent climbing | --danger stalling
 *
 * No badge, no pill, no rounded background. Pure typography.
 */

export type ReadinessTrend = 'ascending' | 'climbing' | 'stalling';

interface ReadinessSignalProps {
  score: number;
  trend: ReadinessTrend;
  size?: 'lg' | 'md';
}

const TREND_COLOR: Record<ReadinessTrend, string> = {
  ascending: 'var(--success)',
  climbing: 'var(--accent)',
  stalling: 'var(--danger)',
};

export function ReadinessSignal({ score, trend, size = 'lg' }: ReadinessSignalProps) {
  const scoreSize = size === 'lg' ? '64px' : '48px';
  const trendColor = TREND_COLOR[trend];

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: '12px',
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-clash-display), 'Clash Display', system-ui, sans-serif",
          fontWeight: 700,
          fontSize: scoreSize,
          fontVariantNumeric: 'tabular-nums',
          color: 'var(--ink)',
          lineHeight: 1,
          letterSpacing: '-0.02em',
        }}
      >
        {Math.round(score)}
      </span>
      <span
        style={{
          fontFamily: "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif",
          fontWeight: 600,
          fontSize: '11px',
          color: trendColor,
          textTransform: 'lowercase',
          letterSpacing: '0.08em',
        }}
      >
        {trend}
      </span>
    </div>
  );
}

export default ReadinessSignal;
