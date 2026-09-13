/**
 * EcoLeak Gemini AI Service (TypeScript / Next.js Server Runtime)
 * 
 * Safety & Grounding Principles:
 * 1. Uses official @google/genai SDK.
 * 2. Reads GEMINI_API_KEY from process.env.GEMINI_API_KEY server-side.
 * 3. Gemini MUST NOT calculate emissions or alter numbers.
 * 4. Grounded in deterministic calculations from EcoLeak's calculation engine.
 * 5. Full timeout, error handling, and graceful deterministic fallback if key is missing or fails.
 */

import { GoogleGenAI } from '@google/genai'
import type { EmissionsResult } from '@/lib/emissions'

export interface InsightsResponse {
  answer: string
  based_on: {
    total_emissions: number
    top_sources: Array<{
      name: string
      emissions: number
      percentage: number
      severity?: string
    }>
    recommendations: string[]
  }
  source: 'gemini' | 'deterministic_fallback'
  status?: string
  numbers_verified?: boolean
  unverified_numbers?: string[]
  question_truncated?: boolean
  notice?: string
}

export class EmptyQuestionError extends Error {}

function getApiKey(): string | undefined {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY
  )?.trim()
}

const CANDIDATE_MODELS = [
  process.env.GEMINI_MODEL?.trim() || 'gemini-3.8-flash',
  'gemini-flash-latest',
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
].filter(Boolean) as string[]

const TIMEOUT_MS = 18000
const MAX_QUESTION_LENGTH = 1000

const NUMBER_RE = /-?\d[\d,]*(?:\.\d+)?/g

function collectNumbers(node: any, out: Set<number>): void {
  if (node === null || node === undefined) return
  if (typeof node === 'boolean') return
  if (typeof node === 'number') {
    out.add(node)
    return
  }
  if (typeof node === 'string') {
    for (const token of node.match(NUMBER_RE) ?? []) {
      const value = Number(token.replace(/,/g, ''))
      if (!Number.isNaN(value)) out.add(value)
    }
    return
  }
  if (Array.isArray(node)) {
    for (const item of node) collectNumbers(item, out)
    return
  }
  if (typeof node === 'object') {
    for (const value of Object.values(node)) collectNumbers(value, out)
  }
}

/**
 * Checks every number in Gemini's prose against EcoLeak's own calculations.
 *
 * The system instruction tells the model not to invent figures, but an
 * instruction is not an enforcement mechanism. Anything unmatched is reported
 * so the UI can warn the user rather than presenting it as authoritative.
 * Small whole numbers (0-10) are counting language, not emission data.
 */
export function verifyAnswerNumbers(
  answer: string,
  analysis: Partial<EmissionsResult>,
): { verified: boolean; unverified: string[] } {
  const allowed = new Set<number>()
  collectNumbers(analysis, allowed)
  for (const value of Array.from(allowed)) {
    allowed.add(Math.round(value * 100) / 100)
    allowed.add(Math.round(value * 10) / 10)
    allowed.add(Math.round(value))
  }

  const unverified: string[] = []
  for (const token of answer.match(NUMBER_RE) ?? []) {
    const value = Number(token.replace(/,/g, ''))
    if (Number.isNaN(value)) continue
    if (Number.isInteger(value) && value >= 0 && value <= 10) continue
    let matched = false
    for (const candidate of allowed) {
      if (Math.abs(value - candidate) < 0.05) {
        matched = true
        break
      }
    }
    if (!matched) unverified.push(token)
  }

  return { verified: unverified.length === 0, unverified }
}

/**
 * Builds deterministic fallback response if Gemini is unavailable or errors out.
 */
export function generateDeterministicFallback(
  question: string,
  analysis: Partial<EmissionsResult>,
): string {
  const total = analysis.total_emissions ?? 0
  const unit = analysis.unit ?? 'tCO2e'
  const topLeak = analysis.top_leak
  const leakName = topLeak?.name ?? 'Identified Emission Source'
  const leakPct = topLeak?.percentage ?? 0
  const severity = topLeak?.severity ?? 'MEDIUM'
  const rec = topLeak?.recommendation ?? 'Review high-emission input materials and transition to low-carbon alternatives.'
  const alt = topLeak?.alternativeAction ?? 'Engage key suppliers on renewable power sourcing and circular feedstock.'
  const pareto = analysis.pareto
  const sourcesTo80 = pareto?.sources_to_80_percent ?? 1

  const q = question.toLowerCase()

  if (q.includes('hotspot') || q.includes('biggest') || q.includes('why') || q.includes('high')) {
    return `Based on verified EcoLeak audit data for your total ${total} ${unit}, your biggest emission hotspot is **${leakName}**, responsible for **${leakPct}%** of all emissions (classified as **${severity}** severity).\n\n**Immediate Priority:** ${rec}\n**Alternative:** ${alt}`
  }

  if (q.includes('reduce') || q.includes('prioritize') || q.includes('first') || q.includes('target')) {
    return `You should address **${leakName}** first because it makes up **${leakPct}%** of your total footprint. Under the Pareto principle, focusing on your top ${sourcesTo80} source(s) will resolve up to ${pareto?.pareto_percentage ?? 80}% of your total emissions.\n\n**Key Action:** ${rec}`
  }

  return `EcoLeak Deterministic Analysis: Total facility emissions are **${total} ${unit}**. The highest impact driver is **${leakName}** (${leakPct}% of total, ${severity} severity).\n\n**Recommended Step:** ${rec}\n**Secondary Action:** ${alt}`
}

/**
 * Server-side generation of Gemini insights strictly grounded in EcoLeak data.
 */
