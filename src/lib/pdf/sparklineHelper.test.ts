import { describe, it, expect } from 'vitest'
import { generateSparklinePoints } from './sparklineHelper'

describe('generateSparklinePoints', () => {
  const WIDTH = 60
  const HEIGHT = 20
  const PADDING = 2

  function parsePoints(pts: string): Array<{ x: number; y: number }> {
    return pts.trim().split(' ').map((pair) => {
      const [x, y] = pair.split(',').map(Number)
      return { x, y }
    })
  }

  it('returns two endpoints at vertical midpoint for empty array', () => {
    const result = generateSparklinePoints([], WIDTH, HEIGHT)
    const points = parsePoints(result)
    expect(points).toHaveLength(2)
    expect(points[0].y).toBe(HEIGHT / 2)
    expect(points[1].y).toBe(HEIGHT / 2)
  })

  it('returns horizontal line at vertical midpoint for single data point', () => {
    const result = generateSparklinePoints([4], WIDTH, HEIGHT)
    const points = parsePoints(result)
    expect(points).toHaveLength(2)
    expect(points[0].y).toBe(HEIGHT / 2)
    expect(points[1].y).toBe(HEIGHT / 2)
  })

  it('returns flat horizontal line for all-same values (no NaN)', () => {
    const result = generateSparklinePoints([3, 3, 3], WIDTH, HEIGHT)
    expect(result).not.toMatch(/NaN/)
    expect(result).not.toMatch(/Infinity/)
    const points = parsePoints(result)
    const ys = points.map((p) => p.y)
    expect(ys.every((y) => y === ys[0])).toBe(true)
  })

  it('returns ascending points where higher score = lower y (inverted SVG axis)', () => {
    const result = generateSparklinePoints([1, 2, 3, 4, 5], WIDTH, HEIGHT)
    const points = parsePoints(result)
    // first point (score=1) should have higher y than last point (score=5)
    expect(points[0].y).toBeGreaterThan(points[points.length - 1].y)
  })

  it('returns space-separated "x.d,y.d" coordinate pairs', () => {
    const result = generateSparklinePoints([2, 4], WIDTH, HEIGHT)
    expect(result).toMatch(/^\d+\.\d,\d+\.\d \d+\.\d,\d+\.\d$/)
  })

  it('never produces NaN or Infinity for any valid edge case', () => {
    const cases = [
      [],
      [0],
      [5],
      [0, 0],
      [5, 5, 5, 5],
      [0, 5],
      [5, 4, 3, 2, 1],
      [1, 3, 2, 5, 4],
    ]
    for (const data of cases) {
      const result = generateSparklinePoints(data, WIDTH, HEIGHT)
      expect(result, `Failed for data: ${JSON.stringify(data)}`).not.toMatch(/NaN/)
      expect(result, `Failed for data: ${JSON.stringify(data)}`).not.toMatch(/Infinity/)
    }
  })

  it('x coordinates span from padding to width-padding', () => {
    const result = generateSparklinePoints([1, 2, 3], WIDTH, HEIGHT)
    const points = parsePoints(result)
    expect(points[0].x).toBeCloseTo(PADDING, 1)
    expect(points[points.length - 1].x).toBeCloseTo(WIDTH - PADDING, 1)
  })
})
