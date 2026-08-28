'use client'

import { useState, useTransition } from 'react'
import { consultPagespeed } from '@/lib/actions/pagespeed'
import { assemblePagespeedPatch, type PagespeedFormPatch } from '@/lib/domain/pagespeed-parse'

// "Consultar PageSpeed" (7.10). Componente cliente autossuficiente: fala só com
// a action `consultPagespeed` (nunca com a API do Google direto — a chave é
// server-only). A consulta PREENCHE os campos do formulário via `onApply`; NÃO
// salva o dossiê — o operador revisa e clica em "Salvar dossiê".
//
// `type="button"` sempre: não pode disparar o submit do `<form>` por acidente.
// Enquanto consulta, fica desabilitado (trava duplo-clique). Só fica operante
// quando o dossiê afirma que o site existe (`website_exists === 'sim'`) e há
// uma `website_url` — não faz sentido medir um site que o próprio dossiê diz
// não existir.

interface PagespeedConsultButtonProps {
  /** `values.website_url` atual do formulário — fonte principal da URL. */
  websiteUrl: string
  /** `values.website_exists` atual — o botão só opera com `'sim'`. */
  websiteExists: string
  /** Mescla o patch de campos `pagespeed_*` no state do formulário (spread —
   * preserva o que a consulta não trouxe). */
  onApply: (patch: PagespeedFormPatch) => void
}

type Status = 'idle' | 'loading' | 'done' | 'error'

export function PagespeedConsultButton({ websiteUrl, websiteExists, onApply }: PagespeedConsultButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])

  const url = websiteUrl.trim()
  const operable = websiteExists === 'sim' && url !== ''
  const disabled = !operable || isPending

  function run(): void {
    if (disabled) return
    setStatus('loading')
    setMessage(null)
    setWarnings([])
    startTransition(async () => {
      const result = await consultPagespeed(url)
      if (!result.ok) {
        setStatus('error')
        setMessage(result.error ?? 'Não foi possível consultar o PageSpeed.')
        return
      }
      // Offset do fuso do usuário PARA o instante da consulta — o
      // `pagespeed_analyzed_at` do dossiê é relógio local no input.
      const offset = new Date(result.analyzedAtIso ?? Date.now()).getTimezoneOffset()
      const { patch, warnings: assembleWarnings } = assemblePagespeedPatch(result, offset)
      onApply(patch)
      setWarnings(assembleWarnings)
      setStatus('done')
      setMessage(
        assembleWarnings.length === 0
          ? 'PageSpeed consultado — revise os campos e salve o dossiê.'
          : 'PageSpeed consultado parcialmente — revise os campos e salve o dossiê.',
      )
    })
  }

  const label =
    status === 'loading' || isPending
      ? 'Consultando…'
      : status === 'done'
        ? 'Consultar de novo'
        : 'Consultar PageSpeed'

  return (
    <div className="mt-4 flex flex-col gap-1.5 rounded-inner border border-white/[0.08] bg-surface p-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={run}
          disabled={disabled}
          aria-busy={isPending}
          className="rounded-md bg-brand-600/15 px-2.5 py-1.5 text-xs font-medium text-brand-400 transition-colors ease-spring hover:bg-brand-600/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60"
        >
          {label}
        </button>
        <span className="text-[11px] text-content-muted">
          Busca mobile e desktop na API oficial. Preenche os campos — não salva.
        </span>
      </div>

      {!operable ? (
        <p className="text-[11px] text-content-muted">
          Preencha <span className="font-medium">Possui site? = Sim</span> e a{' '}
          <span className="font-medium">URL do site</span> para habilitar.
        </p>
      ) : null}

      {message ? (
        <p
          role={status === 'error' ? 'alert' : 'status'}
          className={`text-[11px] ${status === 'error' ? 'text-danger' : 'text-content-secondary'}`}
        >
          {message}
        </p>
      ) : null}

      {warnings.length > 0 ? (
        <ul className="text-[11px] text-warning">
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
