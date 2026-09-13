'use client'

import { useState } from 'react'
import type { EmissionsResult } from '@/lib/emissions'
import Markdown from 'react-markdown'
import { Sparkles, Send, Loader2, Bot, HelpCircle, CheckCircle2, ShieldAlert } from 'lucide-react'

interface AiAssistantProps {
  result: EmissionsResult
  unit: string
}

const QUICK_QUESTIONS = [
  'Why are my emissions high?',
  'What should I reduce first?',
  'Explain my biggest hotspot.',
  'Which circular recommendation is best?',
  'How can I reach my reduction target?',
  'Why was this source classified as high severity?',
]

const MAX_QUESTION_LENGTH = 1000

export function AiAssistant({ result, unit }: AiAssistantProps) {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [answer, setAnswer] = useState<string | null>(null)
  const [sourceType, setSourceType] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // The question actually answered, and the verified EcoLeak figures the
  // answer was grounded in. Both are required on screen so the user can see
  // what was asked and check the prose against calculated values.
  const [askedQuestion, setAskedQuestion] = useState<string | null>(null)
  const [basedOn, setBasedOn] = useState<any | null>(null)
  const [unverifiedNumbers, setUnverifiedNumbers] = useState<string[]>([])

  async function handleAsk(queryToAsk?: string) {
    const activeQuestion = (queryToAsk ?? question).trim()

    // Empty question: tell the user, rather than silently doing nothing.
    if (!activeQuestion) {
      setError('Please type a question first, or pick one of the suggestions.')
      setAnswer(null)
      setAskedQuestion(null)
      return
    }

    setLoading(true)
    setError(null)
    setAnswer(null)
    setNotice(null)
    setBasedOn(null)
    setUnverifiedNumbers([])
    setAskedQuestion(activeQuestion)

    try {
      const response = await fetch('/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Long questions are truncated rather than rejected.
          question: activeQuestion.slice(0, MAX_QUESTION_LENGTH),
          analysis: result,
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        setError(
          data?.error ||
            'The assistant could not answer right now. Your emission results above are unaffected.',
        )
        return
      }
      if (!data) {
        setError('The assistant returned a response that could not be read.')
        return
      }

      setAnswer(typeof data.answer === 'string' ? data.answer : '')
      setSourceType(data.source)
      setBasedOn(data.based_on ?? null)
      setUnverifiedNumbers(
        Array.isArray(data.unverified_numbers) ? data.unverified_numbers : [],
      )
      if (data.notice) {
        setNotice(data.notice)
      }
    } catch {
      setError(
        'Could not reach the assistant. Your emission results above are unaffected and remain accurate.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      id="ai-insights-assistant"
      className="rounded-xl border border-primary/20 bg-surface/80 p-5 shadow-xs transition-all space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="size-4" />
          </span>
          <div>
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
              Gemini AI Decarbonization Advisor
              <span className="rounded-full bg-primary/10 px-2 py-0.2 font-mono text-[10px] font-semibold text-primary">
                Grounded
              </span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Interpreting deterministic audit calculations without altering emission values.
            </p>
          </div>
        </div>

        <span className="text-[11px] font-mono text-muted-foreground hidden sm:inline-block">
          Grounded on {result.total_emissions} {unit}
        </span>
      </div>

      {/* Suggested Quick Questions */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
          <HelpCircle className="size-3" /> Quick Questions
        </p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              id={`quick-q-${q.slice(0, 10).toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => {
                setQuestion(q)
                handleAsk(q)
              }}
              disabled={loading}
              className="rounded-lg border border-border bg-background/80 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors disabled:opacity-50 text-left"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Question Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleAsk()
        }}
        className="flex items-center gap-2"
      >
        <input
          type="text"
          id="ai-question-input"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about your carbon hotspots, severity, or reduction plan..."
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          disabled={loading}
        />
        <button
          type="submit"
          id="btn-ask-gemini"
          disabled={loading || !question.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Send className="size-3.5" />
              <span>Ask AI</span>
            </>
          )}
        </button>
      </form>

      {/* The question that was actually answered */}
      {askedQuestion && !loading && (
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            You asked
          </p>
          <p className="mt-0.5 text-xs text-foreground">{askedQuestion}</p>
        </div>
      )}

      {/* Unverified numbers: the AI cited a figure EcoLeak did not calculate */}
      {unverifiedNumbers.length > 0 && (
        <div
          role="alert"
          className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2"
        >
          <ShieldAlert className="size-4 shrink-0 mt-0.5" />
          <span>
            The answer mentions {unverifiedNumbers.join(', ')}, which EcoLeak did not calculate.
            Use the verified values below instead.
          </span>
        </div>
      )}

      {/* Notice Banner if any */}
      {notice && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2">
          <ShieldAlert className="size-4 shrink-0 mt-0.5" />
          <span>{notice}</span>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Answer Output */}
      {answer && (
        <div
          id="ai-answer-container"
          className="rounded-lg border border-border bg-muted/40 p-4 space-y-2 text-xs leading-relaxed"
        >
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <Bot className="size-3.5 text-primary" />
              Decarbonization Recommendation
            </span>
            <span className="font-mono text-[10px] text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="size-3 text-emerald-500" />
              {sourceType === 'gemini' ? 'Gemini AI (Grounded)' : 'Deterministic EcoLeak Rules'}
            </span>
          </div>
          <div className="markdown-body text-foreground/90 font-sans space-y-2 prose prose-xs max-w-none">
            {answer && answer.trim() ? (
              <Markdown>{answer}</Markdown>
            ) : (
              'No answer was returned. The verified EcoLeak figures below are still accurate.'
            )}
          </div>

          {/* Verified EcoLeak metrics the answer was grounded in.
              These come from the deterministic engine, never from the AI. */}
          {basedOn && (
            <div className="rounded-md border border-border/60 bg-background/60 p-3 space-y-1.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                EcoLeak verified figures · calculated, not AI-generated
              </p>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-muted-foreground">Total emissions</span>
                <span className="font-medium tabular-nums text-foreground">
                  {basedOn.total_emissions} {unit}
                </span>
              </div>
              {(basedOn.top_sources ?? []).map((source: any) => (
                <div
                  key={source.name}
                  className="flex items-baseline justify-between gap-3"
                >
                  <span className="text-muted-foreground">{source.name}</span>
                  <span className="font-medium tabular-nums text-foreground">
                    {source.emissions} {unit} ({source.percentage}%
                    {source.severity ? `, ${source.severity}` : ''})
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
