'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { EmissionSource } from '@/lib/emissions'
import { CATEGORY_COLORS } from '@/lib/emissions'
import { Download, Search, Filter } from 'lucide-react'

interface BreakdownTableProps {
  breakdown: EmissionSource[]
  topLeakName: string
  unit: string
  onExportCSV?: () => void
}

export function BreakdownTable({
  breakdown,
  topLeakName,
  unit,
  onExportCSV,
}: BreakdownTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const categories = Array.from(new Set(breakdown.map((b) => b.category)))

  const filtered = breakdown.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCat = selectedCategory === 'all' || item.category === selectedCategory
    return matchesSearch && matchesCat
  })

  function handleDownloadCSV() {
    if (onExportCSV) {
      onExportCSV()
      return
    }
    const headers = ['Input / Activity', 'Category', 'Scope', 'Quantity', 'Unit', `Emissions (${unit})`, 'Emissions (kg CO2e)', 'Share (%)', 'Emission Factor']
    const rows = breakdown.map((b) => [
      `"${b.name}"`,
      `"${b.category}"`,
      `"${b.scope}"`,
      b.quantity,
      `"${b.unit}"`,
      b.emissions,
      b.emissionsKg,
      `${b.percentage}%`,
      `"${b.factor} ${b.factorUnit}"`,
    ])
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `EcoLeak_Factory_Emissions_Report.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div id="breakdown-table-container" className="overflow-hidden rounded-lg border border-border bg-surface shadow-xs">
      <div className="border-b border-border p-4 space-y-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-5 text-foreground">
            Activity Carbon Accounting
          </h3>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
            Quantity × emission factor · GHG Protocol
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-start gap-2">
          {/* Category filter */}
          <select
            id="table-category-filter"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-md border border-border bg-background px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Export CSV button */}
          <button
            type="button"
            id="btn-export-csv"
            onClick={handleDownloadCSV}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted hover:border-primary/40 transition-colors"
          >
            <Download className="size-3.5 text-primary" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border bg-muted/50 font-mono uppercase tracking-wider text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3">Source &amp; Category</th>
              <th scope="col" className="px-4 py-3 text-center">Scope</th>
              <th scope="col" className="px-4 py-3 text-right">Normalized Qty</th>
              <th scope="col" className="px-4 py-3 text-right">Factor</th>
              <th scope="col" className="px-4 py-3 text-right">Emissions ({unit})</th>
              <th scope="col" className="px-4 py-3 text-right">Share</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border font-sans">
            {filtered.map((item) => {
              const isLeak = item.name === topLeakName
              const catColor = CATEGORY_COLORS[item.category] || '#64748b'

              return (
                <tr
                  key={item.name}
                  className={cn(
                    'transition-colors hover:bg-muted/30',
                    isLeak && 'bg-warning-muted/30',
                  )}
                >
                  <td className="px-4 py-3 font-normal text-foreground">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className={cn(
                            'size-2 rounded-full shrink-0',
                            isLeak ? 'bg-warning' : 'bg-primary/70',
                          )}
                        />
                        <span className="font-semibold text-foreground text-sm">
                          {item.name}
                        </span>
                        {isLeak && (
                          <span className="rounded-sm bg-warning-muted px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-warning border border-warning/30">
                            Primary Leak
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 pl-4">
                        <span
                          className="inline-block size-1.5 rounded-full"
                          style={{ backgroundColor: catColor }}
                        />
                        <span className="text-[11px] text-muted-foreground">
                          {item.category}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
                      {item.scope}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-right font-mono tabular-nums text-muted-foreground">
                    {item.quantity.toLocaleString()} {item.unit}
                  </td>

                  <td className="px-4 py-3 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
                    {item.factor} {item.factorUnit}
                  </td>

                  <td className="px-4 py-3 text-right font-mono font-bold tabular-nums text-foreground">
                    {item.emissions.toLocaleString(undefined, {
                      minimumFractionDigits: unit === 'tCO2e' ? 2 : 0,
                      maximumFractionDigits: unit === 'tCO2e' ? 3 : 1,
                    })}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden hidden sm:block">
                        <div
                          className={cn('h-full', isLeak ? 'bg-warning' : 'bg-primary')}
                          style={{ width: `${Math.min(100, item.percentage)}%` }}
                        />
                      </div>
                      <span
                        className={cn(
                          'font-mono tabular-nums font-semibold w-9 text-right',
                          isLeak ? 'text-warning font-bold' : 'text-muted-foreground',
                        )}
                      >
                        {item.percentage}%
                      </span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
