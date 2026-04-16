import { StyleSheet } from '@react-pdf/renderer'

/**
 * Brand color constants for analytics PDF templates.
 * Colors sourced from DESIGN.md light-mode token set.
 */
export const brandColors = {
  ember: '#C85A2E',      // --accent: primary action, readiness signals
  ink: '#1A1A1A',        // --ink: primary text, headings
  muted: '#6B7280',      // --muted: secondary text, metadata
  surface: '#F9FAFB',    // --surface-muted: subtle backgrounds
  border: '#E5E7EB',     // --border: table rules
  success: '#2D6A4F',    // --success: ready state
  warning: '#B7791F',    // --warning: improving state
  danger: '#B83B2E',     // --danger: not_ready state
  white: '#FFFFFF',
} as const

/**
 * Shared StyleSheet for cohort and associate analytics PDFs.
 * Uses built-in Helvetica fonts (no Font.register) to avoid font-fetch
 * latency during server-side renderToBuffer (per research Pitfall 6).
 */
export const styles = StyleSheet.create({
  // Page
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    backgroundColor: brandColors.white,
    color: brandColors.ink,
  },

  // Header
  header: {
    marginBottom: 20,
    paddingBottom: 12,
    borderBottom: `3 solid ${brandColors.ember}`,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerLeft: {
    flexDirection: 'column',
  },
  headerBrand: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: brandColors.ink,
    marginBottom: 3,
  },
  headerTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: brandColors.ember,
  },
  headerMeta: {
    fontSize: 9,
    color: brandColors.muted,
    textAlign: 'right',
  },

  // Section title
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: brandColors.ink,
    marginTop: 16,
    marginBottom: 8,
    borderBottom: `1 solid ${brandColors.border}`,
    paddingBottom: 4,
  },

  // KPI strip
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: brandColors.surface,
    padding: 10,
    borderRadius: 4,
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 8,
    color: brandColors.muted,
    marginBottom: 4,
    textAlign: 'center',
  },
  kpiValue: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: brandColors.ember,
  },

  // Table
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: brandColors.surface,
    borderBottom: `1 solid ${brandColors.border}`,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: brandColors.muted,
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottom: `1 solid ${brandColors.border}`,
  },
  tableRowAlt: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottom: `1 solid ${brandColors.border}`,
    backgroundColor: brandColors.surface,
  },
  tableCell: {
    fontSize: 9,
    color: brandColors.ink,
    flex: 1,
  },
  tableCellSmall: {
    fontSize: 9,
    color: brandColors.ink,
    flex: 0,
    width: 70,
  },
  tableCellSparkline: {
    flex: 0,
    width: 70,
    justifyContent: 'center',
  },

  // Status badge text
  statusReady: {
    fontSize: 9,
    color: brandColors.success,
    fontFamily: 'Helvetica-Bold',
  },
  statusImproving: {
    fontSize: 9,
    color: brandColors.warning,
    fontFamily: 'Helvetica-Bold',
  },
  statusNotReady: {
    fontSize: 9,
    color: brandColors.danger,
    fontFamily: 'Helvetica-Bold',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: brandColors.muted,
    borderTop: `1 solid ${brandColors.border}`,
    paddingTop: 6,
  },
})
