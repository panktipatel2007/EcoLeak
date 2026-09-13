import type { CircularRecommendation } from '@/lib/emissions'

interface CircularRecommendationCardProps {
  recommendation: CircularRecommendation
  unit: string
}

export function CircularRecommendationCard({
  recommendation,
  unit,
}: CircularRecommendationCardProps) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-primary/30 bg-primary/[0.03] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="grid size-5 place-items-center rounded-full bg-primary text-primary-foreground"
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
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
          </span>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Circular Economy Recommendation
          </p>
        </div>

        <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 font-mono text-xs font-medium text-primary">
          ↓ {recommendation.reduction_percentage}% emission reduction
        </span>
      </div>

      <div className="mt-4">
        <h3 className="text-lg font-semibold leading-snug tracking-tight text-foreground">
          Replace {recommendation.target_source} with{' '}
          <span className="text-primary underline decoration-primary/40 underline-offset-4">
            {recommendation.alternative_name}
          </span>
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {recommendation.action}
        </p>
      </div>

      <div className="mt-4 grid gap-3 rounded-md border border-border/60 bg-background/60 p-3 sm:grid-cols-2">
        <div>
          <span className="text-xs text-muted-foreground">
            Estimated Impact
          </span>
          <p className="font-mono text-lg font-semibold text-foreground">
            -{recommendation.potential_co2e_savings.toFixed(2)}{' '}
            <span className="text-xs font-normal text-muted-foreground">
              {unit}
            </span>
          </p>
        </div>

        <div>
          <span className="text-xs text-muted-foreground">Co-Benefits</span>
          <p className="text-xs leading-relaxed text-foreground/80">
            {recommendation.co_benefits}
          </p>
        </div>
      </div>
    </div>
  )
}
