'use client'

import { useTransition } from 'react'
import { activatePromptVersion } from '@/lib/actions/prompt-lab'

export function ActivateVersionButton({ promptId, slug }: { promptId: string; slug: string }) {
  const [pending, startTransition] = useTransition()

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await activatePromptVersion(promptId, slug)
        })
      }
      className="rounded-pill border border-brand-500/40 px-3 py-1 text-[11px] font-medium text-brand-400 transition-colors ease-spring hover:bg-brand-600/10 disabled:opacity-60"
    >
      {pending ? 'Ativando…' : 'Ativar'}
    </button>
  )
}
