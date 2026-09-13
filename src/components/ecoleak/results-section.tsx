'use client'

import { useState } from 'react'
import type { EmissionsResult } from '@/lib/emissions'
import { TotalEmissionsCard } from './total-emissions-card'
import { TopLeakCard } from './top-leak-card'
import { BreakdownChart } from './breakdown-chart'
import { BreakdownTable } from './breakdown-table'
import { RecordsPreview } from './records-preview'
import { AiAssistant } from './ai-assistant'
import { AuthModal } from './auth-modal'
import { useAuth } from '@/lib/auth-context'
import { saveAuditToFirestore } from '@/lib/firestore-service'
import {
  ListFilter,
  ChevronDown,
  ChevronUp,
  Layers,
  Cloud,
  Check,
  Loader2,
} from 'lucide-react'

interface ResultsSectionProps {
  result: EmissionsResult
  fileName?: string
  unit: 'tCO2e' | 'kgCO2e'
  onToggleUnit: () => void
  showAssistant?: boolean
}

export function ResultsSection({
  result,
  fileName,
  unit,
  onToggleUnit,
  showAssistant = true,
}: ResultsSectionProps) {
  const { user } = useAuth()
  const [showRecordsPreview, setShowRecordsPreview] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  const topSource = result.breakdown.find(
    (item) => item.name === result.top_leak.name,
  )

  async function handleSaveAudit() {
    if (!user) {
      setAuthModalOpen(true)
      return
    }

    setIsSaving(true)
    try {
      await saveAuditToFirestore(
        user.uid,
        fileName || `Factory Audit (${new Date().toLocaleDateString()})`,
        result,
      )
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 3000)
    } catch (err) {
      console.error('Failed to save audit to Firestore:', err)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section aria-label="Emissions dashboard" className="space-y-6">
      {/* Top Header info */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Factory Carbon Audit Results
            </h2>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary">
              GHG Protocol Engine
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Analyzed {result.totalRowsCount} activities ({result.validRecordsCount} normalized)
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {fileName ? (
            <span className="truncate max-w-[160px] sm:max-w-[200px] font-mono text-xs text-muted-foreground bg-muted/60 px-2 py-1 rounded-md">
              📄 {fileName}
            </span>
          ) : null}

          <button
            type="button"
            id="btn-save-audit-cloud"
            onClick={handleSaveAudit}
            disabled={isSaving}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
              savedSuccess
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-border bg-surface text-foreground hover:bg-muted'
            }`}
          >
            {isSaving ? (
              <Loader2 className="size-3.5 animate-spin text-primary" />
            ) : savedSuccess ? (
              <Check className="size-3.5 text-primary" />
            ) : (
              <Cloud className="size-3.5 text-primary" />
            )}
            <span>{savedSuccess ? 'Saved to Cloud' : 'Save to Cloud'}</span>
          </button>

          <button
            type="button"
            id="btn-toggle-raw-records"
            onClick={() => setShowRecordsPreview(!showRecordsPreview)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            <ListFilter className="size-3.5 text-primary" />
            {showRecordsPreview ? 'Hide Records' : 'View Parsed Records'}
            {showRecordsPreview ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </button>
        </div>
      </div>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />

      {/* Accordion view of parsed records */}
      {showRecordsPreview && (
        <RecordsPreview records={result.records} warnings={result.warnings} />
      )}

      {/* Summary Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <TotalEmissionsCard
          total={result.total_emissions}
          totalKg={result.total_emissions_kg}
          unit={unit}
          sourceCount={result.breakdown.length}
          onToggleUnit={onToggleUnit}
          equivalencies={result.equivalencies}
        />
        <TopLeakCard
          topLeak={result.top_leak}
          source={topSource}
          unit={unit}
        />
      </div>

      {/* Grounded Gemini AI Decarbonization Assistant */}
      {showAssistant && <AiAssistant result={result} unit={unit} />}

      {/* Category distribution bar */}
      <div id="category-summary-bar" className="rounded-lg border border-border bg-surface p-4 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <Layers className="size-3.5 text-primary" />
            <span>Category Footprint Distribution</span>
          </div>
          <span className="font-mono text-muted-foreground">
            {result.categories.length} emission categories detected
          </span>
        </div>

        {/* Stacked percentage progress bar */}
        <div className="h-3 w-full rounded-full bg-muted overflow-hidden flex shadow-inner">
          {result.categories.map((cat) => (
            <div
              key={cat.category}
              title={`${cat.category}: ${cat.emissions} ${unit} (${cat.percentage}%)`}
              className="h-full transition-all duration-300"
              style={{
                width: `${cat.percentage}%`,
                backgroundColor: cat.color,
              }}
            />
          ))}
        </div>

        {/* Category legend pills */}
        <div className="flex flex-wrap gap-2 pt-1">
          {result.categories.map((cat) => (
            <div
              key={cat.category}
              className="flex items-center gap-1.5 rounded-full border border-border/80 bg-background/80 px-2.5 py-1 text-[11px]"
            >
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: cat.color }}
              />
              <span className="font-medium text-foreground">{cat.category}:</span>
              <span className="font-mono text-muted-foreground font-semibold">
                {cat.percentage}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Charts (Inputs / Categories / Monthly Timeline) */}
      <BreakdownChart
        breakdown={result.breakdown}
        categories={result.categories}
        monthly={result.monthly}
        hasDates={result.hasDates}
        topLeakName={result.top_leak.name}
        unit={unit}
      />

      {/* Breakdown Table & Activity Audit */}
      <BreakdownTable
        breakdown={result.breakdown}
        topLeakName={result.top_leak.name}
        unit={unit}
      />
    </section>
  )
}
