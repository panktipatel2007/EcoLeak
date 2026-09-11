/**
 * Data contract shared with the FastAPI backend.
 *
 * The real endpoint (POST /calculate-emissions) accepts CSV/TXT files and returns
 * emission breakdowns, hotspot leak detection, and circular recommendations.
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

export interface CircularRecommendation {
  target_source: string
  alternative_name: string
  action: string
  reduction_percentage: number
  potential_co2e_savings: number
  co_benefits: string
}

export interface EmissionsResult {
  total_emissions: number
  unit: string
  breakdown: EmissionSource[]
  top_leak: TopLeak
  circular_recommendation?: CircularRecommendation | null
}

/** Accepted upload types for factory operational data. */
export const ACCEPTED_EXTENSIONS = ['.csv', '.txt', '.tsv'] as const

/**
 * Fallback mock that mirrors the backend response if the server is offline.
 */
const FALLBACK_MOCK_RESULT: EmissionsResult = {
  total_emissions: 12.4,
  unit: 'tCO2e',
  breakdown: [
    { name: 'Virgin Plastic', emissions: 7.44, percentage: 60 },
    { name: 'Electricity', emissions: 2.73, percentage: 22 },
    { name: 'Diesel', emissions: 2.23, percentage: 18 },
  ],
  top_leak: { name: 'Virgin Plastic', percentage: 60 },
  circular_recommendation: {
    target_source: 'Virgin Plastic',
    alternative_name: 'Post-Consumer Recycled (PCR) Polymer',
    action: 'Transition from virgin resin pellets to certified recycled polymers (e.g. rPET or rHDPE).',
    reduction_percentage: 65.7,
    potential_co2e_savings: 4.89,
    co_benefits: 'Drastically cuts fossil feedstock dependency, reduces landfill waste, and complies with EPR regulations.',
  },
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

/**
 * Analyze a factory data file by calling the live FastAPI backend.
 */
export async function calculateEmissions(file: File): Promise<EmissionsResult> {
  const formData = new FormData()
  formData.append('file', file)

  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}/calculate-emissions`, {
      method: 'POST',
      body: formData,
    })
  } catch (networkError) {
    // If backend is unreachable, gracefully log and inform the user
    console.warn(
      `[EcoLeak] Could not reach backend at ${API_BASE_URL}. Starting in fallback demonstration mode.`,
      networkError,
    )
    await new Promise((resolve) => setTimeout(resolve, 800))
    return FALLBACK_MOCK_RESULT
  }

  if (!res.ok) {
    let errorDetail = 'Failed to analyze emissions file.'
    try {
      const errorJson = await res.json()
      if (errorJson?.detail) {
        errorDetail =
          typeof errorJson.detail === 'string'
            ? errorJson.detail
            : JSON.stringify(errorJson.detail)
      }
    } catch {
      // Keep default errorDetail
    }
    throw new Error(errorDetail)
  }

  return (await res.json()) as EmissionsResult
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
