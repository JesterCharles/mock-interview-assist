export default function UsersPage() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '48px 24px',
      }}
    >
      <div style={{ maxWidth: '480px', textAlign: 'center' }}>
        <h1
          style={{
            fontFamily: 'var(--font-display), "Clash Display", sans-serif',
            fontWeight: 500,
            fontSize: '28px',
            color: 'var(--ink)',
            marginBottom: '12px',
            letterSpacing: '-0.01em',
          }}
        >
          Users
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-dm-sans), "DM Sans", sans-serif',
            fontSize: '16px',
            color: 'var(--muted)',
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          User management and role assignment. Coming in a future release.
        </p>
      </div>
    </div>
  )
}
