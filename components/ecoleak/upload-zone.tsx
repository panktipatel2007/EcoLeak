'use client'

import { useRef, useState, type DragEvent } from 'react'
import { cn } from '@/lib/utils'
import {
  ACCEPTED_EXTENSIONS,
  formatFileSize,
  isSupportedFile,
} from '@/lib/emissions'

interface UploadZoneProps {
  file: File | null
  onFileSelected: (file: File) => void
  onFileCleared: () => void
  onError: (message: string) => void
  disabled?: boolean
}

export function UploadZone({
  file,
  onFileSelected,
  onFileCleared,
  onError,
  disabled = false,
}: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  function handleFiles(files: FileList | null) {
    const next = files?.[0]
    if (!next) return
    if (!isSupportedFile(next)) {
      onError(
        `"${next.name}" isn't supported. Upload a ${ACCEPTED_EXTENSIONS.join(' or ')} file.`,
      )
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

  if (file) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-10 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
              <path d="M14 2v6h6" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {file.name}
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              {formatFileSize(file.size)}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onFileCleared}
          disabled={disabled}
          className="self-start rounded-sm px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50 sm:self-auto"
        >
          Replace file
        </button>
      </div>
    )
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload factory data file"
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
        'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center transition-colors',
        isDragging
          ? 'border-primary bg-accent/60'
          : 'border-border bg-surface hover:border-primary/50 hover:bg-accent/30',
        disabled && 'pointer-events-none opacity-60',
      )}
    >
      <span
        aria-hidden="true"
        className="grid size-11 place-items-center rounded-full border border-border bg-background text-muted-foreground"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <path d="m17 8-5-5-5 5" />
          <path d="M12 3v12" />
        </svg>
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">
          Drag &amp; drop your factory data, or{' '}
          <span className="text-primary underline underline-offset-2">
            browse
          </span>
        </p>
        <p className="font-mono text-xs text-muted-foreground">
          {ACCEPTED_EXTENSIONS.join(', ').toUpperCase()} · operational input log
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS.join(',')}
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  )
}
