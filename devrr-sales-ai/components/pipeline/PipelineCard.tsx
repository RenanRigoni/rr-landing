'use client'

import Link from 'next/link'
import { useDraggable } from '@dnd-kit/core'
import { formatBRL } from '@/lib/domain/money'
import { formatRelativeDateBR } from '@/lib/domain/date'
import { cn } from '@/lib/utils/cn'
import type { BoardLead } from '@/lib/domain/pipeline-board'

interface CardBodyProps {
  lead: BoardLead
  now: Date
}

const TEMPERATURE_STYLE: Record<NonNullable<BoardLead['temperature']>, { className: string; label: string }> = {
  hot: { className: 'bg-danger', label: 'Quente' },
  warm: { className: 'bg-warning', label: 'Morno' },
  cold: { className: 'bg-content-muted', label: 'Frio' },
}

function PipelineCardBody({ lead, now }: CardBodyProps) {
  const isOverdue = lead.nextActionAt !== null && new Date(lead.nextActionAt).getTime() < now.getTime()
  const temperature = lead.temperature ? TEMPERATURE_STYLE[lead.temperature] : null

  return (
    <>
      <p className="truncate text-sm font-medium text-content-primary">{lead.companyName}</p>
      <p className="mt-0.5 line-clamp-2 text-xs text-content-secondary">{lead.title}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm text-content-primary">{formatBRL(lead.valueCents)}</span>
        {temperature ? (
          <span aria-label={temperature.label} title={temperature.label} className={cn('size-1.5 shrink-0 rounded-full', temperature.className)} />
        ) : null}
        {lead.nextActionAt ? (
          <span className={cn('font-mono text-xs', isOverdue ? 'text-danger' : 'text-content-muted')}>
            {formatRelativeDateBR(lead.nextActionAt, now)}
          </span>
        ) : null}
        {lead.digitalScore !== null ? (
          <span className="rounded-pill bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-content-secondary">{lead.digitalScore}</span>
        ) : null}
      </div>
    </>
  )
}

/** Cópia estática do card para o `DragOverlay` — nunca chama `useDraggable` (evitaria registrar o mesmo id do card real duas vezes enquanto os dois estão montados durante o arraste). */
export function PipelineCardPreview({ lead, now }: CardBodyProps) {
  return (
    <div className="w-72 rounded-lg border border-brand-400/40 bg-surface-card p-3 shadow-float">
      <PipelineCardBody lead={lead} now={now} />
    </div>
  )
}

type PipelineCardProps = CardBodyProps

// Ordem do conteúdo e comportamento: docs/specs/FASE_8_PIPELINE.md → 8.3. O
// chip de WhatsApp entra na 8.4 (componente ainda não existe nesta tarefa).
// `activationConstraint: { distance: 6 }` no PointerSensor (PipelineBoard)
// garante que um clique sem arrastar chega como navegação normal do `Link`;
// só o Space participa da ativação/confirmação por teclado (PipelineBoard
// restringe `keyboardCodes` do KeyboardSensor) — Enter continua sendo
// "abrir o lead", nunca "iniciar arraste".
export function PipelineCard({ lead, now }: PipelineCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id })

  return (
    <Link
      ref={setNodeRef}
      href={`/leads/${lead.id}`}
      {...attributes}
      {...listeners}
      className={cn(
        'block rounded-lg border border-white/[0.06] bg-surface-elevated p-3 transition-colors ease-spring hover:border-brand-400/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        isDragging ? 'opacity-60' : undefined,
      )}
    >
      <PipelineCardBody lead={lead} now={now} />
    </Link>
  )
}
