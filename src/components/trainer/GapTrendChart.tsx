'use client'

import { useState, useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { GapScoreEntry, SessionSummary, GapDataPoint } from '@/lib/trainer-types'
import SkillFilterDropdown from './SkillFilterDropdown'

interface GapTrendChartProps {
  gapScores: GapScoreEntry[]
  sessions: SessionSummary[]
}

// Build chart data from gap scores for a selected skill
function buildGapChartData(
  gapScores: GapScoreEntry[],
  selectedSkill: string,
  sessions: SessionSummary[]
): { main: GapDataPoint[]; topics: Record<string, GapDataPoint[]> } {
  // Filter to selected skill
  const skillScores = gapScores.filter((g) => g.skill === selectedSkill)

  // Build session labels S1, S2, ... based on ordered sessions (oldest to newest)
  const orderedSessions = [...sessions].reverse()
  const sessionLabels = orderedSessions.map((_, i) => `S${i + 1}`)

  // Skill-level (topic === null) — main trend line
  const skillLevelScores = skillScores.filter((g) => g.topic === null)
  // For the main line, use the single weighted score (it's an aggregate, not per-session)
  // Since GapScore is aggregate not per-session, we represent it as a single point
  // map to session count for x-axis labels
  const main: GapDataPoint[] = skillLevelScores.map((g, i) => ({
    session: sessionLabels[Math.min(i, sessionLabels.length - 1)] ?? `S${i + 1}`,
    score: Math.round(g.weightedScore * 100),
  }))

  // Topic-level scores — secondary lines
  const topicScores = skillScores.filter((g) => g.topic !== null)
  const topicGroups: Record<string, GapScoreEntry[]> = {}
  for (const entry of topicScores) {
    if (entry.topic) {
      if (!topicGroups[entry.topic]) {
        topicGroups[entry.topic] = []
      }
      topicGroups[entry.topic].push(entry)
    }
  }

  const topics: Record<string, GapDataPoint[]> = {}
  for (const [topic, entries] of Object.entries(topicGroups)) {
    topics[topic] = entries.map((g, i) => ({
      session: sessionLabels[Math.min(i, sessionLabels.length - 1)] ?? `S${i + 1}`,
      score: Math.round(g.weightedScore * 100),
    }))
  }

  // If no per-session breakdown available, synthesize from sessionCount on the gap entry
  // Show the aggregate score as a horizontal reference across sessions
  if (main.length === 0 && skillLevelScores.length === 0 && skillScores.length > 0) {
    const topicEntry = skillScores[0]
    const count = topicEntry.sessionCount
    for (let i = 0; i < count; i++) {
      main.push({
        session: sessionLabels[i] ?? `S${i + 1}`,
        score: Math.round(topicEntry.weightedScore * 100),
      })
    }
  }

  return { main, topics }
}

const TOPIC_COLORS = ['#2D6A4F', '#B7791F', '#7A7267', '#C85A2E']

export default function GapTrendChart({ gapScores, sessions }: GapTrendChartProps) {
  // Extract unique skills alphabetically
  const skills = useMemo(() => {
    const skillSet = new Set<string>()
    for (const g of gapScores) {
      skillSet.add(g.skill)
    }
    return Array.from(skillSet).sort()
  }, [gapScores])

  const [selectedSkill, setSelectedSkill] = useState<string>(skills[0] ?? '')

  const { main, topics } = useMemo(
    () => buildGapChartData(gapScores, selectedSkill, sessions),
    [gapScores, selectedSkill, sessions]
  )

  // Combine main and topic data into unified chart data array
  const topicNames = Object.keys(topics)
  const allDataKeys = ['score', ...topicNames]

  // Merge main + topic data into single array keyed by session label
  const chartData = useMemo(() => {
    const sessionMap: Record<string, Record<string, number>> = {}

    for (const point of main) {
      if (!sessionMap[point.session]) sessionMap[point.session] = {}
      sessionMap[point.session]['score'] = point.score
    }

    for (const [topic, points] of Object.entries(topics)) {
      for (const point of points) {
        if (!sessionMap[point.session]) sessionMap[point.session] = {}
        sessionMap[point.session][topic] = point.score
      }
    }

    return Object.entries(sessionMap)
      .sort(([a], [b]) => {
        // Sort by session number S1, S2, ...
        const numA = parseInt(a.replace('S', ''), 10)
        const numB = parseInt(b.replace('S', ''), 10)
        return numA - numB
      })
      .map(([session, values]) => ({ session, ...values }))
  }, [main, topics])

  if (skills.length === 0) {
    return (
      <p style={{ fontSize: '14px', fontFamily: 'DM Sans, sans-serif', color: '#7A7267' }}>
        No gap data available
      </p>
    )
  }

  // When there is only a single aggregate data point, show it as a KPI value
  // rather than rendering a misleading single-point trend line (WR-01)
  if (main.length <= 1 && topicNames.length === 0) {
    const skillLevelScores = gapScores.filter(
      (g) => g.skill === selectedSkill && g.topic === null
    )
    return (
      <div>
        <div style={{ marginBottom: '16px' }}>
          <SkillFilterDropdown
            skills={skills}
            selectedSkill={selectedSkill}
            onSelect={setSelectedSkill}
          />
        </div>
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <span style={{ fontSize: '32px', fontWeight: 700, fontFamily: 'DM Sans, sans-serif', color: '#1A1A1A' }}>
            {main[0]?.score ?? '—'}
          </span>
          <p style={{ color: '#7A7267', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', marginTop: '4px' }}>
            Current weighted score (aggregate across {skillLevelScores[0]?.sessionCount ?? 0} sessions)
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <SkillFilterDropdown
          skills={skills}
          selectedSkill={selectedSkill}
          onSelect={setSelectedSkill}
        />
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#DDD5C8" />
          <XAxis
            dataKey="session"
            tick={{ fill: '#7A7267', fontSize: 12, fontFamily: 'DM Sans, sans-serif' }}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: '#7A7267', fontSize: 12, fontFamily: 'DM Sans, sans-serif' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #DDD5C8',
              borderRadius: '6px',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '13px',
              color: '#1A1A1A',
            }}
          />
          {allDataKeys.length > 1 && (
            <Legend
              wrapperStyle={{
                fontSize: '12px',
                fontFamily: 'DM Sans, sans-serif',
                color: '#7A7267',
              }}
            />
          )}
          {/* Primary line — skill level score */}
          <Line
            type="monotone"
            dataKey="score"
            name={selectedSkill}
            stroke="#C85A2E"
            strokeWidth={2}
            dot={{ r: 4, fill: '#C85A2E' }}
            activeDot={{ r: 5 }}
          />
          {/* Secondary lines — topic breakdown */}
          {topicNames.map((topic, i) => (
            <Line
              key={topic}
              type="monotone"
              dataKey={topic}
              name={topic}
              stroke={TOPIC_COLORS[i % TOPIC_COLORS.length]}
              strokeWidth={1.5}
              strokeDasharray="4 2"
              dot={{ r: 3 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
