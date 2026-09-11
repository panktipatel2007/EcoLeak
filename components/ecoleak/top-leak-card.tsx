import type { EmissionSource, TopLeak } from '@/lib/emissions'

interface TopLeakCardProps {
  topLeak: TopLeak
  source?: EmissionSource
  unit: string
}

export function TopLeakCard({ topLeak, source, unit }: TopLeakCardProps) {
  return (
    <div className="relative flex flex-col justify-between overflow-hidden rounded-lg border border-warning/40 bg-warning-muted p-5">
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="grid size-5 place-items-center rounded-full bg-warning text-warning-foreground"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
        </span>
        <p className="text-xs font-semibold uppercase tracking-wider text-warning">
          Biggest carbon leak
        </p>
      </div>

      <div className="mt-4">
        <p className="text-2xl font-semibold leading-tight tracking-tight text-foreground text-balance">
          {topLeak.name}
        </p>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-mono text-3xl font-semibold tabular-nums text-warning">
            {topLeak.percentage}%
          </span>
          {source ? (
            <span className="font-mono text-sm text-foreground/70">
              {source.emissions.toFixed(2)} {unit}
            </span>
          ) : null}
        </div>
      </div>

      <p className="mt-3 text-sm text-foreground/75">
        This single input drives most of your footprint — reduce it first for
        the biggest impact.
      </p>
    </div>
  )
}
