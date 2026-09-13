'use client'

import { useState, useEffect } from 'react'
import {
  calculateEmissions,
  calculateEmissionsFromRecords,
  parseFactoryText,
  SAMPLE_DATASETS,
  type EmissionsResult,
  type ParsedRecord,
} from '@/lib/emissions'
import { UploadZone } from './upload-zone'
import { ResultsSection } from './results-section'
import { EmptyResults } from './empty-results'
import { RecordsPreview } from './records-preview'
import { AiAssistant } from './ai-assistant'
import { SavedAuditsModal } from './saved-audits-modal'
import { AuthModal } from './auth-modal'
import type { SavedAudit } from '@/lib/firestore-service'
import {
  CheckCircle2,
  AlertCircle,
  BarChart3,
  RotateCcw,
  UploadCloud,
  LayoutDashboard,
  MessageSquareText,
  FolderOpen,
} from 'lucide-react'

type Status = 'idle' | 'loading' | 'success'
type View = 'setup' | 'dashboard' | 'advisor'

export function EcoLeakApp() {
  const [activeMode, setActiveMode] = useState<'file' | 'manual'>('file')
  const [file, setFile] = useState<File | null>(null)
  const [manualText, setManualText] = useState<string>('')
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<EmissionsResult | null>(null)
  const [analyzedName, setAnalyzedName] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [unit, setUnit] = useState<'tCO2e' | 'kgCO2e'>('tCO2e')
  const [view, setView] = useState<View>('setup')
  const [savedAuditsOpen, setSavedAuditsOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)

  // Staged parsed records for live validation and record preview
  const [stagedRecords, setStagedRecords] = useState<ParsedRecord[]>([])
  const [stagedWarnings, setStagedWarnings] = useState<string[]>([])

  // Helper to parse file or manual text into staged records
  async function parseSourceData(
    targetFile: File | null,
    text: string,
    mode: 'file' | 'manual',
  ) {
    try {
      let rawContent = ''
      if (mode === 'file' && targetFile) {
        rawContent = await targetFile.text()
      } else if (mode === 'manual') {
        rawContent = text
      }

      if (!rawContent.trim()) {
        setStagedRecords([])
        setStagedWarnings([])
        return
      }

      const { records, warnings } = parseFactoryText(rawContent)
      setStagedRecords(records)
      setStagedWarnings(warnings)
    } catch {
      // Ignored during passive staging
    }
  }

  // Handle file select
  async function handleFileSelected(next: File) {
    setFile(next)
    setError(null)
    await parseSourceData(next, manualText, 'file')
  }

  // Handle file clear
  function handleFileCleared() {
    setFile(null)
    setStagedRecords([])
    setStagedWarnings([])
    setError(null)
  }

  // Handle manual text change
  function handleManualTextChange(text: string) {
    setManualText(text)
    setError(null)
    parseSourceData(null, text, 'manual')
  }

  // Handle quick-load sample dataset
  function handleLoadSample(sampleId: string) {
    const sample = SAMPLE_DATASETS.find((s) => s.id === sampleId)
    if (!sample) return

    setActiveMode('manual')
    setManualText(sample.content)
    setFile(null)
    setError(null)

    const { records, warnings } = parseFactoryText(sample.content)
    setStagedRecords(records)
    setStagedWarnings(warnings)

    // Automatically calculate for instant hackathon showcase
    setStatus('loading')
    setTimeout(() => {
      const computed = calculateEmissionsFromRecords(records, unit)
      computed.warnings = warnings
      setResult(computed)
      setAnalyzedName(sample.name)
      setStatus('success')
      setView('dashboard')
    }, 450)
  }

  // Toggle unit and re-compute result if present
  function handleToggleUnit() {
    const nextUnit = unit === 'tCO2e' ? 'kgCO2e' : 'tCO2e'
    setUnit(nextUnit)
    if (result && stagedRecords.length > 0) {
      const updated = calculateEmissionsFromRecords(stagedRecords, nextUnit)
      updated.warnings = stagedWarnings
      setResult(updated)
    }
  }

  // Main Analyze Action
  async function handleAnalyze() {
    setError(null)
    if (activeMode === 'file' && !file) {
      setError('Please choose or drop a factory data file first.')
      return
    }
    if (activeMode === 'manual' && !manualText.trim()) {
      setError('Please paste or type operational records first.')
      return
    }

    setStatus('loading')
    try {
      let recordsToAnalyze = stagedRecords
      let warningsToReport = stagedWarnings

      if (recordsToAnalyze.length === 0) {
        let content = ''
        if (activeMode === 'file' && file) {
          content = await file.text()
        } else {
          content = manualText
        }
        const parsed = parseFactoryText(content)
        recordsToAnalyze = parsed.records
        warningsToReport = parsed.warnings
        setStagedRecords(recordsToAnalyze)
        setStagedWarnings(warningsToReport)
      }

      if (recordsToAnalyze.length === 0) {
        throw new Error('No valid activity records could be parsed. Check your data format.')
      }

      // Small delay for natural feel
      await new Promise((resolve) => setTimeout(resolve, 400))

      const computed = calculateEmissionsFromRecords(recordsToAnalyze, unit)
      computed.warnings = warningsToReport
      setResult(computed)
      setAnalyzedName(activeMode === 'file' && file ? file.name : 'Manual Factory Input')
      setStatus('success')
      setView('dashboard')
    } catch (err: any) {
      setStatus('idle')
      setError(err?.message || 'Something went wrong while analyzing. Please check your data.')
    }
  }

  // Handle selecting a saved audit from Cloud
  function handleSelectSavedAudit(audit: SavedAudit) {
    setResult(audit.resultData)
    setAnalyzedName(audit.title)
    if (audit.resultData.records) {
      setStagedRecords(audit.resultData.records)
    }
    setStatus('success')
    setView('dashboard')
  }

  // Quick reset to start a new analysis
  function handleReset() {
    setFile(null)
    setManualText('')
    setStagedRecords([])
    setStagedWarnings([])
    setResult(null)
    setStatus('idle')
    setError(null)
    setView('setup')
  }

  const isLoading = status === 'loading'
  const hasStaged = stagedRecords.length > 0

  const navigation = [
    { id: 'setup' as const, label: 'Import data', icon: UploadCloud },
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'advisor' as const, label: 'Advisor', icon: MessageSquareText },
  ]

  return (
    <div className="space-y-6">
      <nav aria-label="Audit workflow" className="flex items-center justify-between gap-3 border-b border-border pb-3 flex-wrap">
        <div className="flex items-center gap-1 rounded-lg bg-muted/60 p-1">
          {navigation.map(({ id, label, icon: Icon }, index) => {
            const isAvailable = id === 'setup' || Boolean(result)
            return (
              <button
                key={id}
                type="button"
                onClick={() => isAvailable && setView(id)}
                disabled={!isAvailable}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
                  view === id
                    ? 'bg-surface text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40'
                }`}
              >
                <span className="font-mono text-[10px] text-primary">0{index + 1}</span>
                <Icon className="size-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            id="btn-open-saved-audits"
            onClick={() => setSavedAuditsOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors shadow-xs"
          >
            <FolderOpen className="size-3.5 text-primary" />
            <span>Saved Audits</span>
          </button>

          {result ? (
            <span className="hidden items-center gap-1.5 text-[11px] font-mono text-primary sm:flex">
              <CheckCircle2 className="size-3.5" /> Audit complete
            </span>
          ) : (
            <span className="text-[11px] font-mono text-muted-foreground hidden sm:inline">Step 1 of 3</span>
          )}
        </div>
      </nav>

      {view === 'setup' && <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(260px,0.65fr)] lg:items-start">
      <div className="min-w-0 space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 font-mono text-xs text-muted-foreground shadow-xs">
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-primary"
              />
              Hackathon Factory Carbon Audit
            </span>
            <span className="text-[11px] font-mono text-muted-foreground/80">
              GHG Protocol Scope 1, 2 &amp; 3
            </span>
          </div>

          <h1 className="text-3xl font-bold leading-[1.15] tracking-tight text-foreground text-balance sm:text-4xl">
            Detect and eliminate your factory&apos;s biggest carbon leaks.
          </h1>

          <p className="max-w-md text-pretty text-sm leading-relaxed text-muted-foreground">
            Upload your factory CSV or paste raw operational logs. EcoLeak
            automatically detects electricity, fuels, materials, and freight to
            quantify CO₂e and pinpoint your #1 reduction opportunity.
          </p>
        </div>

        {/* Upload & Manual Data Module */}
        <div className="space-y-4">
          <UploadZone
            file={file}
            manualText={manualText}
            activeMode={activeMode}
            onModeChange={setActiveMode}
            onFileSelected={handleFileSelected}
            onFileCleared={handleFileCleared}
            onManualTextChange={handleManualTextChange}
            onLoadSample={handleLoadSample}
            onError={setError}
            disabled={isLoading}
          />

          {/* Validation or parsing error banner */}
          {error ? (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive font-medium"
            >
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              {error}
            </p>
          ) : null}

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              id="btn-analyze-emissions"
              onClick={handleAnalyze}
              disabled={isLoading || (!file && !manualText.trim())}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isLoading ? (
                <>
                  <svg
                    className="size-4 animate-spin text-primary-foreground"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
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
                  Calculating Carbon CO₂e…
                </>
              ) : (
                <>
                  <BarChart3 className="size-4" />
                  Calculate Factory Emissions
                </>
              )}
            </button>

            {status === 'success' && (
              <button
                type="button"
                id="btn-reset-audit"
                onClick={handleReset}
                title="Reset & Start New Audit"
                className="inline-flex h-11 items-center justify-center rounded-md border border-border bg-surface px-3 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <RotateCcw className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* Feature 1 & 2: Instant Preview of Uploaded Records */}
        {hasStaged && (
          <div className="pt-2">
            <RecordsPreview
              records={stagedRecords}
              warnings={stagedWarnings}
            />
          </div>
        )}
      </div>

        <div className="min-w-0 rounded-lg border border-border bg-surface/70 p-5">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-primary">Audit workflow</p>
          <h2 className="mt-2 text-lg font-semibold text-foreground">From raw records to a reduction plan.</h2>
          <div className="mt-5 space-y-4">
            {['Normalize factory activity', 'Locate the biggest carbon leak', 'Turn findings into action'].map((step, index) => (
              <div key={step} className="flex min-w-0 gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 font-mono text-[11px] font-bold text-primary">0{index + 1}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{step}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{index === 0 ? 'CSV, TXT, or pasted operational logs.' : index === 1 ? 'See totals, sources, categories, and trends.' : 'Ask the grounded advisor what to do next.'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      }

      {view === 'dashboard' && result && (
        <ResultsSection
          result={result}
          fileName={analyzedName}
          unit={unit}
          onToggleUnit={handleToggleUnit}
          showAssistant={false}
        />
      )}

      {view === 'advisor' && result && (
        <div className="mx-auto w-full max-w-4xl space-y-5">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-primary">Step 03 / Decision support</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Make the next reduction move.</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Ask questions about this audit. Every response is grounded in the calculated figures above.</p>
          </div>
          <AiAssistant result={result} unit={unit} />
        </div>
      )}

      {/* Cloud Audits & Auth Modals */}
      <SavedAuditsModal
        isOpen={savedAuditsOpen}
        onClose={() => setSavedAuditsOpen(false)}
        onSelectAudit={handleSelectSavedAudit}
        onRequireAuth={() => setAuthModalOpen(true)}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  )
}
