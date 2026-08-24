'use client'

import { useActionState, useState, type ChangeEvent } from 'react'
import { createLeadIntake } from '@/lib/actions/lead-intake'
import type { LeadIntakeResult } from '@/lib/actions/lead-intake-core'
import type { LeadSource } from '@/lib/queries/catalogs'

const initialState: LeadIntakeResult = { status: 'error', error: null }

interface NewLeadFormProps {
  sources: LeadSource[]
}

interface FormValues {
  full_name: string
  phone: string
  email: string
  company_name: string
  title: string
  interest: string
  source_id: string
  value_reais: string
  notes: string
}

const emptyValues: FormValues = {
  full_name: '',
  phone: '',
  email: '',
  company_name: '',
  title: '',
  interest: '',
  source_id: '',
  value_reais: '',
  notes: '',
}

const inputClass =
  'rounded-inner border border-white/[0.08] bg-surface px-3 py-2 text-sm text-content-primary outline-none transition-colors ease-spring focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface'
const labelClass = 'text-xs font-medium text-content-secondary'
const secondaryButtonClass =
  'rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs font-medium text-content-secondary transition-colors ease-spring hover:text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface'

// Cadastro em um passo (docs/IMPLEMENTATION_PLAN.md → 3.6). Campos são
// controlados por decisão testada, não por padrão: com `<form
// action={formAction}>` (useActionState), o React reseta os inputs não
// controlados depois de TODA chamada da action que não lança — inclusive
// quando createLeadIntake devolve `status: 'duplicate'` sem erro nenhum.
// Confirmado no browser antes de escrever assim: sem controle próprio, o
// usuário perdia tudo que já tinha digitado bem na hora em que precisava
// escolher "vincular" ou "criar mesmo assim". Estado local sobrevive porque
// o valor de cada campo é sempre o de `values`, não o que o DOM tenta
// resetar sozinho.
export function NewLeadForm({ sources }: NewLeadFormProps) {
  const [state, formAction, pending] = useActionState(createLeadIntake, initialState)
  const [values, setValues] = useState<FormValues>(emptyValues)

  function handleChange(field: keyof FormValues) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setValues((previous) => ({ ...previous, [field]: event.target.value }))
    }
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.status === 'duplicate' && state.duplicateContact ? (
        <div className="rounded-lg border border-amber-400/30 bg-amber-400/[0.06] px-4 py-3 text-sm text-content-secondary">
          <p>
            Já existe um contato com esse telefone:{' '}
            <span className="text-content-primary">{state.duplicateContact.full_name}</span>.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              name="contact_id"
              value={state.duplicateContact.id}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors ease-spring hover:bg-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              Vincular a este contato
            </button>
            <button type="submit" name="force_new_contact" value="true" className={secondaryButtonClass}>
              Criar contato novo mesmo assim
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="full_name" className={labelClass}>
            Nome
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            required
            value={values.full_name}
            onChange={handleChange('full_name')}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="phone" className={labelClass}>
            Telefone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            placeholder="(11) 98888-7777"
            value={values.phone}
            onChange={handleChange('phone')}
            className={`${inputClass} font-mono`}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className={labelClass}>
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={values.email}
            onChange={handleChange('email')}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="company_name" className={labelClass}>
            Empresa
          </label>
          <input
            id="company_name"
            name="company_name"
            type="text"
            value={values.company_name}
            onChange={handleChange('company_name')}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className={labelClass}>
          Título do lead
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          placeholder="Ex.: Landing page para loja de móveis"
          value={values.title}
          onChange={handleChange('title')}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="interest" className={labelClass}>
          Interesse
        </label>
        <textarea
          id="interest"
          name="interest"
          rows={2}
          value={values.interest}
          onChange={handleChange('interest')}
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="source_id" className={labelClass}>
            Fonte
          </label>
          <select
            id="source_id"
            name="source_id"
            value={values.source_id}
            onChange={handleChange('source_id')}
            className={inputClass}
          >
            <option value="">—</option>
            {sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="value_reais" className={labelClass}>
            Valor potencial (R$)
          </label>
          <input
            id="value_reais"
            name="value_reais"
            type="number"
            min="0"
            step="0.01"
            value={values.value_reais}
            onChange={handleChange('value_reais')}
            className={`${inputClass} font-mono`}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="notes" className={labelClass}>
          Observações
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          value={values.notes}
          onChange={handleChange('notes')}
          className={inputClass}
        />
      </div>

      {state.status === 'error' && state.error ? <p className="text-sm text-danger">{state.error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors ease-spring hover:bg-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Salvando…' : 'Criar lead'}
      </button>
    </form>
  )
}
