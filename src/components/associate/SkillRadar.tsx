'use client'

import { useMemo } from 'react'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { GapScoreEntry } from '@/lib/trainer-types'

interface SkillRadarProps {
  gapScores: GapScoreEntry[]        // Skill-level scores (pre-filtered by parent)
  selectedSkill: string | null       // Dashboard filter — highlights one vertex
}

interface RadarDataPoint {
  skill: string
  score: number
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

// Custom tooltip content
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: RadarDataPoint }>
}) {
  if (!active || !payload || payload.length === 0) return null
  const data = payload[0].payload
  const sessionsNeeded = Math.max(0, 3 - data.sessionCount)

  return (
    <div style={tooltipStyle}>
      <p style={{ margin: '0 0 4px 0', fontWeight: 600, color: 'var(--ink)' }}>
        {data.skill}
      </p>
      <p style={{ margin: '0 0 4px 0', color: 'var(--muted)' }}>
        Score: <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{data.score}%</span>
      </p>
      <p style={{ margin: 0, fontSize: '12px', color: data.assessmentReady ? 'var(--success)' : 'var(--muted)' }}>
        {data.assessmentReady
          ? 'Assessment ready'
          : `Needs ${sessionsNeeded} more session${sessionsNeeded !== 1 ? 's' : ''}`}
      </p>
    </div>
  )
}

// Custom angle axis tick that colors labels by assessment readiness and selected state
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
  const item = radarData.find((d) => d.skill === payload.value)
  const isReady = item?.assessmentReady ?? false
  const isSelected = selectedSkill === payload.value

  // Cast textAnchor to SVG literal type — recharts passes 'start'|'middle'|'end' at runtime
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

export default function SkillRadar({ gapScores, selectedSkill }: SkillRadarProps) {
  // Filter to skill-level entries only (topic === '' or null), build radar data
  const radarData = useMemo<RadarDataPoint[]>(() => {
    return gapScores
      .filter((g) => g.topic === null || g.topic === '')
      .map((g) => ({
        skill: g.skill,
        score: Math.round(g.weightedScore * 100),
        assessmentReady: g.sessionCount >= 3,
        sessionCount: g.sessionCount,
      }))
      .sort((a, b) => a.skill.localeCompare(b.skill))
  }, [gapScores])

  if (radarData.length < 3) {
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
          Skill Overview
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
          At least 3 skills needed for radar view
        </p>
      </div>
    )
  }

  // Check if the selected skill has assessment-ready data
  const selectedItem = selectedSkill ? radarData.find((d) => d.skill === selectedSkill) : null

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
        Skill Overview
      </h3>

      {/* Assessment ready legend */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '8px',
          fontSize: '12px',
          fontFamily: 'DM Sans, sans-serif',
          color: 'var(--muted)',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              display: 'inline-block',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: 'var(--accent)',
            }}
          />
          Assessment ready (3+ sessions)
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              display: 'inline-block',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: 'var(--muted)',
              opacity: 0.4,
            }}
          />
          Still building history
        </span>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
          <PolarGrid stroke="var(--border-subtle)" />
          <PolarAngleAxis
            dataKey="skill"
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
          {/* Full polygon — dashed for not-ready segments baseline */}
          <Radar
            dataKey="score"
            stroke="var(--accent)"
            strokeWidth={2}
            strokeDasharray="4 2"
            fill="var(--accent)"
            fillOpacity={0.08}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>

      {/* Dot overlay — renders per-skill dots below the chart for assessment status */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginTop: '8px',
          justifyContent: 'center',
        }}
      >
        {radarData.map((item) => {
          const isSelected = selectedSkill === item.skill
          return (
            <span
              key={item.skill}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '12px',
                fontFamily: 'DM Sans, sans-serif',
                color: isSelected
                  ? 'var(--accent)'
                  : item.assessmentReady
                  ? 'var(--ink)'
                  : 'var(--muted)',
                opacity: item.assessmentReady || isSelected ? 1 : 0.6,
                fontWeight: isSelected ? 600 : 400,
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: isSelected ? '12px' : item.assessmentReady ? '10px' : '8px',
                  height: isSelected ? '12px' : item.assessmentReady ? '10px' : '8px',
                  borderRadius: '50%',
                  background: isSelected
                    ? 'var(--accent)'
                    : item.assessmentReady
                    ? 'var(--accent)'
                    : 'transparent',
                  border: item.assessmentReady || isSelected
                    ? 'none'
                    : '1.5px solid var(--muted)',
                  flexShrink: 0,
                }}
              />
              {item.skill} ({item.score}%)
            </span>
          )
        })}
      </div>

      {/* Selected skill highlight note */}
      {selectedItem && (
        <p
          style={{
            textAlign: 'center',
            fontSize: '12px',
            fontFamily: 'DM Sans, sans-serif',
            color: 'var(--accent)',
            marginTop: '8px',
          }}
        >
          Viewing: {selectedItem.skill} — {selectedItem.score}%
          {selectedItem.assessmentReady ? ' · Assessment ready' : ` · ${3 - selectedItem.sessionCount} more sessions needed`}
        </p>
      )}
    </div>
  )
}
