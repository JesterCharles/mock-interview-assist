'use client'

import { useMemo } from 'react'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'
import { GapScoreEntry, SessionSummary } from '@/lib/trainer-types'

interface SkillRadarProps {
  gapScores: GapScoreEntry[]
  sessions: SessionSummary[]
  selectedSkill: string | null
}

interface RadarDataPoint {
  axis: string
  now: number
  before: number
  assessmentReady: boolean
  sessionCount: number
  hasPrev: boolean
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

function CustomTooltip({
  active,
  payload,
  hasHistory,
}: {
  active?: boolean
  payload?: Array<{ payload: RadarDataPoint }>
  hasHistory: boolean
}) {
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0].payload
  const delta = d.now - d.before
  const showPrior = hasHistory && d.hasPrev
  return (
    <div style={tooltipStyle}>
      <p style={{ margin: '0 0 4px 0', fontWeight: 600, color: 'var(--ink)' }}>{d.axis}</p>
      <p style={{ margin: '0 0 2px 0', color: 'var(--muted)' }}>
        Now: <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{d.now}%</span>
      </p>
      {showPrior && (
        <>
          <p style={{ margin: '0 0 2px 0', color: 'var(--muted)' }}>
            Prior: <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{d.before}%</span>
          </p>
          <p
            style={{
              margin: 0,
              fontSize: '12px',
              color: delta > 0 ? 'var(--success)' : delta < 0 ? 'var(--danger)' : 'var(--muted)',
            }}
          >
            {delta > 0 ? '+' : ''}
            {delta.toFixed(0)}% since last
          </p>
        </>
      )}
    </div>
  )
}

function CustomTick({
  payload,
  x,
  y,
  textAnchor,
  radarData,
  selectedSkill,
}: {
  payload?: { value: string }
  x?: number
  y?: number
  textAnchor?: string
  radarData: RadarDataPoint[]
  selectedSkill: string | null
}) {
  if (!payload) return null
  const item = radarData.find((d) => d.axis === payload.value)
  const isReady = item?.assessmentReady ?? false
  const isSelected = selectedSkill === payload.value
  const anchor = textAnchor as 'inherit' | 'start' | 'middle' | 'end' | undefined

  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fill={isSelected ? 'var(--accent)' : isReady ? 'var(--ink)' : 'var(--muted)'}
      fontSize={isSelected ? 13 : 12}
      fontWeight={isSelected ? 600 : 400}
      fontFamily="DM Sans, sans-serif"
      style={{ opacity: isReady || isSelected ? 1 : 0.6 }}
    >
      {payload.value}
    </text>
  )
}

export function SkillRadar({ gapScores, sessions: _sessions, selectedSkill }: SkillRadarProps) {
  const isTopicMode = selectedSkill !== null

  const topicEntries = useMemo(
    () =>
      isTopicMode
        ? gapScores
            .filter(
              (g): g is GapScoreEntry & { topic: string } =>
                g.skill === selectedSkill && !!g.topic && g.topic !== '',
            )
            .sort((a, b) => a.topic.localeCompare(b.topic))
        : [],
    [gapScores, selectedSkill, isTopicMode],
  )

  // Phase 34: "Before" is sourced from real prevWeightedScore snapshots stored on GapScore.
  // Null prevWeightedScore = no history yet for that axis — fall back to `now` for the
  // data point (so Recharts has a value to render) but flag `hasPrev: false`. The Before
  // polygon is only rendered when at least one axis has a real prior (D-16, D-17).
  const radarData = useMemo<RadarDataPoint[]>(() => {
    if (isTopicMode) {
      return topicEntries.map((g) => {
        const now = Math.round(g.weightedScore * 100)
        const hasPrev = g.prevWeightedScore != null
        const before = hasPrev ? Math.round((g.prevWeightedScore as number) * 100) : now
        return {
          axis: g.topic,
          now,
          before,
          hasPrev,
          assessmentReady: g.sessionCount >= 3,
          sessionCount: g.sessionCount,
        }
      })
    }
    return gapScores
      .filter((g) => g.topic === null || g.topic === '')
      .map((g) => {
        const now = Math.round(g.weightedScore * 100)
        const hasPrev = g.prevWeightedScore != null
        const before = hasPrev ? Math.round((g.prevWeightedScore as number) * 100) : now
        return {
          axis: g.skill,
          now,
          before,
          hasPrev,
          assessmentReady: g.sessionCount >= 3,
          sessionCount: g.sessionCount,
        }
      })
      .sort((a, b) => a.axis.localeCompare(b.axis))
  }, [gapScores, topicEntries, isTopicMode])

  // hasHistory derives from data presence — D-17: any axis with a real snapshot lights up the overlay.
  const hasHistory = radarData.some((d) => d.hasPrev)

  const title = isTopicMode ? `${selectedSkill} · Topics` : 'Skill Overview'
  const minVertices = isTopicMode ? 2 : 3

  if (radarData.length < minVertices) {
    return (
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '16px',
        }}
      >
        <h3
          style={{
            fontFamily: 'var(--font-clash-display, "Clash Display", "DM Sans", sans-serif)',
            fontSize: '18px',
            fontWeight: 600,
            color: 'var(--ink)',
            margin: '0 0 16px 0',
          }}
        >
          {title}
        </h3>
        <p
          style={{
            textAlign: 'center',
            color: 'var(--muted)',
            fontSize: '14px',
            fontFamily: 'DM Sans, sans-serif',
            padding: '40px 0',
          }}
        >
          {isTopicMode
            ? `Not enough topic data for ${selectedSkill}`
            : 'At least 3 skills needed for radar view'}
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
      <h3
        style={{
          fontFamily: 'var(--font-clash-display, "Clash Display", "DM Sans", sans-serif)',
          fontSize: '18px',
          fontWeight: 600,
          color: 'var(--ink)',
          margin: '0 0 4px 0',
        }}
      >
        {title}
      </h3>

      <p
        style={{
          fontSize: '12px',
          fontFamily: 'DM Sans, sans-serif',
          color: 'var(--muted)',
          margin: '0 0 12px 0',
        }}
      >
        {isTopicMode
          ? 'Tap a skill card to return to full view'
          : 'Tap a skill to drill into its topics'}
      </p>

      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
          <PolarGrid stroke="var(--border-subtle)" />
          <PolarAngleAxis
            dataKey="axis"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            tick={(props: any) => (
              <CustomTick
                payload={props.payload}
                x={typeof props.x === 'number' ? props.x : undefined}
                y={typeof props.y === 'number' ? props.y : undefined}
                textAnchor={props.textAnchor}
                radarData={radarData}
                selectedSkill={selectedSkill}
              />
            )}
          />
          {hasHistory && (
            <Radar
              name="Prior"
              dataKey="before"
              stroke="var(--muted)"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              fill="var(--muted)"
              fillOpacity={0.05}
            />
          )}
          <Radar
            name="Now"
            dataKey="now"
            stroke="var(--accent)"
            strokeWidth={2}
            fill="var(--accent)"
            fillOpacity={0.18}
          />
          <Tooltip content={<CustomTooltip hasHistory={hasHistory} />} />
          {hasHistory && (
            <Legend
              iconType="line"
              wrapperStyle={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '12px',
                color: 'var(--muted)',
              }}
            />
          )}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
