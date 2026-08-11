'use client'

import { useActionState } from 'react'
import { FormField } from '@/components/ui/FormField'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { createDeal, type DealFormState } from '@/lib/actions/deals'

interface DealFormProps {
  pipelineId: string
  stages: { id: string; name: string }[]
  companies: { id: string; company_name: string }[]
  contacts: { id: string; full_name: string }[]
  leadSources: { id: string; name: string }[]
}

const initialState: DealFormState = { error: null }

export function DealForm({ pipelineId, stages, companies, contacts, leadSources }: DealFormProps) {
  const [state, formAction, pending] = useActionState(createDeal, initialState)

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      <input type="hidden" name="pipeline_id" value={pipelineId} />

      <FormField label="Título da oportunidade" name="title" required />

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="company_id" className="text-xs font-medium text-content-secondary">
            Empresa
          </label>
          <select
            id="company_id"
            name="company_id"
            className="rounded-inner border border-white/[0.08] bg-surface px-3 py-2 text-sm text-content-primary outline-none transition-colors ease-spring focus:border-brand-500"
          >
            <option value="">—</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company_name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="primary_contact_id" className="text-xs font-medium text-content-secondary">
            Contato principal
          </label>
          <select
            id="primary_contact_id"
            name="primary_contact_id"
            className="rounded-inner border border-white/[0.08] bg-surface px-3 py-2 text-sm text-content-primary outline-none transition-colors ease-spring focus:border-brand-500"
          >
            <option value="">—</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <FormField label="Valor estimado (R$)" name="value_reais" type="number" />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="stage_id" className="text-xs font-medium text-content-secondary">
            Estágio inicial
          </label>
          <select
            id="stage_id"
            name="stage_id"
            defaultValue={stages[0]?.id}
            className="rounded-inner border border-white/[0.08] bg-surface px-3 py-2 text-sm text-content-primary outline-none transition-colors ease-spring focus:border-brand-500"
          >
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="source_id" className="text-xs font-medium text-content-secondary">
            Fonte de aquisição
          </label>
          <select
            id="source_id"
            name="source_id"
            className="rounded-inner border border-white/[0.08] bg-surface px-3 py-2 text-sm text-content-primary outline-none transition-colors ease-spring focus:border-brand-500"
          >
            <option value="">—</option>
            {leadSources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <FormField label="Previsão de fechamento" name="expected_close_date" type="date" />

      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}

      <div>
        <SubmitButton pending={pending} label="Criar oportunidade" pendingLabel="Criando…" />
      </div>
    </form>
  )
}
