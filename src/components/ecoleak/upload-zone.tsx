'use client'

import { useRef, useState, type DragEvent } from 'react'
import { cn } from '@/lib/utils'
import {
  ACCEPTED_EXTENSIONS,
  SAMPLE_DATASETS,
  formatFileSize,
  isSupportedFile,
} from '@/lib/emissions'
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  Sparkles,
  ClipboardList,
  CheckCircle,
  X,
  AlertTriangle,
} from 'lucide-react'

interface UploadZoneProps {
  file: File | null
  manualText: string
  activeMode: 'file' | 'manual'
  onModeChange: (mode: 'file' | 'manual') => void
  onFileSelected: (file: File) => void
  onFileCleared: () => void
  onManualTextChange: (text: string) => void
  onLoadSample: (sampleId: string) => void
  onError: (message: string) => void
  disabled?: boolean
}

export function UploadZone({
  file,
  manualText,
  activeMode,
  onModeChange,
  onFileSelected,
  onFileCleared,
  onManualTextChange,
  onLoadSample,
  onError,
  disabled = false,
}: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [validationWarning, setValidationWarning] = useState<string | null>(null)

  function handleFiles(files: FileList | null) {
    const next = files?.[0]
    if (!next) return

    setValidationWarning(null)

    if (!isSupportedFile(next)) {
      onError(
        `"${next.name}" is not supported. Please upload a ${ACCEPTED_EXTENSIONS.join(' or ')} file.`,
      )
      return
    }

    if (next.size === 0) {
      onError(`"${next.name}" is empty (0 bytes). Please choose a valid file with operational records.`)
      return
    }

    if (next.size > 10 * 1024 * 1024) {
      onError(`"${next.name}" exceeds the 10MB limit.`)
      return
    }

    onFileSelected(next)
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
    if (disabled) return
    handleFiles(event.dataTransfer.files)
  }

  return (
    <div id="factory-data-upload-card" className="space-y-4">
      {/* Upload mode tabs */}
      <div className="flex flex-col gap-2 border-b border-border pb-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1.5 p-0.5 rounded-lg bg-muted/60 text-xs">
          <button
            type="button"
            id="tab-mode-file"
            onClick={() => onModeChange('file')}
            disabled={disabled}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors',
              activeMode === 'file'
                ? 'bg-surface text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <FileSpreadsheet className="size-3.5" />
            File Upload (CSV / TXT)
          </button>
          <button
            type="button"
            id="tab-mode-manual"
            onClick={() => onModeChange('manual')}
            disabled={disabled}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors',
              activeMode === 'manual'
                ? 'bg-surface text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <ClipboardList className="size-3.5" />
            Paste / Manual Data
          </button>
        </div>

        {/* Sample dataset dropdown / badge */}
        <div className="flex min-w-0 items-center gap-1">
          <span className="text-[11px] font-mono text-muted-foreground hidden sm:inline">
            Quick demo:
          </span>
          <select
            id="sample-dataset-selector"
            disabled={disabled}
            onChange={(e) => {
              if (e.target.value) {
                onLoadSample(e.target.value)
                e.target.value = ''
              }
            }}
            defaultValue=""
            className="w-full min-w-0 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground cursor-pointer hover:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary sm:w-auto"
          >
            <option value="" disabled>
              ⚡ Load Sample Dataset...
            </option>
            {SAMPLE_DATASETS.map((ds) => (
              <option key={ds.id} value={ds.id}>
                {ds.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* MODE 1: FILE DRAG & DROP */}
      {activeMode === 'file' ? (
        file ? (
          <div
            id="selected-file-card"
            className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span
                aria-hidden="true"
                className="grid size-10 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground"
              >
                <FileSpreadsheet className="size-5" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {file.name}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[11px] text-primary font-medium">
                    <CheckCircle className="size-3" /> Validated
                  </span>
                </div>
                <p className="font-mono text-xs text-muted-foreground">
                  {formatFileSize(file.size)} · Ready for carbon parsing
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                id="btn-replace-file"
                onClick={() => inputRef.current?.click()}
                disabled={disabled}
                className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                Change
              </button>
              <button
                type="button"
                id="btn-remove-file"
                onClick={onFileCleared}
                disabled={disabled}
                className="rounded-md p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Remove file"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        ) : (
          <div
            id="dropzone-area"
            role="button"
            tabIndex={0}
            aria-label="Upload factory operational data file"
            onClick={() => !disabled && inputRef.current?.click()}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
                e.preventDefault()
                inputRef.current?.click()
              }
            }}
            onDragOver={(e) => {
              e.preventDefault()
              if (!disabled) setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-all',
              isDragging
                ? 'border-primary bg-accent/60 scale-[0.99]'
                : 'border-border bg-surface hover:border-primary/50 hover:bg-accent/20',
              disabled && 'pointer-events-none opacity-60',
            )}
          >
            <span
              aria-hidden="true"
              className="grid size-12 place-items-center rounded-full border border-border bg-background text-primary shadow-xs"
            >
              <UploadCloud className="size-6" />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Drag &amp; drop factory data file, or{' '}
                <span className="text-primary font-semibold underline underline-offset-2">
                  browse
                </span>
              </p>
              <p className="font-mono text-xs text-muted-foreground">
                Supports {ACCEPTED_EXTENSIONS.join(', ').toUpperCase()} · Auto-detects columns &amp; units
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 font-mono">
                Item / Input
              </span>
              <span>+</span>
              <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 font-mono">
                Quantity
              </span>
              <span>+</span>
              <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 font-mono">
                Unit
              </span>
              <span>+</span>
              <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 font-mono text-muted-foreground/70">
                Date (opt)
              </span>
            </div>
            <input
              ref={inputRef}
              id="file-input-field"
              type="file"
              accept={ACCEPTED_EXTENSIONS.join(',')}
              className="sr-only"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>
        )
      ) : (
        /* MODE 2: MANUAL / PASTE DATA OPTION */
        <div id="manual-input-box" className="space-y-2.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1 font-mono">
              <FileText className="size-3.5 text-primary" />
              Paste CSV or tabular records below:
            </span>
            <button
              type="button"
              onClick={() => onLoadSample('automotive-assembly')}
              className="text-primary hover:underline font-medium"
            >
              Insert example template
            </button>
          </div>
          <textarea
            id="manual-records-textarea"
            rows={7}
            value={manualText}
            onChange={(e) => onManualTextChange(e.target.value)}
            disabled={disabled}
            placeholder={`Item, Quantity, Unit, Date\nGrid Electricity, 120 MWh, kWh, Jan 2024\nDiesel Generator, 2400 gallons, L, Jan 2024\nVirgin Steel Coils, 35 metric tons, kg, Jan 2024\nRoad Freight Shipping, 12500 ton-miles, tkm, Jan 2024\nNatural Gas Boiler, 4200 m3, m3, Jan 2024`}
            className="w-full rounded-md border border-border bg-surface p-3 font-mono text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
          />
          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
            <span>{manualText ? `${manualText.trim().split('\n').length} lines entered` : 'Empty input'}</span>
            <span>Comma, tab, or semicolon separated</span>
          </div>
        </div>
      )}
    </div>
  )
}
