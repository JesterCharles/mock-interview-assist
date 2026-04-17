export default function CurriculumPage() {
  return (
    <div
      style={{
        maxWidth: 480,
        margin: '0 auto',
        textAlign: 'center',
        padding: '64px 24px',
      }}
    >
      <h1
        style={{
          fontFamily: "var(--font-clash-display), 'Clash Display', system-ui, sans-serif",
          fontSize: 28,
          fontWeight: 600,
          margin: '0 0 12px',
          color: 'var(--ink)',
        }}
      >
        Curriculum
      </h1>
      <p
        style={{
          fontSize: 16,
          color: 'var(--muted)',
          margin: '0 0 8px',
          lineHeight: 1.5,
          fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
        }}
      >
        Your cohort&apos;s curriculum schedule is coming soon.
      </p>
      <p
        style={{
          fontSize: 14,
          color: 'var(--muted)',
          margin: 0,
          lineHeight: 1.5,
          fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
        }}
      >
        Check back after your trainer configures your cohort&apos;s weekly plan.
      </p>
    </div>
  );
}
