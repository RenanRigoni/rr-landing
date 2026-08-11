'use client'

import { useActionState } from 'react'
import { createProcessFeedback, type ProcessFeedbackFormState } from '@/lib/actions/process-feedback'
import { SubmitButton } from '@/components/ui/SubmitButton'

const initialState: ProcessFeedbackFormState = { error: null }

const TYPE_LABELS: Record<string, string> = {
  friction: 'Dificuldade no processo',
  idea: 'Sugestão de melhoria',
  win: 'O que funcionou bem',
  bug: 'Problema no CRM',
}

export function ProcessFeedbackForm({ processSlug, processId }: { processSlug: string; processId: string }) {
  const boundAction = createProcessFeedback.bind(null, processSlug, processId)
  const [state, formAction, pending] = useActionState(boundAction, initialState)

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <select
        name="feedback_type"
        defaultValue="friction"
        className="rounded-inner border border-white/[0.08] bg-surface px-3 py-2 text-sm text-content-primary outline-none focus:border-brand-500"
      >
        {Object.entries(TYPE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <textarea
        name="content"
        placeholder="O que você observou executando esse processo na prática?"
        rows={3}
        required
        className="rounded-inner border border-white/[0.08] bg-surface px-3 py-2 text-sm text-content-primary outline-none focus:border-brand-500"
      />
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <div>
        <SubmitButton pending={pending} label="Registrar feedback" pendingLabel="Salvando…" />
      </div>
    </form>
  )
}
