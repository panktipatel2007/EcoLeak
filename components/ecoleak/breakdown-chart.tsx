'use client'

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'
import type { EmissionSource } from '@/lib/emissions'

interface BreakdownChartProps {
  breakdown: EmissionSource[]
  topLeakName: string
  unit: string
}

export function BreakdownChart({
  breakdown,
  topLeakName,
  unit,
}: BreakdownChartProps) {
  const data = breakdown.map((item) => ({
    ...item,
    isLeak: item.name === topLeakName,
  }))

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Emissions by input
        </h3>
        <span className="font-mono text-xs text-muted-foreground">{unit}</span>
      </div>

      <div className="mt-4 h-[188px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 4, right: 44, bottom: 4, left: 0 }}
            barCategoryGap={14}
          >
            <XAxis type="number" hide domain={[0, 'dataMax']} />
            <YAxis
              type="category"
              dataKey="name"
              tickLine={false}
              axisLine={false}
              width={104}
              tick={{
                fill: 'var(--color-foreground)',
                fontSize: 13,
              }}
            />
            <Bar dataKey="emissions" radius={2} isAnimationActive={false}>
              {data.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={
                    entry.isLeak
                      ? 'var(--color-warning)'
                      : 'var(--color-primary)'
                  }
                  fillOpacity={entry.isLeak ? 1 : 0.55}
                />
              ))}
              <LabelList
                dataKey="percentage"
                position="right"
                formatter={(value: number) => `${value}%`}
                className="fill-muted-foreground font-mono"
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
