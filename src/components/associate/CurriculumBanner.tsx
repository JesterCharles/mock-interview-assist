'use client';

interface CurriculumBannerProps {
  unassessedCount: number;
  interviewHref: string;
}

/**
 * Banner shown at top of curriculum when there are unassessed topics this week.
 * Renders nothing when unassessedCount is 0.
 */
export function CurriculumBanner({ unassessedCount, interviewHref }: CurriculumBannerProps) {
  if (unassessedCount <= 0) return null;

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
      }}
    >
      <span
        style={{
          fontSize: '14px',
          fontWeight: 500,
          color: 'var(--ink)',
          fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
        }}
      >
        {unassessedCount} topic{unassessedCount !== 1 ? 's' : ''} unassessed this week
      </span>
      <a
        href={interviewHref}
        style={{
          backgroundColor: 'var(--accent)',
          color: '#ffffff',
          fontSize: '13px',
          fontWeight: 600,
          fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
          borderRadius: '8px',
          padding: '8px 16px',
          textDecoration: 'none',
          transition: 'background-color 150ms ease',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.backgroundColor =
            'var(--accent-hover)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'var(--accent)';
        }}
      >
        Take a mock
      </a>
    </div>
  );
}
