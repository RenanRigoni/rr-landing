'use client'

import { useState, useTransition } from 'react'
import { summarizeDeal, acknowledgeAiRun, rejectAiRun } from '@/lib/actions/ai'
import type { SummarizeDealOutput } from '@/lib/ai/schemas'
import { AiResultCard } from '@/components/ai/AiResultCard'

export function AiSummarizeButton({ dealId }: { dealId: string }) {
  const [pending, startTransition] = useTransition()
  const [runId, setRunId] = useState<string | null>(null)
  const [output, setOutput] = useState<SummarizeDealOutput | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resolved, setResolved] = useState(false)

  function handleRun() {
    setError(null)
    startTransition(async () => {
      const result = await summarizeDeal(dealId)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setRunId(result.runId)
      setOutput(result.output)
      setResolved(false)
    })
  }

  function handleAccept() {
    if (!runId) return
    startTransition(async () => {
      await acknowledgeAiRun(runId, dealId)
      setResolved(true)
    })
  }

  function handleReject() {
    if (!runId) return
    startTransition(async () => {
      await rejectAiRun(runId, dealId)
      setResolved(true)
    })
  }

  if (output && !resolved) {
    return (
      <AiResultCard
        actions={
          <>
            <button
              type="button"
              onClick={handleAccept}
              disabled={pending}
              className="rounded-pill bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white transition-all ease-spring hover:bg-brand-500 disabled:opacity-60"
            >
              Útil
            </button>
            <button
              type="button"
              onClick={handleReject}
              disabled={pending}
              className="rounded-pill px-4 py-1.5 text-xs font-medium text-content-secondary transition-colors ease-spring hover:text-danger disabled:opacity-60"
            >
              Não útil
            </button>
          </>
        }
      >
        <p className="text-sm text-content-primary">{output.summary}</p>
        <ul className="list-inside list-disc text-xs text-content-secondary">
          {output.keyPoints.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
        <p className="text-xs text-brand-400">Próximo passo sugerido: {output.suggestedNextStep}</p>
      </AiResultCard>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleRun}
        disabled={pending}
        className="w-fit rounded-pill border border-brand-500/40 px-4 py-2 text-xs font-medium text-brand-400 transition-colors ease-spring hover:bg-brand-600/10 disabled:opacity-60"
      >
        {pending ? 'Resumindo…' : 'Resumir com IA'}
      </button>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
      {resolved ? <p className="text-xs text-content-muted">Feedback registrado.</p> : null}
    </div>
  )
}
