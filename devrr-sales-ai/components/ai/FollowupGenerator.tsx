'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { generateFollowupMessage, applyFollowupMessage, discardAiRun } from '@/lib/actions/ai-followup'
import { cn } from '@/lib/utils/cn'

interface FollowupGeneratorProps {
  leadId: string
  /** Atividade (follow-up pendente) onde "Usar esta" grava `body` + `ai_run_id`. */
  activityId: string
  /** Layout do painel de revisão: `dropdown` flutua sobre a linha (tela de hoje); `inline` empilha (tela do lead). */
  variant?: 'dropdown' | 'inline'
}

interface DraftState {
  runId: string
  message: string
  tone: string
  reasoning: string
}

const TONE_LABEL: Record<string, string> = {
  direto: 'Direto',
  consultivo: 'Consultivo',
  leve: 'Leve',
}

/**
 * docs/IMPLEMENTATION_PLAN.md → 5.4: "Gerar mensagem com IA" + painel de
 * revisão (textarea editável, `reasoning` ao lado, botões Copiar / Gerar
 * outra versão / Usar esta / Descartar). **Nada é enviado automaticamente.**
 *
 * Componente cliente autossuficiente: fala só com `lib/actions/ai-followup.ts`
 * (D-020 — nunca com o Supabase direto). Toda validação de tenant, contexto,
 * gateway e schema vive no `-core`; aqui só há estado de UI. O texto editado
 * na textarea vai para a action e é revalidado lá (`messageSchema`) — o
 * servidor não confia no que vem do browser.
 */
export function FollowupGenerator({ leadId, activityId, variant = 'dropdown' }: FollowupGeneratorProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [draft, setDraft] = useState<DraftState | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  function generate(): void {
    setError(null)
    setCopied(false)
    startTransition(async () => {
      const result = await generateFollowupMessage(leadId)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setDraft({ runId: result.runId, message: result.message, tone: result.tone, reasoning: result.reasoning })
      setMessage(result.message)
    })
  }

  function handleCopy(): void {
    setError(null)
    if (!navigator.clipboard) {
      setError('Não foi possível acessar a área de transferência.')
      return
    }
    navigator.clipboard.writeText(message).then(
      () => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 2000)
      },
      () => setError('Não foi possível copiar a mensagem.'),
    )
  }

  function handleUse(): void {
    if (!draft) {
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await applyFollowupMessage({ runId: draft.runId, activityId, leadId, message })
      if (result.error) {
        setError(result.error)
        return
      }
      setDraft(null)
      setMessage('')
      router.refresh()
    })
  }

  function handleDiscard(): void {
    setError(null)
    const runId = draft?.runId
    setDraft(null)
    setMessage('')
    setCopied(false)
    if (!runId) {
      return
    }
    startTransition(async () => {
      const result = await discardAiRun(runId)
      if (result.error) {
        setError(result.error)
      }
    })
  }

  const panelClass =
    variant === 'dropdown'
      ? 'absolute right-0 z-20 mt-2 w-[22rem] text-left'
      : 'mt-3 w-full max-w-xl'

  return (
    <div className={variant === 'dropdown' ? 'relative inline-block' : undefined}>
      {draft ? null : (
        <button
          type="button"
          disabled={isPending}
          onClick={generate}
          className="rounded-md bg-brand-600/15 px-2.5 py-1.5 text-xs font-medium text-brand-400 transition-colors ease-spring hover:bg-brand-600/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? 'Gerando…' : 'Gerar IA'}
        </button>
      )}

      {error && !draft ? <p className="mt-1 text-xs text-danger">{error}</p> : null}

      {draft ? (
        <div className={cn('rounded-lg border border-brand-400/30 bg-surface-card p-4', panelClass)}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-content-primary">Mensagem gerada</p>
            <span className="rounded-pill bg-white/[0.06] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-content-muted">
              {TONE_LABEL[draft.tone] ?? draft.tone}
            </span>
          </div>

          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={4}
            className="mt-2 w-full rounded-md border border-white/[0.08] bg-surface-elevated px-3 py-2 text-sm text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          />

          <p className="mt-2 text-[11px] leading-relaxed text-content-secondary">
            <span className="font-medium text-content-muted">Por quê: </span>
            {draft.reasoning}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-md bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-content-secondary transition-colors ease-spring hover:bg-white/[0.08] hover:text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={generate}
              className="rounded-md bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-content-secondary transition-colors ease-spring hover:bg-white/[0.08] hover:text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? 'Gerando…' : 'Gerar outra versão'}
            </button>
            <button
              type="button"
              disabled={isPending || message.trim() === ''}
              onClick={handleUse}
              className="rounded-md bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors ease-spring hover:bg-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60"
            >
              Usar esta
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={handleDiscard}
              className="rounded-md px-2.5 py-1.5 text-xs font-medium text-content-secondary transition-colors ease-spring hover:text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60"
            >
              Descartar
            </button>
          </div>

          {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}
        </div>
      ) : null}
    </div>
  )
}
