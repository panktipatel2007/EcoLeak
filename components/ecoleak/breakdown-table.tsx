import { cn } from '@/lib/utils'
import type { EmissionSource } from '@/lib/emissions'

interface BreakdownTableProps {
  breakdown: EmissionSource[]
  topLeakName: string
  unit: string
}

export function BreakdownTable({
  breakdown,
  topLeakName,
  unit,
}: BreakdownTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <table className="w-full text-sm">
        <caption className="sr-only">
          Emissions breakdown by operational input
        </caption>
        <thead>
          <tr className="border-b border-border text-left">
            <th
              scope="col"
              className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              Source
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              Emissions ({unit})
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              Share
            </th>
          </tr>
        </thead>
        <tbody>
          {breakdown.map((item) => {
            const isLeak = item.name === topLeakName
            return (
              <tr
                key={item.name}
                className="border-b border-border last:border-0"
              >
                <th
                  scope="row"
                  className="px-4 py-3 text-left font-normal text-foreground"
                >
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={cn(
                        'size-2 rounded-full',
                        isLeak ? 'bg-warning' : 'bg-primary/55',
                      )}
                    />
                    {item.name}
                    {isLeak ? (
                      <span className="rounded-sm bg-warning-muted px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide text-warning">
                        Top leak
                      </span>
                    ) : null}
                  </span>
                </th>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-foreground">
                  {item.emissions.toFixed(2)}
                </td>
                <td
                  className={cn(
                    'px-4 py-3 text-right font-mono tabular-nums',
                    isLeak
                      ? 'font-semibold text-warning'
                      : 'text-muted-foreground',
                  )}
                >
                  {item.percentage}%
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
