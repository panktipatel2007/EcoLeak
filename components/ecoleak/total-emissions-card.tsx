interface TotalEmissionsCardProps {
  total: number
  unit: string
  sourceCount: number
}

export function TotalEmissionsCard({
  total,
  unit,
  sourceCount,
}: TotalEmissionsCardProps) {
  return (
    <div className="flex flex-col justify-between rounded-lg border border-border bg-surface p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Total emissions
      </p>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="font-mono text-4xl font-semibold tabular-nums text-foreground">
          {total.toFixed(1)}
        </span>
        <span className="font-mono text-sm text-muted-foreground">{unit}</span>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Measured across {sourceCount} operational inputs.
      </p>
    </div>
  )
}
