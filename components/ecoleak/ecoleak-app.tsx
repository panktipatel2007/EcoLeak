'use client'

import { useState } from 'react'
import {
  calculateEmissions,
  type EmissionsResult,
} from '@/lib/emissions'
import { UploadZone } from './upload-zone'
import { ResultsSection } from './results-section'
import { EmptyResults } from './empty-results'

type Status = 'idle' | 'loading' | 'success'

export function EcoLeakApp() {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<EmissionsResult | null>(null)
  const [analyzedName, setAnalyzedName] = useState<string>()
  const [error, setError] = useState<string | null>(null)

  async function handleAnalyze() {
    if (!file) return
    setStatus('loading')
    setError(null)
    try {
      const data = await calculateEmissions(file)
      setResult(data)
      setAnalyzedName(file.name)
      setStatus('success')
    } catch (err: unknown) {
      setStatus('idle')
      const message =
        err instanceof Error
          ? err.message
          : 'Something went wrong while analyzing. Please try again.'
      setError(message)
    }
  }

  function handleFileSelected(next: File) {
    setFile(next)
    setError(null)
  }

  function handleFileCleared() {
    setFile(null)
    setError(null)
  }

  const isLoading = status === 'loading'

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-12">
      {/* Left: intro + upload */}
      <div className="space-y-6">
        <div className="space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 font-mono text-xs text-muted-foreground">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-primary"
            />
            Carbon Overview
          </span>
          <h1 className="text-3xl font-semibold leading-[1.1] tracking-tight text-foreground text-balance sm:text-4xl">
            Find the input driving most of your factory&apos;s emissions.
          </h1>
          <p className="max-w-md text-pretty leading-relaxed text-muted-foreground">
            Upload your existing operational data as a CSV or TXT file. EcoLeak
            breaks it down by source so you know exactly where to cut CO
            <sub className="text-[0.7em]">2</sub> first — no carbon-accounting
            expertise needed.
          </p>
        </div>

        <div className="space-y-3">
          <UploadZone
            file={file}
            onFileSelected={handleFileSelected}
            onFileCleared={handleFileCleared}
            onError={setError}
            disabled={isLoading}
          />

          {error ? (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mt-0.5 shrink-0"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4" />
                <path d="M12 16h.01" />
              </svg>
              {error}
            </p>
          ) : null}

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!file || isLoading}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isLoading ? (
              <>
                <svg
                  className="size-4 animate-spin"
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
                Analyzing emissions…
              </>
            ) : (
              'Analyze emissions'
            )}
          </button>
        </div>
      </div>

      {/* Right: results or empty state */}
      <div>
        {status === 'success' && result ? (
          <ResultsSection result={result} fileName={analyzedName} />
        ) : (
          <EmptyResults loading={isLoading} />
        )}
      </div>
    </div>
  )
}
