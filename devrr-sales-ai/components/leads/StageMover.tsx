'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { moveStage } from '@/lib/actions/leads'
import { cn } from '@/lib/utils/cn'
import { LostReasonDialog } from '@/components/leads/LostReasonDialog'

interface StageOption {
  id: string
  label: string
}

interface StageMoverProps {
  leadId: string
  leadTitle: string
  currentStageId: string
  stages: StageOption[]
  /** Estágio `is_lost` da organização, se houver — decide quando abrir o diálogo de motivo (D-044). */
  lostStageId: string | null
  lostReasonSuggestions: string[]
}

// Único componente cliente da 3.5 — precisa de estado local (pending/erro)
// pra chamar a Server Action moveStage() direto (não é <form>, são
// argumentos posicionais). Nenhuma regra de negócio mora aqui: o componente
// só chama moveStage(leadId, stageId, lostReason) e mostra o que ela devolve —
// validação de payload, pertencimento à organização e a própria mudança de
// estágio vivem em lib/actions/leads-core.ts (D-020).
export function StageMover({ leadId, leadTitle, currentStageId, stages, lostStageId, lostReasonSuggestions }: StageMoverProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [pendingStageId, setPendingStageId] = useState<string | null>(null)

  function move(stageId: string, lostReason?: string) {
    setError(null)
    startTransition(async () => {
      const result = await moveStage(leadId, stageId, lostReason ?? null)
      if (result.error) {
        setError(result.error)
        return
      }
      setPendingStageId(null)
      router.refresh()
    })
  }

  function handleMove(stageId: string) {
    if (stageId === currentStageId) {
      return
    }

    if (stageId === lostStageId) {
      setError(null)
      setPendingStageId(stageId)
      return
    }

    move(stageId)
  }

  return (
    <div>
      <p className="mb-2 text-[10px] uppercase tracking-[0.12em] text-content-muted">Mover para</p>
      <div className="flex flex-wrap gap-1.5">
        {stages.map((stage) => {
          const isCurrent = stage.id === currentStageId
          return (
            <button
              key={stage.id}
              type="button"
              disabled={isPending || isCurrent}
              onClick={() => handleMove(stage.id)}
              className={cn(
                'rounded-pill px-2.5 py-1 text-xs font-medium transition-colors ease-spring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed',
                isCurrent
                  ? 'bg-brand-600/15 text-brand-400'
                  : 'bg-white/[0.04] text-content-secondary hover:bg-white/[0.08] hover:text-content-primary disabled:opacity-60',
              )}
            >
              {stage.label}
            </button>
          )
        })}
      </div>
      {error && pendingStageId === null ? <p className="mt-2 text-xs text-danger">{error}</p> : null}

      {lostStageId ? (
        <LostReasonDialog
          open={pendingStageId !== null}
          leadTitle={leadTitle}
          suggestions={lostReasonSuggestions}
          pending={isPending}
          error={error}
          onConfirm={(reason) => move(lostStageId, reason)}
          onCancel={() => setPendingStageId(null)}
        />
      ) : null}
    </div>
  )
}
