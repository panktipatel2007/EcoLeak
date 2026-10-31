'use client'

import { useState, useEffect } from 'react'
import {
  calculateEmissionsFromRecords,
  parseFactoryText,
  SAMPLE_DATASETS,
  type EmissionsResult,
  type ParsedRecord,
} from '@/lib/emissions'
import { UploadZone } from './upload-zone'
import { ResultsSection } from './results-section'
import { RecordsPreview } from './records-preview'
import { AiAssistant } from './ai-assistant'
import { SavedAuditsModal } from './saved-audits-modal'
import { AuthModal } from './auth-modal'
import {
  getUserAudits,
  saveAuditToFirestore,
  saveGuestDraft,
  getGuestDraft,
  clearGuestDraft,
  type SavedAudit,
} from '@/lib/firestore-service'
import { useAuth } from '@/lib/auth-context'
import {
  CheckCircle2,
  AlertCircle,
  BarChart3,
  RotateCcw,
  UploadCloud,
  LayoutDashboard,
  MessageSquareText,
  History,
  PlusCircle,
} from 'lucide-react'

type Status = 'idle' | 'loading' | 'success'
type View = 'setup' | 'dashboard' | 'advisor'

interface EcoLeakAppProps {
  initialView?: View
}

export function EcoLeakApp({ initialView }: EcoLeakAppProps) {
  const { user } = useAuth()
  const [activeMode, setActiveMode] = useState<'file' | 'manual'>('file')
  const [file, setFile] = useState<File | null>(null)
  const [manualText, setManualText] = useState<string>('')
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<EmissionsResult | null>(null)
  const [analyzedName, setAnalyzedName] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [unit, setUnit] = useState<'tCO2e' | 'kgCO2e'>('tCO2e')
  const [view, setView] = useState<View>(initialView || 'setup')
  const [savedAuditsOpen, setSavedAuditsOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const isLoading = status === 'loading'

  // Staged parsed records for live validation and record preview
  const [stagedRecords, setStagedRecords] = useState<ParsedRecord[]>([])
  const [stagedWarnings, setStagedWarnings] = useState<string[]>([])

  // On mount or user change: check for existing draft / past audits
  useEffect(() => {
    async function loadInitialAuditState() {
      // 1. If user just logged in and had a guest draft, transfer draft to their cloud account
      const draft = getGuestDraft()
      if (user && draft) {
        try {
          await saveAuditToFirestore(user.uid, draft.title, draft.resultData)
          clearGuestDraft()
        } catch (e) {
          console.warn('Could not auto-sync guest draft:', e)
        }
      }

      // 2. If logged in, fetch user's audits. If they have past data, open directly on dashboard!
      if (user) {
        const userAudits = await getUserAudits(user.uid)
        if (userAudits && userAudits.length > 0) {
          const latest = userAudits[0]
          setResult(latest.resultData)
          setAnalyzedName(latest.title)
          if (latest.resultData.records) {
            setStagedRecords(latest.resultData.records)
          }
          setStatus('success')
          setView('dashboard')
          return
        } else {
          // If brand new account with 0 audits, direct to Import data page
          setView('setup')
        }
      } else if (draft) {
        // If guest has a draft saved, restore it
        setResult(draft.resultData)
        setAnalyzedName(draft.title)
        if (draft.resultData.records) {
          setStagedRecords(draft.resultData.records)
        }
        setStatus('success')
        setView('dashboard')
      }
    }

    loadInitialAuditState()
  }, [user])

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

    setStatus('loading')
    setTimeout(async () => {
      const computed = calculateEmissionsFromRecords(records, unit)
      computed.warnings = warnings
      setResult(computed)
      setAnalyzedName(sample.name)
      setStatus('success')
      setView('dashboard')

      // Auto-save draft into history
      if (user) {
        await saveAuditToFirestore(user.uid, sample.name, computed)
      } else {
        saveGuestDraft(computed, sample.name)
      }
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
      const auditTitle = activeMode === 'file' && file ? file.name : `Factory Operational Audit (${new Date().toLocaleDateString()})`

      setResult(computed)
      setAnalyzedName(auditTitle)
      setStatus('success')
      setView('dashboard')

      // Auto-save draft into History so old data is always preserved!
      if (user) {
        await saveAuditToFirestore(user.uid, auditTitle, computed)
      } else {
        saveGuestDraft(computed, auditTitle)
      }
    } catch (err: any) {
      setStatus('idle')
      setError(err?.message || 'Something went wrong while analyzing. Please check your data.')
    }
  }

  // Handle selecting a saved audit from History
  function handleSelectSavedAudit(audit: SavedAudit) {
    setResult(audit.resultData)
    setAnalyzedName(audit.title)
    if (audit.resultData.records) {
      setStagedRecords(audit.resultData.records)
    }
    setStatus('success')
    setView('dashboard')
  }

  // Reset to Import new data while preserving history
  function handleGoToImport() {
    setView('setup')
  }

  // Quick reset for starting fresh import
  function handleReset() {
    setFile(null)
    setManualText('')
    setStagedRecords([])
    setStagedWarnings([])
    setError(null)
    setView('setup')
  }

  const hasStaged = stagedRecords.length > 0

  const navigation = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'setup' as const, label: 'Import data', icon: UploadCloud },
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
          {/* Import New Data quick button if currently on dashboard */}
          {result && view === 'dashboard' && (
            <button
              type="button"
              id="btn-import-new-data"
              onClick={handleGoToImport}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors shadow-xs"
            >
              <PlusCircle className="size-3.5" />
              <span>Import New Data</span>
            </button>
          )}

          {/* History Button: inspect and restore past calculations */}
          <button
            type="button"
            id="btn-open-history"
            onClick={() => setSavedAuditsOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors shadow-xs"
          >
            <History className="size-3.5 text-emerald-600" />
            <span>History</span>
          </button>

          {result ? (
            <span className="hidden items-center gap-1.5 text-[11px] font-mono text-primary sm:flex">
              <CheckCircle2 className="size-3.5" /> Draft saved
            </span>
          ) : (
            <span className="text-[11px] font-mono text-muted-foreground hidden sm:inline">Import Stage</span>
          )}
        </div>
      </nav>

      {/* VIEW 1: IMPORT DATA */}
      {view === 'setup' && (
        <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(260px,0.65fr)] lg:items-start">
          <div className="min-w-0 space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 font-mono text-xs text-muted-foreground shadow-xs">
                  <span
                    aria-hidden="true"
                    className="size-1.5 rounded-full bg-emerald-500"
                  />
                  Import Factory Data
                </span>
                <span className="text-[11px] font-mono text-muted-foreground/80">
                  GHG Protocol Scope 1, 2 &amp; 3
                </span>
              </div>

              <h1 className="text-3xl font-bold leading-[1.15] tracking-tight text-foreground text-balance sm:text-4xl">
                Upload or paste your factory operations.
              </h1>

              <p className="max-w-md text-pretty text-sm leading-relaxed text-muted-foreground">
                Drop your CSV or machine logs. EcoLeak calculates emissions and preserves all your previous drafts in your <strong>History</strong>.
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
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isLoading ? (
                    <>
                      <svg
                        className="size-4 animate-spin text-white"
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
                      Calculating Factory Emissions…
                    </>
                  ) : (
                    <>
                      <BarChart3 className="size-4" />
                      Calculate Factory Emissions
                    </>
                  )}
                </button>

                {result && (
                  <button
                    type="button"
                    id="btn-reset-audit"
                    onClick={handleReset}
                    title="Clear current inputs"
                    className="inline-flex h-11 items-center justify-center rounded-md border border-border bg-surface px-3 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <RotateCcw className="size-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Instant Preview of Uploaded Records */}
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
            <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-emerald-600">Continuous Auditing</p>
            <h2 className="mt-2 text-lg font-semibold text-foreground">Drafts &amp; History Auto-Saved</h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Every time you calculate emissions, your audit is preserved. You can always click <strong>History</strong> in the top right to restore previous plant runs.
            </p>
            <div className="mt-5 space-y-4">
              {['Normalize factory inputs', 'View dashboard & Pareto leaks', 'Access past audits from History'].map((step, index) => (
                <div key={step} className="flex min-w-0 gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-emerald-500/10 font-mono text-[11px] font-bold text-emerald-600">0{index + 1}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{step}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {index === 0
                        ? 'Drop your operational CSV or text logs.'
                        : index === 1
                        ? 'See totals, Scope breakdown, and circular recommendations.'
                        : 'Switch between previous assessments anytime.'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: DASHBOARD */}
      {view === 'dashboard' && result && (
        <ResultsSection
          result={result}
          fileName={analyzedName}
          unit={unit}
          onToggleUnit={handleToggleUnit}
          showAssistant={false}
        />
      )}

      {/* VIEW 3: ADVISOR */}
      {view === 'advisor' && result && (
        <div className="mx-auto w-full max-w-4xl space-y-5">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-emerald-600">Step 03 / Decision support</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Make the next reduction move.</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Ask questions about this audit. Every response is grounded in the calculated figures above.</p>
          </div>
          <AiAssistant result={result} unit={unit} />
        </div>
      )}

      {/* History Modal */}
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
