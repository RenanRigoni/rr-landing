'use client'

import { useDroppable } from '@dnd-kit/core'
import { DealCard } from '@/components/pipeline/DealCard'
import type { BoardStage } from '@/lib/queries/pipeline'

interface KanbanColumnProps {
  stage: BoardStage
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(
    cents / 100,
  )
}

export function KanbanColumn({ stage }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })
  const totalValue = stage.deals.reduce((sum, deal) => sum + deal.value_cents, 0)

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col gap-3 rounded-inner border p-3 transition-colors ease-spring ${
        isOver ? 'border-brand-500 bg-brand-600/5' : 'border-white/[0.08] bg-surface-muted'
      }`}
    >
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: stage.color ?? '#64748B' }}
          />
          <h3 className="text-sm font-semibold text-content-primary">{stage.name}</h3>
        </div>
        <span className="font-mono text-[10px] text-content-muted">{stage.deals.length}</span>
      </div>
      <p className="px-1 font-mono text-xs text-content-secondary">{formatCurrency(totalValue)}</p>

      <div className="flex flex-col gap-2 overflow-y-auto scrollbar-thin" style={{ minHeight: 40 }}>
        {stage.deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} />
        ))}
      </div>
    </div>
  )
}
