import type { KeyboardEvent } from 'react'
import Link from 'next/link'
import { formatBRL } from '@/lib/domain/money'
import type { LeadWithoutActionRow as LeadWithoutActionRowData } from '@/lib/queries/today'

interface LeadWithoutActionRowProps {
  lead: LeadWithoutActionRowData
  rowRef: (el: HTMLDivElement | null) => void
  tabIndex: number
  onFocus: () => void
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
}

// docs/DESIGN_SYSTEM.md → "Linha de ação", variação sem `due_at` (não há
// atividade nenhuma, é isso que o bloco denuncia): faixa `brand-400`, sem
// "Concluir"/"Adiar" — não existe activity pra concluir ou reagendar, só
// "Abrir" pra criar a próxima ação de dentro do lead.
export function LeadWithoutActionRow({ lead, rowRef, tabIndex, onFocus, onKeyDown }: LeadWithoutActionRowProps) {
  return (
    <div
      ref={rowRef}
      role="listitem"
      tabIndex={tabIndex}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      className="relative flex min-h-[44px] items-center gap-3 rounded-lg border border-white/[0.06] bg-surface-elevated py-3 pl-5 pr-4 transition-colors ease-spring hover:border-brand-400/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
    >
      <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 rounded-l-lg bg-brand-400" />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-content-primary">
          {lead.contact_name} · {lead.title}
        </p>
        <p className="mt-0.5 truncate text-xs text-content-secondary">{lead.stage_label} · sem próxima ação</p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span className="font-mono text-sm text-content-primary">{formatBRL(lead.value_cents)}</span>
        <Link
          href={`/leads/${lead.id}`}
          className="rounded-md bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors ease-spring hover:bg-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          Abrir
        </Link>
      </div>
    </div>
  )
}
