'use client'

import { LineChart, Line, ResponsiveContainer } from 'recharts'
import type { SparklinePoint } from '@/lib/trainer-types'

interface RosterSparklineProps {
  data: SparklinePoint[]
}

export function RosterSparkline({ data }: RosterSparklineProps) {
  // Zero sessions: render spacer div
  if (!data || data.length === 0) {
    return <div style={{ width: 56, height: 20 }} />
  }

  return (
    <ResponsiveContainer width={56} height={20}>
      <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <Line
          type="monotone"
          dataKey="score"
          stroke="var(--accent)"
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
