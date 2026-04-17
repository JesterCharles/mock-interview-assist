'use client';

import { useState } from 'react';
import { FocusHero } from '@/components/associate/FocusHero';
import { SkillCardList } from '@/components/associate/SkillCardList';
import { SkillRadar } from '@/components/associate/SkillRadar';
import { ReadinessProgressBar } from '@/components/associate/ReadinessProgressBar';
import { computeSkillTrend } from '@/lib/vizUtils';
import type { GapScoreEntry, SessionSummary } from '@/lib/trainer-types';

interface AssociateDashboardClientProps {
  displayName: string;
  gapScores: GapScoreEntry[];
  sessions: SessionSummary[];
  readinessPercent: number;
  threshold: number;
  recommendedArea: string | null;
  lowestScore: number | null;
  lowestSkillSessionCount: number;
}

export function AssociateDashboardClient({
  gapScores,
  sessions,
  readinessPercent,
  threshold,
  recommendedArea,
  lowestSkillSessionCount,
}: AssociateDashboardClientProps) {
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);

  const focusTrend = recommendedArea
    ? computeSkillTrend(sessions, recommendedArea, gapScores)
    : { slope: 0, pointsDelta: 0, sessionCount: 0 };

  const lowestSkillScore = gapScores
    .filter((g) => g.topic === null || g.topic === '')
    .sort((a, b) => a.weightedScore - b.weightedScore)[0]?.weightedScore ?? null;

  const handleCardSelect = (skill: string | null) => {
    // Re-clicking the selected card deselects it (D-11)
    setSelectedSkill((prev) => (prev === skill ? null : skill));
  };

  const hasSessions = sessions.length > 0;

  if (!hasSessions) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '48px 16px',
          color: 'var(--muted)',
          fontSize: '16px',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
        }}
      >
        <p style={{ margin: '0 0 8px 0' }}>No mock interviews yet.</p>
        <p style={{ margin: 0, fontSize: '14px' }}>Book a mock to get started!</p>
      </div>
    );
  }

  return (
    <>
      {/* "All skills" chip — shown when a skill filter is active (D-11) */}
      {selectedSkill !== null && (
        <div style={{ marginBottom: '12px' }}>
          <button
            onClick={() => setSelectedSkill(null)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily:
                "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif",
              fontSize: '12px',
              fontWeight: 500,
              backgroundColor: 'var(--surface-muted)',
              border: '1px solid var(--border)',
              borderRadius: '9999px',
              padding: '4px 12px',
              cursor: 'pointer',
              color: 'var(--ink)',
            }}
          >
            All skills
            <span aria-hidden="true" style={{ fontWeight: 400, opacity: 0.7 }}>
              ×
            </span>
          </button>
        </div>
      )}

      {/* 2-column responsive grid (D-19, D-20) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.85fr_1fr] gap-6">
        {/* Left column: FocusHero → SkillCardList → SkillTrendChart */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <FocusHero
            skillName={recommendedArea}
            score={lowestSkillScore}
            slope={focusTrend.slope}
            pointsDelta={focusTrend.pointsDelta}
            sessionCount={lowestSkillSessionCount}
          />
          <SkillCardList
            gapScores={gapScores}
            sessions={sessions}
            selectedSkill={selectedSkill}
            onSelectSkill={handleCardSelect}
          />
        </div>

        {/* Right column: SkillRadar → ReadinessProgressBar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <SkillRadar
            gapScores={gapScores}
            sessions={sessions}
            selectedSkill={selectedSkill}
          />
          <ReadinessProgressBar
            readinessPercent={readinessPercent}
            threshold={threshold}
          />
        </div>
      </div>
    </>
  );
}
