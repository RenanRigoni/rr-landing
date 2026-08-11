'use client'

import { useState, useTransition } from 'react'
import { purgeDemoData } from '@/lib/actions/settings'

export function PurgeDemoDataButton({ counts }: { counts: { deals: number; contacts: number; companies: number } }) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<string | null>(null)
  const total = counts.deals + counts.contacts + counts.companies

  function handleClick() {
    if (!window.confirm(`Remover ${total} registros marcados como demo? Isso não afeta dados reais.`)) return
    startTransition(async () => {
      const res = await purgeDemoData()
      if (res.error) {
        setResult(`Erro: ${res.error}`)
        return
      }
      setResult(
        `Removidos: ${res.deletedDeals} deals, ${res.deletedContacts} contatos, ${res.deletedCompanies} empresas.`,
      )
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending || total === 0}
        className="w-fit rounded-pill border border-danger/30 px-4 py-2 text-sm font-medium text-danger transition-colors ease-spring hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? 'Removendo…' : total > 0 ? `Remover ${total} registros demo` : 'Nenhum dado demo encontrado'}
      </button>
      {result ? <p className="text-xs text-content-muted">{result}</p> : null}
    </div>
  )
}
