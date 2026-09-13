interface EmptyResultsProps {
  loading?: boolean
}

export function EmptyResults({ loading = false }: EmptyResultsProps) {
  return (
    <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface/60 px-6 py-12 text-center">
      <span
        aria-hidden="true"
        className="grid size-12 place-items-center rounded-full border border-border bg-background text-muted-foreground"
      >
        {loading ? (
          <svg
            className="size-5 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              cx="12"
              cy="12"
              r="9"
              stroke="currentColor"
              strokeWidth="3"
              strokeOpacity="0.3"
            />
            <path
              d="M21 12a9 9 0 0 0-9-9"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 3v16a2 2 0 0 0 2 2h16" />
            <path d="m19 9-5 5-4-4-3 3" />
          </svg>
        )}
      </span>
      <p className="mt-4 text-sm font-medium text-foreground">
        {loading ? 'Crunching your data…' : 'No analysis yet'}
      </p>
      <p className="mt-1 max-w-xs text-pretty text-sm leading-relaxed text-muted-foreground">
        {loading
          ? 'We are estimating emissions for each operational input.'
          : 'Upload a file and run an analysis to see your total emissions and biggest carbon leak here.'}
      </p>
    </div>
  )
}
