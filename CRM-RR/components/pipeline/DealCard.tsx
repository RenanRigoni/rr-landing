'use client'

import Link from 'next/link'
import { useDraggable } from '@dnd-kit/core'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { BoardDeal } from '@/lib/queries/pipeline'

interface DealCardProps {
  deal: BoardDeal
}

function formatCurrency(cents: number, currency: string) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(cents / 100)
}

export function DealCard({ deal }: DealCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: deal.id })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 10 }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`flex cursor-grab flex-col gap-2 rounded-lg border border-white/[0.08] bg-surface-elevated p-3 shadow-float transition-shadow ease-spring active:cursor-grabbing ${isDragging ? 'opacity-50' : ''}`}
    >
      <Link
        href={`/deals/${deal.id}`}
        onClick={(e) => e.stopPropagation()}
        className="text-sm font-medium text-content-primary hover:text-brand-400"
      >
        {deal.title}
      </Link>

      {deal.company_name ? <p className="text-xs text-content-secondary">{deal.company_name}</p> : null}

      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-content-primary">
          {formatCurrency(deal.value_cents, deal.currency)}
        </span>
        <span className="font-mono text-[10px] text-content-muted">{deal.days_in_stage}d no estágio</span>
      </div>

      {deal.next_activity_due_at ? (
        <p className={`text-[11px] ${deal.is_overdue ? 'text-danger' : 'text-content-muted'}`}>
          {deal.is_overdue ? 'Atrasado: ' : 'Próximo: '}
          {deal.next_activity_subject} ·{' '}
          {formatDistanceToNow(new Date(deal.next_activity_due_at), { addSuffix: true, locale: ptBR })}
        </p>
      ) : (
        <p className="text-[11px] text-warning">Sem próxima ação</p>
      )}

      {deal.source_name ? (
        <span className="w-fit rounded-pill bg-white/[0.06] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-content-muted">
          {deal.source_name}
        </span>
      ) : null}
    </div>
  )
}
