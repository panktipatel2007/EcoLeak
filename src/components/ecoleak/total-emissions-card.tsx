'use client'

import { TreePine, Car, Home, ShieldAlert, Sparkles } from 'lucide-react'

interface TotalEmissionsCardProps {
  total: number
  totalKg: number
  unit: string
  sourceCount: number
  onToggleUnit?: () => void
  equivalencies?: {
    treesPerYear: number
    carKilometers: number
    homesAnnualEnergy: number
  }
}

export function TotalEmissionsCard({
  total,
  totalKg,
  unit,
  sourceCount,
  onToggleUnit,
  equivalencies,
}: TotalEmissionsCardProps) {
  return (
    <div id="total-emissions-card" className="flex flex-col justify-between rounded-lg border border-border bg-surface p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-primary" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Total Factory Emissions
          </p>
        </div>
        {onToggleUnit && (
          <button
            type="button"
            id="btn-unit-toggle"
            onClick={onToggleUnit}
            title="Toggle between Metric Tonnes (tCO2e) and Kilograms (kgCO2e)"
            className="rounded-md border border-border bg-background px-2 py-0.5 font-mono text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
          >
            Unit: <span className="font-semibold text-primary">{unit}</span> ⇄
          </button>
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-4xl font-bold tracking-tight tabular-nums text-foreground">
            {total.toLocaleString(undefined, {
              minimumFractionDigits: unit === 'tCO2e' ? 2 : 0,
              maximumFractionDigits: unit === 'tCO2e' ? 2 : 1,
            })}
          </span>
          <span className="font-mono text-base font-semibold text-primary">{unit}</span>
        </div>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          ({totalKg.toLocaleString()} kg CO₂e across {sourceCount} operational inputs)
        </p>
      </div>

      {/* Real-world EPA Equivalencies */}
      {equivalencies && (
        <div className="mt-4 pt-3 border-t border-border/80 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-md bg-muted/40 p-2" title="Trees needed for 1 year to sequester this carbon">
            <div className="flex items-center justify-center gap-1 text-primary">
              <TreePine className="size-3.5" />
              <span className="font-mono font-bold">{equivalencies.treesPerYear.toLocaleString()}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Trees/yr needed</p>
          </div>

          <div className="rounded-md bg-muted/40 p-2" title="Equivalent distance in passenger vehicle travel">
            <div className="flex items-center justify-center gap-1 text-primary">
              <Car className="size-3.5" />
              <span className="font-mono font-bold">{(equivalencies.carKilometers / 1000).toFixed(0)}k</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Car km driven</p>
          </div>

          <div className="rounded-md bg-muted/40 p-2" title="Equivalent US households powered for 1 year">
            <div className="flex items-center justify-center gap-1 text-primary">
              <Home className="size-3.5" />
              <span className="font-mono font-bold">{equivalencies.homesAnnualEnergy}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Homes/yr power</p>
          </div>
        </div>
      )}
    </div>
  )
}
