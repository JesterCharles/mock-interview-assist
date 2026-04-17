'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from 'lucide-react';
import { getScoreColor, getTrendDirection, computeSkillTrend } from '@/lib/vizUtils';
import type { GapScoreEntry, SessionSummary } from '@/lib/trainer-types';

interface SkillCardListProps {
  gapScores: GapScoreEntry[];
  sessions: SessionSummary[];
  selectedSkill: string | null;
  onSelectSkill: (skill: string | null) => void;
}

interface SkillData {
  skill: string;
  percent: number;
  color: string;
  slope: number;
  topics: Array<{ topic: string; percent: number; color: string }>;
}

function TrendArrow({ slope }: { slope: number }) {
  const direction = getTrendDirection(slope);
  if (direction === 'up') {
    return <TrendingUp size={16} style={{ color: 'var(--success)', flexShrink: 0 }} />;
  }
  if (direction === 'down') {
    return <TrendingDown size={16} style={{ color: 'var(--danger)', flexShrink: 0 }} />;
  }
  return <Minus size={16} style={{ color: 'var(--muted)', flexShrink: 0 }} />;
}

export function SkillCardList({
  gapScores,
  sessions,
  selectedSkill,
  onSelectSkill,
}: SkillCardListProps) {
  const [expandedSkills, setExpandedSkills] = useState<Set<string>>(new Set());

  if (!gapScores || gapScores.length === 0) return null;

  // Group by skill — skill-level entries have topic === null or ''
  const skillMap = new Map<string, { skillEntry: GapScoreEntry | null; topics: GapScoreEntry[] }>();

  for (const entry of gapScores) {
    const isSkillLevel = entry.topic === null || entry.topic === '';
    if (!skillMap.has(entry.skill)) {
      skillMap.set(entry.skill, { skillEntry: null, topics: [] });
    }
    const group = skillMap.get(entry.skill)!;
    if (isSkillLevel) {
      group.skillEntry = entry;
    } else {
      group.topics.push(entry);
    }
  }

  // Build skill data array, sorted strongest first (D-02).
  // Skill-level bar renders as mean(topic scores) when topics exist, so the
  // hierarchy stays coherent (skill bar never disagrees with its topics).
  // Falls back to stored skill-level score when no topics are present.
  const skills: SkillData[] = [];
  for (const [skill, { skillEntry, topics }] of skillMap) {
    if (!skillEntry && topics.length === 0) continue;
    const topicData = topics.map((t) => {
      const tPercent = Math.round(t.weightedScore * 100);
      return { topic: t.topic ?? '', percent: tPercent, color: getScoreColor(tPercent) };
    });
    const percent = topicData.length > 0
      ? Math.round(topicData.reduce((a, t) => a + t.percent, 0) / topicData.length)
      : Math.round((skillEntry?.weightedScore ?? 0) * 100);
    const color = getScoreColor(percent);
    const { slope } = computeSkillTrend(sessions, skill, gapScores);
    skills.push({ skill, percent, color, slope, topics: topicData });
  }

  skills.sort((a, b) => b.percent - a.percent);

  function toggleExpand(skill: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setExpandedSkills((prev) => {
      const next = new Set(prev);
      if (next.has(skill)) {
        next.delete(skill);
      } else {
        next.add(skill);
      }
      return next;
    });
  }

  function handleCardClick(skill: string) {
    // Toggle select (filter)
    onSelectSkill(selectedSkill === skill ? null : skill);
    // Also expand
    setExpandedSkills((prev) => {
      const next = new Set(prev);
      if (selectedSkill === skill) {
        // Deselecting — collapse
        next.delete(skill);
      } else {
        next.add(skill);
      }
      return next;
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {skills.map(({ skill, percent, color, slope, topics }) => {
        const isSelected = selectedSkill === skill;
        const isExpanded = expandedSkills.has(skill);

        return (
          <div
            key={skill}
            role="button"
            tabIndex={0}
            onClick={() => handleCardClick(skill)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCardClick(skill); }}
            style={{
              background: 'var(--surface)',
              border: isSelected
                ? '2px solid var(--accent)'
                : '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: isSelected ? '15px' : '16px',
              cursor: 'pointer',
              transition: 'border-color 150ms ease-out',
            }}
          >
            {/* Skill row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Skill name */}
              <span
                style={{
                  fontFamily: 'var(--font-dm-sans), DM Sans, system-ui, sans-serif',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--ink)',
                  whiteSpace: 'nowrap',
                  minWidth: '80px',
                }}
              >
                {skill}
              </span>

              {/* Fill bar */}
              <div
                style={{
                  flex: 1,
                  height: '8px',
                  borderRadius: '4px',
                  background: 'var(--border-subtle)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${percent}%`,
                    height: '100%',
                    background: color,
                    borderRadius: '4px',
                    transition: 'width 300ms ease-out',
                  }}
                />
              </div>

              {/* Score % */}
              <span
                style={{
                  fontFamily: 'var(--font-dm-sans), DM Sans, system-ui, sans-serif',
                  fontSize: '14px',
                  fontWeight: 600,
                  color,
                  whiteSpace: 'nowrap',
                  minWidth: '36px',
                  textAlign: 'right',
                }}
              >
                {percent}%
              </span>

              {/* Trend arrow */}
              <TrendArrow slope={slope} />

              {/* Expand/collapse chevron */}
              {topics.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => toggleExpand(skill, e)}
                  aria-label={isExpanded ? 'Collapse topics' : 'Expand topics'}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0',
                    display: 'flex',
                    alignItems: 'center',
                    color: 'var(--muted)',
                    flexShrink: 0,
                  }}
                >
                  {isExpanded
                    ? <ChevronUp size={16} />
                    : <ChevronDown size={16} />}
                </button>
              )}
            </div>

            {/* Topic breakdown — animated expand/collapse */}
            <div
              style={{
                display: 'grid',
                gridTemplateRows: isExpanded ? '1fr' : '0fr',
                transition: 'grid-template-rows 200ms ease-out',
              }}
            >
              <div style={{ overflow: 'hidden' }}>
                {topics.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '12px' }}>
                    {topics.map(({ topic, percent: tPercent, color: tColor }) => (
                      <div key={topic} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {/* Topic name */}
                        <span
                          style={{
                            fontFamily: 'var(--font-dm-sans), DM Sans, system-ui, sans-serif',
                            fontSize: '13px',
                            fontWeight: 400,
                            color: 'var(--muted)',
                            whiteSpace: 'nowrap',
                            minWidth: '80px',
                          }}
                        >
                          {topic}
                        </span>

                        {/* Topic fill bar */}
                        <div
                          style={{
                            flex: 1,
                            height: '6px',
                            borderRadius: '3px',
                            background: 'var(--border-subtle)',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${tPercent}%`,
                              height: '100%',
                              background: tColor,
                              borderRadius: '3px',
                              transition: 'width 300ms ease-out',
                            }}
                          />
                        </div>

                        {/* Topic score % */}
                        <span
                          style={{
                            fontFamily: 'var(--font-dm-sans), DM Sans, system-ui, sans-serif',
                            fontSize: '13px',
                            fontWeight: 500,
                            color: tColor,
                            whiteSpace: 'nowrap',
                            minWidth: '36px',
                            textAlign: 'right',
                          }}
                        >
                          {tPercent}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
