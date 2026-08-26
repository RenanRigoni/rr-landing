'use client'

import { useState } from 'react'

interface FollowupPromptProps {
  leadTitle: string
  suggestedDueAt: string | null
  isPending: boolean
  error: string | null
  onConfirm: (dueAt: string) => void
  onDismiss: () => void
}

/** "YYYY-MM-DDTHH:mm" no fuso local do navegador — formato que `<input type="datetime-local">` exige. */
function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/**
 * docs/IMPLEMENTATION_PLAN.md → 4.5: "Concluir... pergunta se quer agendar
 * a próxima (sugerindo a data do próximo passo da regra)". Só aparece
 * quando `completeActivity` (4.3) devolve `nextActionAt: null` — se já
 * sobrou alguma pendência (ex.: o passo seguinte da regra já foi gerado
 * pelo `moveStageCore` na entrada do estágio), a pergunta nem precisa
 * existir. `suggestedDueAt` vem de `computeFollowupSchedule` reaproveitada
 * no servidor (`lib/actions/activities-core.ts`) — este componente só
 * formata pra exibir, não recalcula nada.
 */
export function FollowupPrompt({ leadTitle, suggestedDueAt, isPending, error, onConfirm, onDismiss }: FollowupPromptProps) {
  const [dueAt, setDueAt] = useState(suggestedDueAt ? toDatetimeLocalValue(suggestedDueAt) : '')

  return (
    <div className="rounded-lg border border-brand-400/30 bg-surface-card px-4 py-3">
      <p className="text-sm text-content-primary">
        Follow-up concluído para <span className="font-medium">{leadTitle}</span>. Agendar a próxima ação?
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input
          type="datetime-local"
          value={dueAt}
          onChange={(event) => setDueAt(event.target.value)}
          className="rounded-md border border-white/[0.08] bg-surface-elevated px-2.5 py-1.5 font-mono text-xs text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        />
        <button
          type="button"
          disabled={isPending || dueAt === ''}
          onClick={() => onConfirm(new Date(dueAt).toISOString())}
          className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors ease-spring hover:bg-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60"
        >
          Agendar
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={onDismiss}
          className="rounded-md px-3 py-1.5 text-xs font-medium text-content-secondary transition-colors ease-spring hover:text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60"
        >
          Agora não
        </button>
      </div>
      {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}
    </div>
  )
}
