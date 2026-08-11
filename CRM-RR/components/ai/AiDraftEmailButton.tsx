'use client'

import { useState, useTransition } from 'react'
import { draftFollowupEmail, acknowledgeAiRun, rejectAiRun } from '@/lib/actions/ai'
import type { ErrorCategory } from '@/lib/ai/error-categories'
import type { DraftFollowupEmailOutput } from '@/lib/ai/schemas'
import { AiResultCard } from '@/components/ai/AiResultCard'
import { RejectFeedbackModal } from '@/components/ai/RejectFeedbackModal'

export function AiDraftEmailButton({ dealId }: { dealId: string }) {
  const [pending, startTransition] = useTransition()
  const [runId, setRunId] = useState<string | null>(null)
  const [output, setOutput] = useState<DraftFollowupEmailOutput | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resolved, setResolved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)

  function handleRun() {
    setError(null)
    startTransition(async () => {
      const result = await draftFollowupEmail(dealId)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setRunId(result.runId)
      setOutput(result.output)
      setResolved(false)
      setCopied(false)
    })
  }

  function handleAccept() {
    if (!runId) return
    startTransition(async () => {
      await acknowledgeAiRun(runId, dealId)
      setResolved(true)
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

  async function handleCopy() {
    if (!output) return
    await navigator.clipboard.writeText(`Assunto: ${output.subject}\n\n${output.body}`)
    setCopied(true)
  }

  if (output && !resolved) {
    return (
      <>
        <AiResultCard
          actions={
            <>
              <button
                type="button"
                onClick={handleCopy}
                className="rounded-pill bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white transition-all ease-spring hover:bg-brand-500"
              >
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
              <button
                type="button"
                onClick={handleAccept}
                disabled={pending}
                className="rounded-pill border border-white/[0.08] px-4 py-1.5 text-xs font-medium text-content-secondary transition-colors ease-spring hover:text-content-primary disabled:opacity-60"
              >
                Útil
              </button>
              <button
                type="button"
                onClick={() => setShowRejectModal(true)}
                disabled={pending}
                className="rounded-pill px-4 py-1.5 text-xs font-medium text-content-secondary transition-colors ease-spring hover:text-danger disabled:opacity-60"
              >
                Não útil
              </button>
            </>
          }
        >
          <p className="text-xs font-medium text-content-primary">Assunto: {output.subject}</p>
          <p className="whitespace-pre-wrap text-sm text-content-secondary">{output.body}</p>
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
        onClick={handleRun}
        disabled={pending}
        className="w-fit rounded-pill border border-brand-500/40 px-4 py-2 text-xs font-medium text-brand-400 transition-colors ease-spring hover:bg-brand-600/10 disabled:opacity-60"
      >
        {pending ? 'Escrevendo…' : 'Rascunhar e-mail de follow-up com IA'}
      </button>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
      {resolved ? <p className="text-xs text-content-muted">Feedback registrado.</p> : null}
    </div>
  )
}
