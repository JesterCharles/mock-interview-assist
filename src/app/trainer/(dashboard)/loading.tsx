import './trainer.css'

export default function TrainerLoading() {
  return (
    <div className="trainer-shell">
      <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '48px 24px' }}>
        {/* Page title placeholder */}
        <div
          className="animate-pulse"
          style={{
            height: '48px',
            width: '280px',
            backgroundColor: '#DDD5C8',
            borderRadius: '6px',
            marginBottom: '40px',
          }}
        />

        {/* Section label placeholder */}
        <div
          className="animate-pulse"
          style={{
            height: '12px',
            width: '60px',
            backgroundColor: '#E8E2D9',
            borderRadius: '4px',
            marginBottom: '12px',
          }}
        />

        {/* Table placeholder */}
        <div className="trainer-card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Header row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1.5fr 0.8fr 1.2fr 1.5fr',
              gap: '12px',
              padding: '12px',
              borderBottom: '1px solid #DDD5C8',
            }}
          >
            {[60, 40, 80, 55, 80, 100].map((w, i) => (
              <div
                key={i}
                className="animate-pulse"
                style={{
                  height: '11px',
                  width: `${w}px`,
                  backgroundColor: '#E8E2D9',
                  borderRadius: '4px',
                }}
              />
            ))}
          </div>

          {/* Data rows */}
          {Array.from({ length: 6 }).map((_, rowIdx) => (
            <div
              key={rowIdx}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1.5fr 0.8fr 1.2fr 1.5fr',
                gap: '12px',
                padding: '14px 12px',
                borderBottom: '1px solid #E8E2D9',
              }}
            >
              {[120, 80, 90, 30, 90, 110].map((w, i) => (
                <div
                  key={i}
                  className="animate-pulse"
                  style={{
                    height: '14px',
                    width: `${w}px`,
                    backgroundColor: '#F0EBE2',
                    borderRadius: '4px',
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
