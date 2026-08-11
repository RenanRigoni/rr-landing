'use client'

import { useActionState, useMemo, useState } from 'react'
import { createPromptVersion, type CreatePromptVersionState } from '@/lib/actions/prompt-lab'
import { SubmitButton } from '@/components/ui/SubmitButton'
import type { PromptGroup } from '@/lib/queries/prompt-lab'

const initialState: CreatePromptVersionState = { error: null }

export function NewPromptVersionForm({ groups }: { groups: PromptGroup[] }) {
  const [state, formAction, pending] = useActionState(createPromptVersion, initialState)
  const [slug, setSlug] = useState(groups[0]?.slug ?? '')

  const latest = useMemo(() => groups.find((g) => g.slug === slug)?.versions[0], [groups, slug])

  return (
    <form action={formAction} key={slug} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="slug" className="text-xs font-medium text-content-secondary">
            Prompt
          </label>
          <select
            id="slug"
            name="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="rounded-inner border border-white/[0.08] bg-surface px-3 py-2 text-sm text-content-primary outline-none focus:border-brand-500"
          >
            {groups.map((g) => (
              <option key={g.slug} value={g.slug}>
                {g.slug} (próxima versão: v{(g.versions[0]?.version ?? 0) + 1})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="model" className="text-xs font-medium text-content-secondary">
            Modelo
          </label>
          <input
            id="model"
            name="model"
            defaultValue={latest?.model ?? 'anthropic/claude-sonnet-5'}
            className="rounded-inner border border-white/[0.08] bg-surface px-3 py-2 text-sm text-content-primary outline-none focus:border-brand-500"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className="text-xs font-medium text-content-secondary">
          Título
        </label>
        <input
          id="title"
          name="title"
          defaultValue={latest?.title ?? ''}
          required
          className="rounded-inner border border-white/[0.08] bg-surface px-3 py-2 text-sm text-content-primary outline-none focus:border-brand-500"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="system_prompt" className="text-xs font-medium text-content-secondary">
          System prompt
        </label>
        <textarea
          id="system_prompt"
          name="system_prompt"
          defaultValue={latest?.system_prompt ?? ''}
          required
          rows={4}
          className="rounded-inner border border-white/[0.08] bg-surface px-3 py-2 font-mono text-xs text-content-primary outline-none focus:border-brand-500"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="user_prompt_template" className="text-xs font-medium text-content-secondary">
          User prompt template (use {'{{placeholders}}'})
        </label>
        <textarea
          id="user_prompt_template"
          name="user_prompt_template"
          defaultValue={latest?.user_prompt_template ?? ''}
          required
          rows={6}
          className="rounded-inner border border-white/[0.08] bg-surface px-3 py-2 font-mono text-xs text-content-primary outline-none focus:border-brand-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="temperature" className="text-xs font-medium text-content-secondary">
            Temperature
          </label>
          <input
            id="temperature"
            name="temperature"
            type="number"
            step="0.1"
            min="0"
            max="2"
            defaultValue={latest?.temperature ?? 0.3}
            className="rounded-inner border border-white/[0.08] bg-surface px-3 py-2 text-sm text-content-primary outline-none focus:border-brand-500"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="notes" className="text-xs font-medium text-content-secondary">
            O que mudou nessa versão?
          </label>
          <input
            id="notes"
            name="notes"
            className="rounded-inner border border-white/[0.08] bg-surface px-3 py-2 text-sm text-content-primary outline-none focus:border-brand-500"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-xs text-content-secondary">
        <input type="checkbox" name="activate" className="accent-brand-600" />
        Ativar essa versão imediatamente (desativa a versão atual dessa slug)
      </label>

      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}

      <div>
        <SubmitButton pending={pending} label="Criar nova versão" pendingLabel="Criando…" />
      </div>
    </form>
  )
}
