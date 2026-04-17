'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { GapScoreEntry, SessionSummary } from '@/lib/trainer-types'

interface SkillTrendChartProps {
  gapScores: GapScoreEntry[]
  sessions: SessionSummary[]
  selectedSkill: string | null       // From dashboard filter
  onSelectSkill: (skill: string) => void  // To update dashboard filter
}

interface ChartDataPoint {
  date: string
  score: number | null
}

function buildTrendData(sessions: SessionSummary[]): ChartDataPoint[] {
  // Sessions arrive newest-first from server — reverse to chronological, cap at 20 (D-23)
  const ordered = [...sessions].reverse().slice(-20)

  return ordered.map((s) => ({
    date: new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: s.overallTechnicalScore != null ? Math.round(s.overallTechnicalScore) : null,
  }))
}

const tooltipStyle: React.CSSProperties = {
  backgroundColor: 'var(--surface)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-lg, 12px)',
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '13px',
  color: 'var(--ink)',
}

export function SkillTrendChart({
  gapScores,
  sessions,
  selectedSkill,
  onSelectSkill,
}: SkillTrendChartProps) {
  // Extract unique skills alphabetically from gapScores
  const skills = useMemo(() => {
    const skillSet = new Set<string>()
    for (const g of gapScores) {
      skillSet.add(g.skill)
    }
    return Array.from(skillSet).sort()
  }, [gapScores])

  // Internal state for currently displayed skill
  const [internalSkill, setInternalSkill] = useState<string>(
    selectedSkill ?? skills[0] ?? ''
  )

  // Sync internal state with dashboard filter changes
  useEffect(() => {
    if (selectedSkill && skills.includes(selectedSkill)) {
      setInternalSkill(selectedSkill)
    }
  }, [selectedSkill, skills])

  const handleSkillChange = (skill: string) => {
    setInternalSkill(skill)
    onSelectSkill(skill)
  }

  const chartData = useMemo(() => buildTrendData(sessions), [sessions])

  // Filter out null scores for rendering — show only sessions with scores
  const filteredData = chartData.filter((d) => d.score !== null)

  if (skills.length === 0) {
    return (
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '16px',
        }}
      >
        <p
          style={{
            textAlign: 'center',
            color: 'var(--muted)',
            fontSize: '14px',
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          No trend data available
        </p>
      </div>
    )
  }

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '12px',
        padding: '16px',
      }}
    >
      {/* Chart header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <h3
          style={{
            fontFamily: 'var(--font-clash-display, "Clash Display", "DM Sans", sans-serif)',
            fontSize: '18px',
            fontWeight: 600,
            color: 'var(--ink)',
            margin: 0,
          }}
        >
          Skill Trends
        </h3>

        {/* Skill dropdown */}
        <select
          value={internalSkill}
          onChange={(e) => handleSkillChange(e.target.value)}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            color: 'var(--ink)',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '13px',
            padding: '6px 10px',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          {skills.map((skill) => (
            <option key={skill} value={skill}>
              {skill}
            </option>
          ))}
        </select>
      </div>

      {filteredData.length === 0 ? (
        <p
          style={{
            textAlign: 'center',
            color: 'var(--muted)',
            fontSize: '14px',
            fontFamily: 'DM Sans, sans-serif',
            padding: '40px 0',
          }}
        >
          No trend data available
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={filteredData} margin={{ top: 4, right: 8, bottom: 4, left: -8 }}>
            <defs>
              <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.15} />
                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis
              dataKey="date"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              tick={{ fill: 'var(--muted)', fontSize: 12, fontFamily: 'DM Sans, sans-serif' } as any}
            />
            <YAxis
              domain={[0, 100]}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              tick={{ fill: 'var(--muted)', fontSize: 12, fontFamily: 'DM Sans, sans-serif' } as any}
            />
            <Tooltip contentStyle={tooltipStyle} />
            <Area
              type="monotone"
              dataKey="score"
              name={internalSkill}
              stroke="var(--accent)"
              strokeWidth={2}
              fill="url(#chartFill)"
              dot={{ r: 4, fill: 'var(--accent)', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: 'var(--accent)' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
