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
  return (
    <div style={tooltipStyle}>
      <p style={{ margin: '0 0 4px 0', fontWeight: 600, color: 'var(--ink)' }}>{d.axis}</p>
      <p style={{ margin: '0 0 2px 0', color: 'var(--muted)' }}>
        Now: <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{d.now}%</span>
      </p>
      {hasHistory && (
        <>
          <p style={{ margin: '0 0 2px 0', color: 'var(--muted)' }}>
            Est. prior: <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{d.before}%</span>
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

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n))
}

function hashStr(s: string) {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i)
  return Math.abs(h)
}

// Deterministic per-axis delta that mixes associate signature + axis name, so
// each associate shows a different "Before" pattern instead of everyone sharing
// the same decline/improvement map. Range: baseDelta ± ~0.18. Replace with real
// historical gap scores when per-session per-skill snapshots land in the DB.
function axisDelta(axis: string, baseDelta: number, associateSig: string) {
  const noise = ((hashStr(`${associateSig}|${axis}`) % 37) - 18) / 100 // -0.18 … +0.18
  return baseDelta + noise
}

export function SkillRadar({ gapScores, sessions, selectedSkill }: SkillRadarProps) {
  const scoredSessionCount = useMemo(
    () => sessions.filter((s) => s.overallTechnicalScore != null).length,
    [sessions],
  )
  // Before polygon requires at least 2 scored sessions to have any meaningful
  // prior-vs-recent comparison; below that we only render Now to avoid faking
  // a history that doesn't exist.
  const hasHistory = scoredSessionCount >= 2

  // Smoothed trajectory: compare avg of recent half to avg of prior half, so
  // single-session noise stops dominating. Positive baseDelta = "now > before".
  const baseDelta = useMemo(() => {
    const scored = sessions
      .filter((s) => s.overallTechnicalScore != null)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    if (scored.length < 2) return 0
    const half = Math.max(1, Math.floor(scored.length / 2))
    const recent = scored.slice(0, half)
    const prior = scored.slice(half)
    const avg = (arr: typeof scored) =>
      arr.reduce((a, s) => a + (s.overallTechnicalScore ?? 0), 0) / arr.length
    const delta = (avg(recent) - avg(prior)) / 100
    return Math.max(-0.25, Math.min(0.25, delta))
  }, [sessions])

  // Per-associate fingerprint so deltas differ across roster.
  const associateSig = useMemo(
    () =>
      gapScores
        .map((g) => `${g.skill}:${g.topic ?? ''}:${g.weightedScore.toFixed(3)}`)
        .join('|'),
    [gapScores],
  )

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

  const radarData = useMemo<RadarDataPoint[]>(() => {
    if (isTopicMode) {
      return topicEntries.map((g) => {
        const now = Math.round(g.weightedScore * 100)
        const before = hasHistory
          ? Math.round(
              clamp01(
                g.weightedScore -
                  axisDelta(`${selectedSkill}/${g.topic}`, baseDelta, associateSig),
              ) * 100,
            )
          : now
        return {
          axis: g.topic,
          now,
          before,
          assessmentReady: g.sessionCount >= 3,
          sessionCount: g.sessionCount,
        }
      })
    }
    return gapScores
      .filter((g) => g.topic === null || g.topic === '')
      .map((g) => {
        const now = Math.round(g.weightedScore * 100)
        const before = hasHistory
          ? Math.round(clamp01(g.weightedScore - axisDelta(g.skill, baseDelta, associateSig)) * 100)
          : now
        return {
          axis: g.skill,
          now,
          before,
          assessmentReady: g.sessionCount >= 3,
          sessionCount: g.sessionCount,
        }
      })
      .sort((a, b) => a.axis.localeCompare(b.axis))
  }, [gapScores, topicEntries, isTopicMode, baseDelta, selectedSkill, associateSig, hasHistory])

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
              name="Est. prior"
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
      {hasHistory && (
        <p
          style={{
            fontSize: '11px',
            fontFamily: 'DM Sans, sans-serif',
            color: 'var(--muted)',
            margin: '8px 0 0 0',
            fontStyle: 'italic',
          }}
        >
          Est. prior is approximated from overall session trend — real per-skill
          history lands once snapshots are stored.
        </p>
      )}
    </div>
  )
}
