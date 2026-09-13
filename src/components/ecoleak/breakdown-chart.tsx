'use client'

import { useState } from 'react'
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  PieChart,
  Pie,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts'
import type { EmissionSource, CategoryBreakdown, MonthlyBreakdown } from '@/lib/emissions'
import { BarChart3, PieChart as PieIcon, TrendingUp } from 'lucide-react'

interface BreakdownChartProps {
  breakdown: EmissionSource[]
  categories: CategoryBreakdown[]
  monthly: MonthlyBreakdown[]
  hasDates: boolean
  topLeakName: string
  unit: string
}

export function BreakdownChart({
  breakdown,
  categories,
  monthly,
  hasDates,
  topLeakName,
  unit,
}: BreakdownChartProps) {
  // Chart tab state: 'inputs' | 'categories' | 'monthly'
  const [activeTab, setActiveTab] = useState<'inputs' | 'categories' | 'monthly'>('inputs')

  // Top inputs data (limit to top 8 for clean visual presentation)
  const inputData = breakdown.slice(0, 8).map((item) => ({
    ...item,
    isLeak: item.name === topLeakName,
  }))

  const pieData = categories.map((cat) => ({
    name: cat.category,
    value: cat.emissions,
    emissionsKg: cat.emissionsKg,
    percentage: cat.percentage,
    color: cat.color,
  }))

  return (
    <div id="emission-charts-card" className="rounded-lg border border-border bg-surface p-5 shadow-xs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Emission Visualizations
          </h3>
          <p className="text-xs text-muted-foreground">
            Analyze carbon drivers by input, category, and timeline
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 rounded-lg bg-muted/60 p-1 text-xs">
          <button
            type="button"
            id="tab-chart-inputs"
            onClick={() => setActiveTab('inputs')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors ${
              activeTab === 'inputs'
                ? 'bg-surface text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BarChart3 className="size-3.5" />
            Top Inputs
          </button>
          <button
            type="button"
            id="tab-chart-categories"
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors ${
              activeTab === 'categories'
                ? 'bg-surface text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <PieIcon className="size-3.5" />
            Categories ({categories.length})
          </button>
          {hasDates && (
            <button
              type="button"
              id="tab-chart-monthly"
              onClick={() => setActiveTab('monthly')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors ${
                activeTab === 'monthly'
                  ? 'bg-surface text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <TrendingUp className="size-3.5 text-primary" />
              Monthly Timeline
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: TOP INPUTS HORIZONTAL BAR CHART */}
      {activeTab === 'inputs' && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2 font-mono">
            <span>Operational Input</span>
            <span>Share &amp; Total ({unit})</span>
          </div>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={inputData}
                margin={{ top: 4, right: 60, bottom: 4, left: 0 }}
                barCategoryGap={10}
              >
                <XAxis type="number" hide domain={[0, 'dataMax']} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  width={140}
                  tick={{
                    fill: 'var(--color-foreground)',
                    fontSize: 12,
                  }}
                />
                <Tooltip
                  formatter={(val: unknown) => [
                    `${typeof val === 'number' ? val.toLocaleString() : val} ${unit}`,
                    'Emissions',
                  ]}
                  contentStyle={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                  }}
                />
                <Bar dataKey="emissions" radius={3} isAnimationActive={false}>
                  {inputData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={
                        entry.isLeak
                          ? 'var(--color-warning)'
                          : 'var(--color-primary)'
                      }
                      fillOpacity={entry.isLeak ? 1 : 0.75}
                    />
                  ))}
                  <LabelList
                    dataKey="percentage"
                    position="right"
                    formatter={(value: unknown) => `${value}%`}
                    className="fill-foreground font-mono font-medium"
                    fontSize={11}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* VIEW 2: CATEGORY BREAKDOWN PIE / DONUT */}
      {activeTab === 'categories' && (
        <div className="mt-4 grid gap-4 md:grid-cols-[1.2fr_1fr] items-center">
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  isAnimationActive={false}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any, name: any, item: any) => [
                    `${typeof val === 'number' ? val.toLocaleString() : val} ${unit} (${item?.payload?.percentage ?? ''}%)`,
                    String(name),
                  ]}
                  contentStyle={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Category legend list */}
          <div className="space-y-2 text-xs">
            {categories.map((cat) => (
              <div
                key={cat.category}
                className="flex items-center justify-between p-1.5 rounded-md hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="size-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="truncate font-medium text-foreground">
                    {cat.category}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-muted-foreground font-normal">
                    {cat.emissions.toLocaleString()} {unit}
                  </span>
                  <span className="font-bold text-foreground w-10 text-right">
                    {cat.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 3: MONTHLY / PERIOD TIMELINE */}
      {activeTab === 'monthly' && hasDates && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2 font-mono">
            <span>Operating Period / Month</span>
            <span>Total Emissions ({unit})</span>
          </div>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthly}
                margin={{ top: 12, right: 16, bottom: 4, left: 10 }}
              >
                <XAxis
                  dataKey="period"
                  tickLine={false}
                  axisLine={{ stroke: 'var(--color-border)' }}
                  tick={{ fill: 'var(--color-foreground)', fontSize: 12 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }}
                />
                <Tooltip
                  formatter={(val: unknown) => [
                    `${typeof val === 'number' ? val.toLocaleString() : val} ${unit}`,
                    'Emissions',
                  ]}
                  contentStyle={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                  }}
                />
                <Bar
                  dataKey="emissions"
                  fill="var(--color-primary)"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey="emissions"
                    position="top"
                    formatter={(val: unknown) => `${val}`}
                    className="fill-foreground font-mono font-medium"
                    fontSize={11}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
