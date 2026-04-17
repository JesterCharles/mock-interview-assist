import '../trainer.css'

export default function AssociateDetailLoading() {
  return (
    <div className="trainer-shell">
      <div
        style={{
          maxWidth: '1120px',
          margin: '0 auto',
          padding: '48px 24px',
        }}
      >
        {/* Header skeleton */}
        <div className="animate-pulse" style={{ marginBottom: '40px' }}>
          <div
            style={{
              height: '52px',
              width: '320px',
              borderRadius: '6px',
              backgroundColor: 'var(--border-subtle)',
              marginBottom: '12px',
            }}
          />
          <div
            style={{
              height: '16px',
              width: '180px',
              borderRadius: '4px',
              backgroundColor: 'var(--surface-muted)',
            }}
          />
        </div>

        {/* Content skeleton — asymmetric layout */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '3fr 2fr',
            gap: '24px',
          }}
        >
          {/* Left: session history skeleton */}
          <div>
            <div
              className="animate-pulse"
              style={{
                height: '11px',
                width: '100px',
                borderRadius: '3px',
                backgroundColor: 'var(--border-subtle)',
                marginBottom: '12px',
              }}
            />
            <div className="trainer-card" style={{ padding: 0, overflow: 'hidden' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse"
                  style={{
                    height: '44px',
                    borderBottom: '1px solid var(--border-subtle)',
                    backgroundColor: i % 2 === 0 ? 'var(--surface)' : 'var(--surface-muted)',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Right: chart + calibration skeletons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="trainer-card">
              <div
                className="animate-pulse"
                style={{
                  height: '11px',
                  width: '80px',
                  borderRadius: '3px',
                  backgroundColor: 'var(--border-subtle)',
                  marginBottom: '16px',
                }}
              />
              <div
                className="animate-pulse"
                style={{
                  height: '200px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--surface-muted)',
                }}
              />
            </div>

            <div className="trainer-card">
              <div
                className="animate-pulse"
                style={{
                  height: '11px',
                  width: '120px',
                  borderRadius: '3px',
                  backgroundColor: 'var(--border-subtle)',
                  marginBottom: '16px',
                }}
              />
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse"
                  style={{
                    height: '32px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--surface-muted)',
                    marginBottom: '8px',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
