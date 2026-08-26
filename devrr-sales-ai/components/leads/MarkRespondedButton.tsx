'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { markResponded } from '@/lib/actions/leads'

interface MarkRespondedButtonProps {
  leadId: string
  alreadyResponded: boolean
}

// Mesmo padrão de components/leads/StageMover.tsx: nenhuma regra de negócio
// aqui — markResponded() (4.3) já cancela os automáticos pendentes, grava
// o histórico e recalcula o cache; este botão só chama e mostra o erro.
export function MarkRespondedButton({ leadId, alreadyResponded }: MarkRespondedButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClick(): void {
    setError(null)
    startTransition(async () => {
      const result = await markResponded(leadId)
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div>
      <button
        type="button"
        disabled={isPending || alreadyResponded}
        onClick={handleClick}
        className="rounded-lg bg-success/15 px-4 py-2 text-sm font-semibold text-success transition-colors ease-spring hover:bg-success/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60"
      >
        {alreadyResponded ? 'Cliente já respondeu' : 'Cliente respondeu'}
      </button>
      {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}
    </div>
  )
}
