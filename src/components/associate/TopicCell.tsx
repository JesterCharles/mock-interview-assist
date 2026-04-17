'use client';

import { getScoreColor } from '@/lib/scoreColors';

interface TopicCellProps {
  topicName: string;
  score: number | null; // null = unassessed
}

/**
 * Renders an individual topic cell with a color dot and topic name.
 * Unassessed topics show a grey dot with dashed border and hover tooltip.
 */
export function TopicCell({ topicName, score }: TopicCellProps) {
  const scoreColor = getScoreColor(score);
  const isAssessed = scoreColor !== null;

  return (
    <div
      className="topic-cell-wrapper"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        padding: '8px',
        minWidth: '80px',
        position: 'relative',
        cursor: isAssessed ? 'default' : 'help',
      }}
    >
      {/* Color dot container (relative for badge positioning) */}
      <div style={{ position: 'relative', width: '12px', height: '12px', flexShrink: 0 }}>
        <div
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: isAssessed ? scoreColor.token : 'var(--muted)',
            opacity: isAssessed ? 1 : 0.5,
            border: isAssessed ? 'none' : '1px dashed var(--border)',
            boxSizing: 'border-box',
          }}
        />
        {/* ? badge — only visible on hover for unassessed */}
        {!isAssessed && (
          <div
            className="topic-badge"
            style={{
              position: 'absolute',
              top: '-6px',
              right: '-6px',
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              backgroundColor: 'var(--surface-muted)',
              color: 'var(--muted)',
              fontSize: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0,
              transition: 'opacity 150ms ease',
              lineHeight: 1,
              fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
            }}
          >
            ?
          </div>
        )}
      </div>

      {/* Topic name */}
      <span
        style={{
          fontSize: '13px',
          fontWeight: 500,
          color: isAssessed ? 'var(--ink)' : 'var(--muted)',
          textAlign: 'center',
          lineHeight: 1.3,
          fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
        }}
      >
        {topicName}
      </span>

      {/* Hover tooltip — only for unassessed */}
      {!isAssessed && (
        <div
          className="topic-tooltip"
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '4px',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            padding: '6px 10px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
            whiteSpace: 'nowrap',
            fontSize: '12px',
            color: 'var(--muted)',
            fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
            opacity: 0,
            pointerEvents: 'none',
            transition: 'opacity 150ms ease',
            zIndex: 10,
          }}
        >
          Not yet assessed — take a mock to evaluate
        </div>
      )}

      <style>{`
        .topic-cell-wrapper:hover .topic-tooltip { opacity: 1; }
        .topic-cell-wrapper:hover .topic-badge { opacity: 1; }
      `}</style>
    </div>
  );
}
