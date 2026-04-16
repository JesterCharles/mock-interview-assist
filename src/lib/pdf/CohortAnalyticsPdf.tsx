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
import type { KpiData, GapAnalysisRow, RosterAssociate } from '@/lib/trainer-types'

// ─── Props ────────────────────────────────────────────────────────────────────

export interface CohortAnalyticsPdfProps {
  cohortName: string
  generatedDate: string
  kpi: KpiData
  gaps: GapAnalysisRow[]
  roster: Array<
    RosterAssociate & {
      trendWord: string
      topGap: string | null
      sparklineScores: number[]
    }
  >
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ReadinessText({
  status,
}: {
  status: 'ready' | 'improving' | 'not_ready'
}) {
  if (status === 'ready')
    return <Text style={styles.statusReady}>Ready</Text>
  if (status === 'improving')
    return <Text style={styles.statusImproving}>Improving</Text>
  return <Text style={styles.statusNotReady}>Not Ready</Text>
}

function SparklineCell({ scores }: { scores: number[] }) {
  return (
    <View style={styles.tableCellSparkline}>
      <Svg width={60} height={16}>
        <Polyline
          points={generateSparklinePoints(scores, 60, 16)}
          stroke={brandColors.ember}
          strokeWidth={1.5}
          fill="none"
        />
      </Svg>
    </View>
  )
}

// ─── Main document ────────────────────────────────────────────────────────────

export function CohortAnalyticsPdf({
  cohortName,
  generatedDate,
  kpi,
  gaps,
  roster,
}: CohortAnalyticsPdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* 1. Branded header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerBrand}>Next Level Mock</Text>
            <Text style={styles.headerTitle}>{cohortName} — Cohort Analytics</Text>
          </View>
          <Text style={styles.headerMeta}>Generated {generatedDate}</Text>
        </View>

        {/* 2. KPI snapshot */}
        <Text style={styles.sectionTitle}>KPI Snapshot</Text>
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Avg Readiness</Text>
            <Text style={styles.kpiValue}>
              {kpi.avgReadiness != null ? `${kpi.avgReadiness.toFixed(0)}%` : '—'}
            </Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Mocks This Week</Text>
            <Text style={styles.kpiValue}>{String(kpi.mocksThisWeek)}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>At-Risk Count</Text>
            <Text style={styles.kpiValue}>{String(kpi.atRiskCount)}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>AI-Trainer Variance</Text>
            <Text style={styles.kpiValue}>
              {kpi.avgVariance != null ? kpi.avgVariance.toFixed(2) : '—'}
            </Text>
          </View>
        </View>

        {/* 3. Gap-by-topic table */}
        <Text style={styles.sectionTitle}>Gap Analysis by Topic</Text>
        {/* Table header */}
        <View style={styles.tableHeader}>
          <Text style={styles.tableHeaderCell}>Skill</Text>
          <Text style={styles.tableHeaderCell}>Topic</Text>
          <Text style={[styles.tableHeaderCell, { flex: 0, width: 90 }]}>
            Associates Affected
          </Text>
          <Text style={[styles.tableHeaderCell, { flex: 0, width: 70 }]}>Avg Score</Text>
        </View>
        {gaps.map((row, idx) => (
          <View
            key={`${row.skill}-${row.topic}-${idx}`}
            style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
          >
            <Text style={styles.tableCell}>{row.skill}</Text>
            <Text style={styles.tableCell}>{row.topic}</Text>
            <Text style={[styles.tableCell, { flex: 0, width: 90 }]}>
              {String(row.associatesAffected)}
            </Text>
            <Text style={[styles.tableCell, { flex: 0, width: 70 }]}>
              {row.avgGapScore != null ? row.avgGapScore.toFixed(1) : '—'}
            </Text>
          </View>
        ))}

        {/* 4. Roster summary */}
        <Text style={styles.sectionTitle}>Roster Summary</Text>
        {/* Table header */}
        <View style={styles.tableHeader}>
          <Text style={styles.tableHeaderCell}>Associate</Text>
          <Text style={[styles.tableHeaderCell, { flex: 0, width: 60 }]}>Status</Text>
          <Text style={[styles.tableHeaderCell, { flex: 0, width: 60 }]}>Trend</Text>
          <Text style={[styles.tableHeaderCell, { flex: 0, width: 90 }]}>Top Gap</Text>
          <Text style={[styles.tableHeaderCell, { flex: 0, width: 70 }]}>Sparkline</Text>
        </View>
        {roster.map((row, idx) => (
          <View
            key={row.slug}
            style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
          >
            <Text style={styles.tableCell}>{row.displayName}</Text>
            <View style={[styles.tableCell, { flex: 0, width: 60, justifyContent: 'center' }]}>
              <ReadinessText status={row.readinessStatus} />
            </View>
            <Text style={[styles.tableCell, { flex: 0, width: 60 }]}>{row.trendWord}</Text>
            <Text style={[styles.tableCell, { flex: 0, width: 90 }]}>
              {row.topGap ?? '—'}
            </Text>
            <SparklineCell scores={row.sparklineScores} />
          </View>
        ))}

        {/* 5. Footer */}
        <Text style={styles.footer} fixed>
          Generated by Next Level Mock
        </Text>
      </Page>
    </Document>
  )
}
