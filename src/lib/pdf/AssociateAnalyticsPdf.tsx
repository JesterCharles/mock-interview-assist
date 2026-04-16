import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  Svg,
  Polyline,
} from '@react-pdf/renderer'
import { styles, brandColors } from './pdfStyles'
import { generateSparklinePoints } from './sparklineHelper'
import type { GapScoreEntry, SessionSummary } from '@/lib/trainer-types'

// ─── Props ────────────────────────────────────────────────────────────────────

export interface AssociateAnalyticsPdfProps {
  associate: {
    displayName: string
    slug: string
    readinessStatus: 'ready' | 'improving' | 'not_ready'
    readinessScore: number | null
    recommendedArea: string | null
    cohortName: string | null
  }
  generatedDate: string
  gapScores: GapScoreEntry[]
  sessions: SessionSummary[]
  skillSparklines: Array<{ skill: string; scores: number[] }>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readinessLabel(status: 'ready' | 'improving' | 'not_ready'): string {
  if (status === 'ready') return 'Ready'
  if (status === 'improving') return 'Improving'
  return 'Not Ready'
}

function readinessColor(status: 'ready' | 'improving' | 'not_ready'): string {
  if (status === 'ready') return brandColors.success
  if (status === 'improving') return brandColors.warning
  return brandColors.danger
}

function sessionScore(session: SessionSummary): string {
  const tech = session.overallTechnicalScore
  const soft = session.overallSoftSkillScore
  if (tech != null && soft != null) {
    return ((tech + soft) / 2).toFixed(1)
  }
  if (tech != null) return tech.toFixed(1)
  if (soft != null) return soft.toFixed(1)
  return '—'
}

function formatDate(iso: string): string {
  return iso.slice(0, 10) // YYYY-MM-DD
}

// ─── Main document ────────────────────────────────────────────────────────────

export function AssociateAnalyticsPdf({
  associate,
  generatedDate,
  gapScores,
  sessions,
  skillSparklines,
}: AssociateAnalyticsPdfProps) {
  // Sessions sorted newest first
  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )

  // Bottom-3 skills by weightedScore for recommendations
  const bottomSkills = [...gapScores]
    .sort((a, b) => a.weightedScore - b.weightedScore)
    .slice(0, 3)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* 1. Branded header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerBrand}>Next Level Mock</Text>
            <Text style={styles.headerTitle}>{associate.displayName} — Associate Analytics</Text>
          </View>
          <Text style={styles.headerMeta}>Generated {generatedDate}</Text>
        </View>

        {/* 2. Associate info card */}
        <Text style={styles.sectionTitle}>Associate Overview</Text>
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: brandColors.surface,
            padding: 12,
            borderRadius: 4,
            marginBottom: 12,
            gap: 24,
          }}
        >
          <View>
            <Text style={[styles.kpiLabel, { marginBottom: 2 }]}>Name</Text>
            <Text style={{ fontSize: 10, color: brandColors.ink }}>{associate.displayName}</Text>
          </View>
          <View>
            <Text style={[styles.kpiLabel, { marginBottom: 2 }]}>Readiness</Text>
            <Text
              style={{
                fontSize: 10,
                fontFamily: 'Helvetica-Bold',
                color: readinessColor(associate.readinessStatus),
              }}
            >
              {readinessLabel(associate.readinessStatus)}
            </Text>
          </View>
          <View>
            <Text style={[styles.kpiLabel, { marginBottom: 2 }]}>Score</Text>
            <Text style={{ fontSize: 10, color: brandColors.ink }}>
              {associate.readinessScore != null
                ? `${associate.readinessScore.toFixed(1)}%`
                : '—'}
            </Text>
          </View>
          <View>
            <Text style={[styles.kpiLabel, { marginBottom: 2 }]}>Cohort</Text>
            <Text style={{ fontSize: 10, color: brandColors.ink }}>
              {associate.cohortName ?? '—'}
            </Text>
          </View>
        </View>

        {/* 3. Gap trend sparkline per skill */}
        {skillSparklines.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Skill Trends</Text>
            {skillSparklines.map((entry) => (
              <View
                key={entry.skill}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 4,
                  paddingHorizontal: 6,
                  borderBottom: `1 solid ${brandColors.border}`,
                }}
              >
                <Text style={{ fontSize: 9, color: brandColors.ink, flex: 1 }}>
                  {entry.skill}
                </Text>
                <Svg width={100} height={20}>
                  <Polyline
                    points={generateSparklinePoints(entry.scores, 100, 20)}
                    stroke={brandColors.ember}
                    strokeWidth={1.5}
                    fill="none"
                  />
                </Svg>
              </View>
            ))}
          </>
        )}

        {/* 4. Session list table */}
        <Text style={styles.sectionTitle}>Session History</Text>
        <View style={styles.tableHeader}>
          <Text style={styles.tableHeaderCell}>Date</Text>
          <Text style={[styles.tableHeaderCell, { flex: 0, width: 80 }]}>Overall Score</Text>
          <Text style={[styles.tableHeaderCell, { flex: 0, width: 80 }]}>Mode</Text>
        </View>
        {sortedSessions.map((session, idx) => (
          <View
            key={session.id}
            style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
          >
            <Text style={styles.tableCell}>{formatDate(session.date)}</Text>
            <Text style={[styles.tableCell, { flex: 0, width: 80 }]}>
              {sessionScore(session)}
            </Text>
            <Text style={[styles.tableCell, { flex: 0, width: 80 }]}>
              {session.status}
            </Text>
          </View>
        ))}

        {/* 5. Recommended areas */}
        <Text style={styles.sectionTitle}>Recommended Focus Areas</Text>
        <View style={{ padding: 10, backgroundColor: brandColors.surface, borderRadius: 4 }}>
          {associate.recommendedArea != null && (
            <Text
              style={{
                fontSize: 9,
                color: brandColors.ink,
                marginBottom: 4,
                fontFamily: 'Helvetica-Bold',
              }}
            >
              {associate.recommendedArea}
            </Text>
          )}
          {bottomSkills.map((gap) => (
            <Text
              key={`${gap.skill}-${gap.topic ?? ''}`}
              style={{ fontSize: 9, color: brandColors.muted, marginBottom: 3 }}
            >
              {gap.skill}
              {gap.topic ? ` — ${gap.topic}` : ''} (score:{' '}
              {gap.weightedScore.toFixed(1)})
            </Text>
          ))}
          {associate.recommendedArea == null && bottomSkills.length === 0 && (
            <Text style={{ fontSize: 9, color: brandColors.muted }}>
              No gap data available yet.
            </Text>
          )}
        </View>

        {/* 6. Footer */}
        <Text style={styles.footer} fixed>
          Generated by Next Level Mock
        </Text>
      </Page>
    </Document>
  )
}
