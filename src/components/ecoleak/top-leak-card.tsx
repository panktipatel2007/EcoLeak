import type { EmissionSource, TopLeak } from '@/lib/emissions'
import { AlertTriangle, ArrowRight, Lightbulb, CheckCircle } from 'lucide-react'

interface TopLeakCardProps {
  topLeak: TopLeak
  source?: EmissionSource
  unit: string
}

export function TopLeakCard({ topLeak, source, unit }: TopLeakCardProps) {
  return (
    <div id="top-leak-card" className="relative flex flex-col justify-between overflow-hidden rounded-lg border border-warning/50 bg-warning-muted/70 p-5 shadow-xs">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="grid size-5 place-items-center rounded-full bg-warning text-warning-foreground"
            >
              <AlertTriangle className="size-3" />
            </span>
            <p className="text-xs font-bold uppercase tracking-wider text-warning">
              Primary Carbon Leak
            </p>
          </div>
          {topLeak.scope && (
            <span className="rounded-full bg-warning/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-warning">
              {topLeak.scope}
            </span>
          )}
        </div>

        <div className="mt-3">
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold leading-tight tracking-tight text-foreground">
              {topLeak.name}
            </p>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold tabular-nums text-warning">
              {topLeak.percentage}%
            </span>
            <span className="text-xs text-foreground/70">of total factory footprint</span>
            {source ? (
              <span className="ml-auto font-mono text-xs font-medium text-foreground/80">
                {source.emissions.toLocaleString()} {unit}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Actionable recommendations */}
      <div className="mt-3 rounded-md bg-surface/90 p-3 border border-warning/25 text-xs space-y-1.5">
        <div className="flex items-start gap-2">
          <Lightbulb className="size-3.5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-foreground">Immediate Mitigation Action:</p>
            <p className="text-foreground/85 leading-snug">{topLeak.recommendation}</p>
          </div>
        </div>
        {topLeak.alternativeAction && (
          <div className="flex items-start gap-2 pt-1 border-t border-border/50 text-[11px] text-muted-foreground">
            <ArrowRight className="size-3 text-warning shrink-0 mt-0.5" />
            <span>{topLeak.alternativeAction}</span>
          </div>
        )}
      </div>
    </div>
  )
}
