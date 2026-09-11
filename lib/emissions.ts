/**
 * Data contract shared with the FastAPI backend.
 *
 * The real endpoint (POST /calculate-emissions) is expected to return this exact
 * shape, so the UI can stay unchanged when the mock is swapped for a network call.
 */

export interface EmissionSource {
  name: string
  emissions: number
  percentage: number
}

export interface TopLeak {
  name: string
  percentage: number
}

export interface EmissionsResult {
  total_emissions: number
  unit: string
  breakdown: EmissionSource[]
  top_leak: TopLeak
}

/** Accepted upload types for factory operational data. */
export const ACCEPTED_EXTENSIONS = ['.csv', '.txt'] as const

/**
 * Local mock that mirrors the backend response. Kept in one place so it can be
 * deleted wholesale once the real endpoint is wired up.
 */
const MOCK_RESULT: EmissionsResult = {
  total_emissions: 12.4,
  unit: 'tCO2e',
  breakdown: [
    { name: 'Virgin Plastic', emissions: 7.44, percentage: 60 },
    { name: 'Electricity', emissions: 2.73, percentage: 22 },
    { name: 'Diesel', emissions: 2.23, percentage: 18 },
  ],
  top_leak: { name: 'Virgin Plastic', percentage: 60 },
}

/**
 * Analyze a factory data file and return an emissions breakdown.
 *
 * Currently returns local mock data after a short simulated delay. To connect
 * the real backend later, replace the body with:
 *
 *   const body = new FormData()
 *   body.append('file', file)
 *   const res = await fetch('/calculate-emissions', { method: 'POST', body })
 *   if (!res.ok) throw new Error('Analysis failed')
 *   return (await res.json()) as EmissionsResult
 */
export async function calculateEmissions(
  _file: File,
): Promise<EmissionsResult> {
  await new Promise((resolve) => setTimeout(resolve, 1400))
  return MOCK_RESULT
}

/** True when the file extension is one we know how to analyze. */
export function isSupportedFile(file: File): boolean {
  const lower = file.name.toLowerCase()
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

/** Human-readable file size, e.g. "24.1 KB". */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let size = bytes / 1024
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`
}
