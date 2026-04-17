'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { TopicCell } from './TopicCell';

type TimeState = 'past' | 'current' | 'future';

interface TopicScore {
  topicName: string;
  score: number | null;
}

interface WeekRowProps {
  weekNumber: number;
  skillName: string;
  startDate: string; // ISO date string for display
  topics: TopicScore[];
  timeState: TimeState;
  defaultExpanded: boolean;
}

/**
 * Collapsible week row showing skill name, date, and topic cells.
 * Current week gets accent left border; future weeks are muted (opacity 0.5).
 */
export function WeekRow({
  weekNumber,
  skillName,
  startDate,
  topics,
  timeState,
  defaultExpanded,
}: WeekRowProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const formattedDate = new Date(startDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  const containerStyle: React.CSSProperties = {
    background: 'var(--surface)',
    borderRadius: 0,
    opacity: timeState === 'future' ? 0.5 : 1,
    borderLeft: timeState === 'current' ? '3px solid var(--accent)' : '3px solid transparent',
  };

  return (
    <div style={containerStyle}>
      {/* Header row */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded((prev) => !prev);
          }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 16px',
          cursor: 'pointer',
          borderBottom: '1px solid var(--border-subtle)',
          userSelect: 'none',
        }}
      >
        {/* Week number badge */}
        <span
          style={{
            fontSize: '12px',
            fontWeight: 600,
            fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
            backgroundColor: 'var(--surface-muted)',
            color: 'var(--ink)',
            borderRadius: '4px',
            padding: '2px 8px',
            flexShrink: 0,
          }}
        >
          W{weekNumber}
        </span>

        {/* Skill name */}
        <span
          style={{
            fontSize: '14px',
            fontWeight: 500,
            fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
            color: 'var(--ink)',
            flex: 1,
          }}
        >
          {skillName}
        </span>

        {/* Date */}
        <span
          style={{
            fontSize: '12px',
            fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
            color: 'var(--muted)',
            flexShrink: 0,
          }}
        >
          {formattedDate}
        </span>

        {/* Collapsed topic count */}
        {!expanded && (
          <span
            style={{
              fontSize: '12px',
              fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
              color: 'var(--muted)',
              flexShrink: 0,
            }}
          >
            {topics.length} topic{topics.length !== 1 ? 's' : ''}
          </span>
        )}

        {/* Chevron */}
        <ChevronDown
          size={16}
          color="var(--muted)"
          style={{
            flexShrink: 0,
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 200ms ease-out',
          }}
        />
      </div>

      {/* Expanded body */}
      {expanded && (
        <div
          style={{
            padding: '12px 16px 16px',
            background: 'var(--surface)',
          }}
        >
          {topics.length === 0 ? (
            <p
              style={{
                fontSize: '13px',
                color: 'var(--muted)',
                fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
                margin: 0,
              }}
            >
              No topics defined for this week.
            </p>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                gap: '12px',
              }}
            >
              {topics.map((topic) => (
                <TopicCell
                  key={topic.topicName}
                  topicName={topic.topicName}
                  score={topic.score}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
