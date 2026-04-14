interface EmptyGapStateProps {
  sessionCount: number
}

export default function EmptyGapState({ sessionCount }: EmptyGapStateProps) {
  const needed = Math.max(0, 3 - sessionCount)

  return (
    <div
      style={{
        paddingTop: '48px',
        paddingBottom: '48px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: '8px',
      }}
    >
      <p
        style={{
          fontSize: '16px',
          fontFamily: 'DM Sans, sans-serif',
          fontWeight: 400,
          color: 'var(--ink)',
          margin: 0,
        }}
      >
        {needed} more session{needed !== 1 ? 's' : ''} needed for gap analysis
      </p>
      <p
        style={{
          fontSize: '14px',
          fontFamily: 'DM Sans, sans-serif',
          fontWeight: 400,
          color: 'var(--muted)',
          margin: 0,
        }}
      >
        {sessionCount} of 3 minimum sessions completed
      </p>
    </div>
  )
}
