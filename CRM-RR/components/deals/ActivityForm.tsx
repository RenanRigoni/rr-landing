'use client'

import { useActionState, useRef, useEffect } from 'react'
import { createActivity, type ActivityFormState } from '@/lib/actions/activities'
import { SubmitButton } from '@/components/ui/SubmitButton'

const initialState: ActivityFormState = { error: null }

const TYPE_LABELS: Record<string, string> = {
  call: 'Ligação',
  email: 'E-mail',
  whatsapp: 'WhatsApp',
  meeting: 'Reunião',
  note: 'Nota',
  task: 'Tarefa',
  linkedin: 'LinkedIn',
}

export function ActivityForm({ dealId }: { dealId: string }) {
  const [state, formAction, pending] = useActionState(createActivity, initialState)
  const formRef = useRef<HTMLFormElement>(null)
  const wasPending = useRef(false)

  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      formRef.current?.reset()
    }
    wasPending.current = pending
  }, [pending, state.error])

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3 rounded-inner border border-white/[0.08] bg-surface-elevated p-4">
      <input type="hidden" name="deal_id" value={dealId} />

      <div className="grid grid-cols-2 gap-3">
        <select
          name="type"
          defaultValue="task"
          className="rounded-inner border border-white/[0.08] bg-surface px-3 py-2 text-sm text-content-primary outline-none focus:border-brand-500"
        >
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input
          type="datetime-local"
          name="due_at"
          className="rounded-inner border border-white/[0.08] bg-surface px-3 py-2 text-sm text-content-primary outline-none focus:border-brand-500"
        />
      </div>

      <input
        name="subject"
        placeholder="Assunto (ex: Ligar para confirmar proposta)"
        required
        className="rounded-inner border border-white/[0.08] bg-surface px-3 py-2 text-sm text-content-primary outline-none focus:border-brand-500"
      />

      <textarea
        name="notes"
        placeholder="Notas (opcional)"
        rows={2}
        className="rounded-inner border border-white/[0.08] bg-surface px-3 py-2 text-sm text-content-primary outline-none focus:border-brand-500"
      />

      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}

      <div>
        <SubmitButton pending={pending} label="Adicionar atividade" pendingLabel="Adicionando…" />
      </div>
    </form>
  )
}
