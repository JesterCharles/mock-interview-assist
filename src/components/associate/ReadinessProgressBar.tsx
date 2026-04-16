interface ReadinessProgressBarProps {
  readinessPercent: number;
  threshold: number;
}

export function ReadinessProgressBar({
  readinessPercent,
  threshold,
}: ReadinessProgressBarProps) {
  const clampedPercent = Math.min(Math.max(readinessPercent, 0), 100);

  let fillColor: string;
  if (clampedPercent >= threshold) {
    fillColor = 'var(--success)';
  } else if (clampedPercent >= threshold - 10) {
    fillColor = 'var(--warning)';
  } else {
    fillColor = 'var(--danger)';
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Bar container */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '12px',
          borderRadius: '6px',
          background: 'var(--border-subtle)',
        }}
      >
        {/* Fill */}
        <div
          style={{
            width: `${clampedPercent}%`,
            height: '100%',
            borderRadius: '6px',
            background: fillColor,
            transition: 'width 0.2s ease-out',
          }}
        />
        {/* Threshold marker */}
        <div
          style={{
            position: 'absolute',
            top: '-4px',
            left: `${threshold}%`,
            width: '2px',
            height: '20px',
            background: 'var(--ink)',
            opacity: 0.5,
            transform: 'translateX(-50%)',
          }}
        />
      </div>
      {/* Label */}
      <p
        style={{
          marginTop: '8px',
          fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
          fontSize: '14px',
          color: 'var(--ink)',
          margin: '8px 0 0 0',
        }}
      >
        Your Readiness:{' '}
        <strong style={{ fontVariantNumeric: 'tabular-nums' }}>
          {clampedPercent}%
        </strong>{' '}
        (Target: {threshold}%)
      </p>
    </div>
  );
}
