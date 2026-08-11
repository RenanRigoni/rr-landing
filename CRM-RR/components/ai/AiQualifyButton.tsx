'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { analyzeDealQualification, applyQualificationSuggestion, rejectAiRun, type ErrorCategory } from '@/lib/actions/ai'
import type { QualifyDealOutput } from '@/lib/ai/schemas'
import { AiResultCard } from '@/components/ai/AiResultCard'
import { RejectFeedbackModal } from '@/components/ai/RejectFeedbackModal'

const CRITERION_LABELS: Record<string, string> = {
  fit_icp: 'Fit com ICP',
  need: 'Necessidade',
  authority: 'Acesso ao decisor',
  budget: 'Orçamento',
  timing: 'Timing',
  engagement: 'Engajamento',
}

const CONFIDENCE_LABELS: Record<string, string> = { low: 'baixa', medium: 'média', high: 'alta' }

export function AiQualifyButton({ dealId }: { dealId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [runId, setRunId] = useState<string | null>(null)
  const [output, setOutput] = useState<QualifyDealOutput | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resolved, setResolved] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)

  function handleAnalyze() {
    setError(null)
    startTransition(async () => {
      const result = await analyzeDealQualification(dealId)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setRunId(result.runId)
      setOutput(result.output)
      setResolved(false)
    })
  }

  function handleApply() {
    if (!runId) return
    startTransition(async () => {
      const result = await applyQualificationSuggestion(runId, dealId)
      if (result.error) {
        setError(result.error)
        return
      }
      setResolved(true)
      router.refresh()
    })
  }

  function handleRejectConfirm(category: ErrorCategory, notes: string | null) {
    if (!runId) return
    startTransition(async () => {
      await rejectAiRun(runId, dealId, category, notes)
      setShowRejectModal(false)
      setResolved(true)
    })
  }

  if (output && !resolved) {
    return (
      <>
      <AiResultCard
        actions={
          <>
            <button
              type="button"
              onClick={handleApply}
              disabled={pending}
              className="rounded-pill bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white transition-all ease-spring hover:bg-brand-500 disabled:opacity-60"
            >
              Aplicar sugestões
            </button>
            <button
              type="button"
              onClick={() => setShowRejectModal(true)}
              disabled={pending}
              className="rounded-pill px-4 py-1.5 text-xs font-medium text-content-secondary transition-colors ease-spring hover:text-danger disabled:opacity-60"
            >
              Rejeitar
            </button>
          </>
        }
      >
        <p className="text-sm text-content-primary">{output.overallAssessment}</p>

        <div className="flex flex-col gap-1.5">
          {output.criteria.map((c) => (
            <div key={c.key} className="text-xs">
              <span className="font-medium text-content-primary">{CRITERION_LABELS[c.key] ?? c.key}</span>{' '}
              <span className="font-mono text-content-secondary">
                {c.suggestedScore}/5 (confiança {CONFIDENCE_LABELS[c.confidence]})
              </span>
              <p className="text-content-secondary">{c.reasoning}</p>
            </div>
          ))}
        </div>

        {output.missingInformation.length > 0 ? (
          <div className="text-xs">
            <span className="font-mono uppercase tracking-wide text-warning">Falta descobrir</span>
            <ul className="list-inside list-disc text-content-secondary">
              {output.missingInformation.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {output.risks.length > 0 ? (
          <div className="text-xs">
            <span className="font-mono uppercase tracking-wide text-danger">Riscos</span>
            <ul className="list-inside list-disc text-content-secondary">
              {output.risks.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </AiResultCard>
      <RejectFeedbackModal
        open={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        onConfirm={handleRejectConfirm}
        pending={pending}
      />
      </>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleAnalyze}
        disabled={pending}
        className="w-fit rounded-pill border border-brand-500/40 px-4 py-2 text-xs font-medium text-brand-400 transition-colors ease-spring hover:bg-brand-600/10 disabled:opacity-60"
      >
        {pending ? 'Analisando…' : 'Analisar qualificação com IA'}
      </button>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
      {resolved ? <p className="text-xs text-content-muted">Sugestão revisada.</p> : null}
    </div>
  )
}
