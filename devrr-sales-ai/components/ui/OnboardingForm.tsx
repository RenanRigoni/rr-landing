'use client'

import { useActionState } from 'react'
import { createOrganization, type CreateOrganizationState } from '@/lib/actions/orgs'

const initialState: CreateOrganizationState = { error: null }

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(createOrganization, initialState)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-xs font-medium text-content-secondary">
          Nome da empresa
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          autoComplete="organization"
          className="rounded-inner border border-white/[0.08] bg-surface px-3 py-2 text-sm text-content-primary outline-none transition-colors ease-spring focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        />
      </div>

      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors ease-spring hover:bg-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Criando…' : 'Criar organização'}
      </button>
    </form>
  )
}
