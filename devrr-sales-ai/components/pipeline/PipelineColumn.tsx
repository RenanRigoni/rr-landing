'use client'

import { useDroppable } from '@dnd-kit/core'
import { formatCompactBRL } from '@/lib/domain/analytics'
import { matchesBoardSearch, type BoardColumn } from '@/lib/domain/pipeline-board'
import { cn } from '@/lib/utils/cn'
import { PipelineCard } from './PipelineCard'

interface PipelineColumnProps {
  column: BoardColumn
  search: string
  now: Date
  orgName: string
}

// A busca filtra só os cards renderizados — os totais do cabeçalho continuam
// do funil inteiro da coluna (docs/specs/FASE_8_PIPELINE.md → 8.3: "não
// altera totais das colunas").
export function PipelineColumn({ column, search, now, orgName }: PipelineColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.stage.id })
  const { stage } = column
  const isClosed = stage.isWon || stage.isLost
  const visibleLeads = column.leads.filter((lead) => matchesBoardSearch(lead, search))

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-72 shrink-0 flex-col overflow-hidden rounded-lg border border-white/[0.08] bg-surface-elevated',
        isOver ? 'ring-1 ring-brand-400/50' : undefined,
      )}
    >
      <div aria-hidden className={cn('h-1 shrink-0', stage.isWon ? 'bg-success' : stage.isLost ? 'bg-danger' : 'bg-white/[0.08]')} />

      <div className="border-b border-white/[0.06] px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate text-sm font-semibold text-content-primary">{stage.label}</h3>
          <span className="shrink-0 font-mono text-xs text-content-muted">{column.leads.length}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-2 font-mono text-xs text-content-secondary">
          <span>{formatCompactBRL(column.totalCents)}</span>
          {!isClosed ? (
            <span className="text-content-muted">
              ≈ {formatCompactBRL(column.weightedCents)} ({stage.probability}%)
            </span>
          ) : null}
        </div>
        {isClosed ? (
          <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-content-muted">
            últimos 30 dias{column.hiddenCount > 0 ? ` · +${column.hiddenCount} anteriores` : ''}
          </p>
        ) : null}
      </div>

      <div className="space-y-2 p-2">
        {visibleLeads.map((lead) => (
          <PipelineCard key={lead.id} lead={lead} now={now} orgName={orgName} />
        ))}
      </div>
    </div>
  )
}
