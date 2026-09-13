'use client'

import { useState } from 'react'
import type { ParsedRecord } from '@/lib/emissions'
import { CATEGORY_COLORS } from '@/lib/emissions'
import { CheckCircle2, AlertCircle, RefreshCw, Calendar, Tag } from 'lucide-react'

interface RecordsPreviewProps {
  records: ParsedRecord[]
  warnings: string[]
  onEditRecord?: (index: number, updated: Partial<ParsedRecord>) => void
}

export function RecordsPreview({ records, warnings }: RecordsPreviewProps) {
  const [filter, setFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  if (records.length === 0) return null

  const filtered = records.filter((r) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'normalized' && r.status === 'unit_normalized') ||
      (filter === 'warnings' && r.status === 'warning')
    const matchesSearch =
      r.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.category.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const validCount = records.filter((r) => r.status !== 'warning').length
  const normalizedCount = records.filter((r) => r.status === 'unit_normalized').length
  const warningCount = records.filter((r) => r.status === 'warning').length

  return (
    <div id="records-preview-container" className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              Parsed Factory Records
            </h3>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-xs font-medium text-primary">
              {records.length} records detected
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Validation check: {validCount} valid · {normalizedCount} unit-converted {warningCount > 0 ? `· ${warningCount} warnings` : ''}
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 text-xs">
          <button
            type="button"
            id="btn-filter-all"
            onClick={() => setFilter('all')}
            className={`rounded-sm px-2.5 py-1 transition-colors ${
              filter === 'all'
                ? 'bg-foreground text-background font-medium'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            All ({records.length})
          </button>
          {normalizedCount > 0 && (
            <button
              type="button"
              id="btn-filter-normalized"
              onClick={() => setFilter('normalized')}
              className={`rounded-sm px-2.5 py-1 transition-colors ${
                filter === 'normalized'
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              Converted ({normalizedCount})
            </button>
          )}
          {warningCount > 0 && (
            <button
              type="button"
              id="btn-filter-warnings"
              onClick={() => setFilter('warnings')}
              className={`rounded-sm px-2.5 py-1 transition-colors ${
                filter === 'warnings'
                  ? 'bg-warning text-warning-foreground font-medium'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              Warnings ({warningCount})
            </button>
          )}
        </div>
      </div>

      {warnings.length > 0 && (
        <div id="parse-warnings-box" className="rounded-md border border-warning/30 bg-warning-muted/60 p-3 text-xs text-foreground/90 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-warning">
            <AlertCircle className="size-3.5" />
            <span>Parser Notice:</span>
          </div>
          <ul className="list-inside list-disc pl-1 text-muted-foreground space-y-0.5">
            {warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Search bar */}
      <div className="relative">
        <input
          type="text"
          id="preview-search-input"
          placeholder="Filter records by item name or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Records table */}
      <div className="max-h-60 overflow-y-auto rounded-md border border-border/80">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 border-b border-border bg-muted/90 backdrop-blur-xs font-mono uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Item / Activity</th>
              <th className="px-3 py-2">Detected Category</th>
              <th className="px-3 py-2 text-right">Raw Qty</th>
              <th className="px-3 py-2 text-right">Normalized</th>
              <th className="px-3 py-2">Period</th>
              <th className="px-3 py-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border font-sans">
            {filtered.map((record) => {
              const catColor = CATEGORY_COLORS[record.category] || '#64748b'
              return (
                <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2 font-mono text-muted-foreground">{record.rowNumber}</td>
                  <td className="px-3 py-2 font-medium text-foreground">
                    <div className="flex items-center gap-1.5">
                      <span>{record.itemName}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                      style={{
                        backgroundColor: `${catColor}15`,
                        color: catColor,
                      }}
                    >
                      <span
                        className="size-1.5 rounded-full"
                        style={{ backgroundColor: catColor }}
                      />
                      {record.category}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                    {record.rawQuantity} {record.rawUnit}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-medium text-foreground">
                    {record.normalizedQuantity.toLocaleString()} {record.normalizedUnit}
                  </td>
                  <td className="px-3 py-2 font-mono text-muted-foreground">
                    {record.date ? (
                      <span className="inline-flex items-center gap-1 text-[11px]">
                        <Calendar className="size-3" />
                        {record.date}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {record.status === 'valid' && (
                      <span title="Valid record" className="inline-flex items-center text-primary">
                        <CheckCircle2 className="size-3.5" />
                      </span>
                    )}
                    {record.status === 'unit_normalized' && (
                      <span
                        title={record.statusNote || 'Unit normalized'}
                        className="inline-flex items-center gap-0.5 text-accent-foreground font-mono text-[10px] bg-accent px-1.5 py-0.5 rounded-sm"
                      >
                        <RefreshCw className="size-3" />
                        conv
                      </span>
                    )}
                    {record.status === 'inferred' && (
                      <span
                        title={record.statusNote || 'Unit inferred'}
                        className="inline-flex items-center text-muted-foreground font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded-sm"
                      >
                        inferred
                      </span>
                    )}
                    {record.status === 'warning' && (
                      <span
                        title={record.statusNote || 'Warning'}
                        className="inline-flex items-center text-warning"
                      >
                        <AlertCircle className="size-3.5" />
                      </span>
                    )}
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
