'use client'

import { useActionState } from 'react'
import { FormField } from '@/components/ui/FormField'
import { SubmitButton } from '@/components/ui/SubmitButton'
import type { CompanyFormState } from '@/lib/actions/companies'

interface CompanyFormProps {
  action: (state: CompanyFormState, formData: FormData) => Promise<CompanyFormState>
  leadSources: { id: string; name: string }[]
  defaultValues?: {
    company_name: string
    website: string | null
    industry: string | null
    company_size: string | null
    city: string | null
    state: string | null
    country: string | null
    estimated_revenue_range: string | null
    acquisition_source_id: string | null
    icp_fit: string | null
    notes: string | null
  }
  submitLabel: string
  submitPendingLabel: string
}

const initialState: CompanyFormState = { error: null }

export function CompanyForm({
  action,
  leadSources,
  defaultValues,
  submitLabel,
  submitPendingLabel,
}: CompanyFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState)

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      <FormField label="Nome da empresa" name="company_name" defaultValue={defaultValues?.company_name} required />

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Website" name="website" defaultValue={defaultValues?.website} />
        <FormField label="Segmento" name="industry" defaultValue={defaultValues?.industry} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <FormField label="Cidade" name="city" defaultValue={defaultValues?.city} />
        <FormField label="Estado" name="state" defaultValue={defaultValues?.state} />
        <FormField label="País" name="country" defaultValue={defaultValues?.country} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Porte da empresa" name="company_size" defaultValue={defaultValues?.company_size} />
        <FormField
          label="Faixa de faturamento estimada"
          name="estimated_revenue_range"
          defaultValue={defaultValues?.estimated_revenue_range}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="acquisition_source_id" className="text-xs font-medium text-content-secondary">
            Fonte de aquisição
          </label>
          <select
            id="acquisition_source_id"
            name="acquisition_source_id"
            defaultValue={defaultValues?.acquisition_source_id ?? ''}
            className="rounded-inner border border-white/[0.08] bg-surface px-3 py-2 text-sm text-content-primary outline-none transition-colors ease-spring focus:border-brand-500"
          >
            <option value="">—</option>
            {leadSources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="icp_fit" className="text-xs font-medium text-content-secondary">
            Fit com ICP
          </label>
          <select
            id="icp_fit"
            name="icp_fit"
            defaultValue={defaultValues?.icp_fit ?? ''}
            className="rounded-inner border border-white/[0.08] bg-surface px-3 py-2 text-sm text-content-primary outline-none transition-colors ease-spring focus:border-brand-500"
          >
            <option value="">—</option>
            <option value="poor">Fraco</option>
            <option value="partial">Parcial</option>
            <option value="strong">Forte</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="notes" className="text-xs font-medium text-content-secondary">
          Notas
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={defaultValues?.notes ?? ''}
          className="rounded-inner border border-white/[0.08] bg-surface px-3 py-2 text-sm text-content-primary outline-none transition-colors ease-spring focus:border-brand-500"
        />
      </div>

      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}

      <div>
        <SubmitButton pending={pending} label={submitLabel} pendingLabel={submitPendingLabel} />
      </div>
    </form>
  )
}
