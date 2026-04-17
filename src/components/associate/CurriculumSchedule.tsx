'use client';

import { WeekRow } from './WeekRow';

interface ScheduleWeek {
  weekNumber: number;
  skillName: string;
  startDate: string;
  topics: { topicName: string; score: number | null }[];
  timeState: 'past' | 'current' | 'future';
}

interface CurriculumScheduleProps {
  weeks: ScheduleWeek[];
}

/**
 * Full curriculum schedule grid composing WeekRow components.
 * Determines defaultExpanded: current week + prior week are expanded by default.
 */
export function CurriculumSchedule({ weeks }: CurriculumScheduleProps) {
  // Find the index of the current week
  const currentIdx = weeks.findIndex((w) => w.timeState === 'current');

  // If no current week, find the last past week index
  const lastPastIdx =
    currentIdx === -1
      ? weeks.reduce((last, w, i) => (w.timeState === 'past' ? i : last), -1)
      : -1;

  function isDefaultExpanded(week: ScheduleWeek, index: number): boolean {
    if (currentIdx !== -1) {
      // current week or the week immediately before it
      return index === currentIdx || index === currentIdx - 1;
    }
    // No current week: expand the last past week
    if (lastPastIdx !== -1) {
      return index === lastPastIdx;
    }
    return false;
  }

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}
    >
      {weeks.length === 0 ? (
        <p
          style={{
            padding: '24px',
            fontSize: '14px',
            color: 'var(--muted)',
            fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
            margin: 0,
          }}
        >
          No curriculum weeks have been configured yet.
        </p>
      ) : (
        weeks.map((week, index) => (
          <WeekRow
            key={week.weekNumber}
            weekNumber={week.weekNumber}
            skillName={week.skillName}
            startDate={week.startDate}
            topics={week.topics}
            timeState={week.timeState}
            defaultExpanded={isDefaultExpanded(week, index)}
          />
        ))
      )}
    </div>
  );
}
