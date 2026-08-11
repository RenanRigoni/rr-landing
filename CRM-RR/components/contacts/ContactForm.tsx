'use client'

import { useActionState } from 'react'
import { FormField } from '@/components/ui/FormField'
import { SubmitButton } from '@/components/ui/SubmitButton'
import type { ContactFormState } from '@/lib/actions/contacts'

interface ContactFormProps {
  action: (state: ContactFormState, formData: FormData) => Promise<ContactFormState>
  companies: { id: string; company_name: string }[]
  defaultValues?: {
    full_name: string
    email: string | null
    phone: string | null
    role_title: string | null
    company_id: string | null
    linkedin_url: string | null
    notes: string | null
  }
  submitLabel: string
  submitPendingLabel: string
}

const initialState: ContactFormState = { error: null }

export function ContactForm({
  action,
  companies,
  defaultValues,
  submitLabel,
  submitPendingLabel,
}: ContactFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState)

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      <FormField label="Nome completo" name="full_name" defaultValue={defaultValues?.full_name} required />

      <div className="grid grid-cols-2 gap-4">
        <FormField label="E-mail" name="email" type="email" defaultValue={defaultValues?.email} />
        <FormField label="Telefone" name="phone" defaultValue={defaultValues?.phone} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Cargo" name="role_title" defaultValue={defaultValues?.role_title} />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="company_id" className="text-xs font-medium text-content-secondary">
            Empresa
          </label>
          <select
            id="company_id"
            name="company_id"
            defaultValue={defaultValues?.company_id ?? ''}
            className="rounded-inner border border-white/[0.08] bg-surface px-3 py-2 text-sm text-content-primary outline-none transition-colors ease-spring focus:border-brand-500"
          >
            <option value="">—</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.company_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <FormField label="LinkedIn" name="linkedin_url" defaultValue={defaultValues?.linkedin_url} />

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