export async function getGeminiInsights(
  question: string,
  analysis: Partial<EmissionsResult>,
): Promise<InsightsResponse> {
  // Empty question is REJECTED, not silently replaced. Answering a question
  // the user did not ask is worse than returning a clear error.
  const trimmed = (question || '').trim()
  if (!trimmed) {
    throw new EmptyQuestionError('A non-empty question is required.')
  }
  // Long questions are truncated rather than rejected.
  const questionTruncated = trimmed.length > MAX_QUESTION_LENGTH
  const cleanQuestion = questionTruncated ? trimmed.slice(0, MAX_QUESTION_LENGTH) : trimmed

  const breakdown = analysis.breakdown ?? []
  const topSources = breakdown.slice(0, 3).map((item) => ({
    name: item.name,
    emissions: item.emissions,
    percentage: item.percentage,
    severity: item.severity,
  }))

  const recommendations: string[] = []
  if (analysis.top_leak?.recommendation) recommendations.push(analysis.top_leak.recommendation)
  if (analysis.top_leak?.alternativeAction) recommendations.push(analysis.top_leak.alternativeAction)

  const basedOn = {
    total_emissions: analysis.total_emissions ?? 0,
    top_sources: topSources,
    recommendations,
  }

  const apiKey = getApiKey()

  if (!apiKey || apiKey.trim().length === 0) {
    return {
      answer: generateDeterministicFallback(cleanQuestion, analysis),
      based_on: basedOn,
      source: 'deterministic_fallback',
      status: 'missing_api_key',
      numbers_verified: true,
      unverified_numbers: [],
      notice:
        'The AI assistant is operating in verified deterministic EcoLeak calculation mode. Displaying verified audit figures.',
    }
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: apiKey.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })

    const topSourcesText = breakdown.slice(0, 5).map(
      (s) => `- ${s.name}: ${s.emissions} ${analysis.unit ?? 'tCO2e'} (${s.percentage}%, Severity: ${s.severity ?? 'N/A'}, Scope: ${s.scope ?? 'N/A'})`
    ).join('\n')

    const promptContext = `
[ECOLEAK VERIFIED AUDIT DATA]
Total Recorded Emissions: ${analysis.total_emissions ?? 0} ${analysis.unit ?? 'tCO2e'}
Top Emission Hotspot: ${analysis.top_leak?.name ?? 'None'} (${analysis.top_leak?.percentage ?? 0}%, Severity: ${analysis.top_leak?.severity ?? 'N/A'})
Hotspot Explanation: ${analysis.top_leak?.explanation ?? 'N/A'}
Deterministic Recommendation: ${analysis.top_leak?.recommendation ?? 'N/A'}
Alternative Action: ${analysis.top_leak?.alternativeAction ?? 'N/A'}
Pareto Analysis: ${analysis.pareto?.sources_to_80_percent ?? 'N/A'} sources account for ${analysis.pareto?.pareto_percentage ?? 0}% of emissions.
Top Sources:
${topSourcesText || 'No sources listed.'}

[USER QUESTION]
${cleanQuestion}

Strict Rule: Base your answer strictly on the numbers and context above. Do not alter or recalculate values. Keep answer under 150 words.
`

    let textOutput: string | undefined
    let usedModel = ''

    for (const model of CANDIDATE_MODELS) {
      try {
        const geminiPromise = ai.models.generateContent({
          model,
          contents: promptContext,
          config: {
            systemInstruction:
              "You are the EcoLeak Industrial Decarbonization Assistant. Provide concise, expert interpretation of the user's factory emissions audit. Strictly adhere to the numbers provided by EcoLeak. Do NOT invent new numbers or recalculate. Keep answers structured, practical, and under 150 words.",
            temperature: 0.2,
          },
        })

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Gemini API call timed out')), TIMEOUT_MS)
        )

        const response = await Promise.race([geminiPromise, timeoutPromise])
        const candidate = response.text?.trim()
        if (candidate) {
          textOutput = candidate
          usedModel = model
          break
        }
      } catch (modelErr: any) {
        console.warn(`[EcoLeak AI] Model ${model} unavailable, trying next candidate:`, modelErr?.message || modelErr)
      }
    }

    if (textOutput) {
      const { verified, unverified } = verifyAnswerNumbers(textOutput, analysis)
      return {
        answer: textOutput,
        based_on: basedOn,
        source: 'gemini',
        status: 'ok',
        numbers_verified: verified,
        unverified_numbers: unverified,
        question_truncated: questionTruncated || undefined,
        notice: verified
          ? undefined
          : `The assistant referenced figures that EcoLeak did not calculate (${unverified.join(
              ', ',
            )}). Trust the verified values, not the prose.`,
      }
    }

    return {
      answer: generateDeterministicFallback(cleanQuestion, analysis),
      based_on: basedOn,
      source: 'deterministic_fallback',
      status: 'empty_answer',
      numbers_verified: true,
      unverified_numbers: [],
      notice:
        'The AI assistant returned an empty answer. Showing verified deterministic EcoLeak analysis instead.',
    }
  } catch (err: any) {
    // Logged server-side only. SECURITY: err.message is NOT returned to the
    // client - SDK and fetch errors can embed the request URL and headers,
    // which would expose the API key.
    console.error('Gemini Insights error:', err?.message || err)
    const timedOut = err?.message === 'Gemini API call timed out'
    return {
      answer: generateDeterministicFallback(cleanQuestion, analysis),
      based_on: basedOn,
      source: 'deterministic_fallback',
      status: timedOut ? 'timeout' : 'unavailable',
      numbers_verified: true,
      unverified_numbers: [],
      notice: timedOut
        ? 'The AI assistant did not respond in time. Showing deterministic EcoLeak analysis.'
        : 'The AI assistant is temporarily unavailable. Showing deterministic EcoLeak analysis.',
    }
  }
}
