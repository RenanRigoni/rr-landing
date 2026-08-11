'use client'

import { useActionState } from 'react'
import { signIn, type SignInState } from '@/lib/actions/auth'

const initialState: SignInState = { error: null }

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initialState)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-xs font-medium text-content-secondary">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded-inner border border-white/[0.08] bg-surface px-3 py-2 text-sm text-content-primary outline-none transition-colors ease-spring focus:border-brand-500"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-xs font-medium text-content-secondary">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="rounded-inner border border-white/[0.08] bg-surface px-3 py-2 text-sm text-content-primary outline-none transition-colors ease-spring focus:border-brand-500"
        />
      </div>

      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-pill bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition-all ease-spring hover:bg-brand-500 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  )
}
