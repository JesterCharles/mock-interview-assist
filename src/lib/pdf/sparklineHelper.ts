/**
 * Pure SVG sparkline point generator for @react-pdf/renderer Polyline component.
 * No recharts dependency — hand-rolled coordinate normalization (D-01, D-12).
 */

/**
 * Generates a space-separated string of "x.d,y.d" coordinate pairs suitable
 * for the `points` attribute of a @react-pdf/renderer <Polyline> component.
 *
 * Edge cases (per D-03):
 * - Empty array: returns a horizontal dash at the vertical midpoint
 * - Single data point: returns a horizontal line at the vertical midpoint
 * - All-same values: guarded range prevents NaN; renders a flat line
 *
 * @param data - Array of score values (e.g. [1..5])
 * @param width - Total width of the SVG viewport in points
 * @param height - Total height of the SVG viewport in points
 * @returns Space-separated "x.d,y.d" coordinate pairs
 */
export function generateSparklinePoints(
  data: number[],
  width: number,
  height: number,
): string {
  const padding = 2
  const innerW = width - padding * 2
  const innerH = height - padding * 2

  // Empty or single-point: horizontal dash at vertical midpoint (D-03)
  if (data.length === 0 || data.length === 1) {
    const mid = height / 2
    return `${padding.toFixed(1)},${mid.toFixed(1)} ${(width - padding).toFixed(1)},${mid.toFixed(1)}`
  }

  const min = Math.min(...data)
  const max = Math.max(...data)
  // Guard against div-by-zero when all values are the same (D-03)
  const range = max === min ? 1 : max - min

  return data
    .map((v, i) => {
      const x = padding + (i / (data.length - 1)) * innerW
      // Invert Y: higher score appears higher on the chart (Pitfall 2 guard)
      const y = padding + innerH - ((v - min) / range) * innerH
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}
