import type { EmissionsResult } from '@/lib/emissions'
import { TotalEmissionsCard } from './total-emissions-card'
import { TopLeakCard } from './top-leak-card'
import { BreakdownChart } from './breakdown-chart'
import { BreakdownTable } from './breakdown-table'

interface ResultsSectionProps {
  result: EmissionsResult
  fileName?: string
}

export function ResultsSection({ result, fileName }: ResultsSectionProps) {
  const topSource = result.breakdown.find(
    (item) => item.name === result.top_leak.name,
  )

  return (
    <section aria-label="Emissions results" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Analysis results
        </h2>
        {fileName ? (
          <span className="truncate font-mono text-xs text-muted-foreground">
            {fileName}
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TotalEmissionsCard
          total={result.total_emissions}
          unit={result.unit}
          sourceCount={result.breakdown.length}
        />
        <TopLeakCard
          topLeak={result.top_leak}
          source={topSource}
          unit={result.unit}
        />
      </div>

      <BreakdownChart
        breakdown={result.breakdown}
        topLeakName={result.top_leak.name}
        unit={result.unit}
      />

      <BreakdownTable
        breakdown={result.breakdown}
        topLeakName={result.top_leak.name}
        unit={result.unit}
      />
    </section>
  )
}
