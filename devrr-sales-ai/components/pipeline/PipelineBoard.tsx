'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { moveLeadOnBoard, type BoardColumn, type BoardLead } from '@/lib/domain/pipeline-board'
import { moveStage } from '@/lib/actions/leads'
import { LostReasonDialog } from '@/components/leads/LostReasonDialog'
import { PipelineColumn } from './PipelineColumn'
import { PipelineCardPreview } from './PipelineCard'

interface PipelineBoardProps {
  initialColumns: BoardColumn[]
  orgName: string
  lostReasonSuggestions: string[]
  nowIso: string
}

interface PendingMove {
  leadId: string
  toStageId: string
}

const BANNER_TIMEOUT_MS = 5000

// Só Space participa da ativação/confirmação por teclado — o card é também
// um `Link` de verdade (PipelineCard), e o default do dnd-kit inclui Enter
// nos dois papéis, o que colidiria com "Enter abre o lead".
const KEYBOARD_CODES = { start: ['Space'], cancel: ['Escape'], end: ['Space'] }

export function PipelineBoard({ initialColumns, orgName, lostReasonSuggestions, nowIso }: PipelineBoardProps) {
  const router = useRouter()
  const now = useMemo(() => new Date(nowIso), [nowIso])
  const [columns, setColumns] = useState(initialColumns)
  const [search, setSearch] = useState('')
  const [activeLead, setActiveLead] = useState<BoardLead | null>(null)
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null)
  const [bannerError, setBannerError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (!bannerError) return
    const timeout = window.setTimeout(() => setBannerError(null), BANNER_TIMEOUT_MS)
    return () => window.clearTimeout(timeout)
  }, [bannerError])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { keyboardCodes: KEYBOARD_CODES }),
  )

  function findLead(leadId: string): BoardLead | null {
    for (const column of columns) {
      const lead = column.leads.find((item) => item.id === leadId)
      if (lead) return lead
    }
    return null
  }

  function findStage(stageId: string) {
    return columns.find((column) => column.stage.id === stageId)?.stage ?? null
  }

  const announcements: Announcements = {
    onDragStart({ active }) {
      const lead = findLead(String(active.id))
      return lead ? `${lead.title} selecionado para arrastar.` : undefined
    },
    onDragOver({ active, over }) {
      const lead = findLead(String(active.id))
      const stage = over ? findStage(String(over.id)) : null
      return lead && stage ? `${lead.title} sobre a coluna ${stage.label}.` : undefined
    },
    onDragEnd({ active, over }) {
      const lead = findLead(String(active.id))
      if (!lead) return undefined
      const stage = over ? findStage(String(over.id)) : null
      return stage ? `${lead.title} movido para ${stage.label}.` : `${lead.title} solto fora de uma coluna. Nenhuma mudança.`
    },
    onDragCancel({ active }) {
      const lead = findLead(String(active.id))
      return lead ? `Movimento de ${lead.title} cancelado.` : undefined
    },
  }

  function applyMove(leadId: string, toStageId: string, lostReason?: string): void {
    const snapshot = columns
    setColumns((current) => moveLeadOnBoard(current, leadId, toStageId, new Date()))
    setPendingMove(null)

    startTransition(async () => {
      const result = await moveStage(leadId, toStageId, lostReason ?? null)
      if (result.error) {
        setColumns(snapshot)
        setBannerError(result.error)
        return
      }
      router.refresh()
    })
  }

  function handleDragStart(event: DragStartEvent): void {
    setActiveLead(findLead(String(event.active.id)))
  }

  function handleDragEnd(event: DragEndEvent): void {
    setActiveLead(null)
    const { active, over } = event
    if (!over) return

    const leadId = String(active.id)
    const toStageId = String(over.id)
    const stage = findStage(toStageId)
    const lead = findLead(leadId)
    if (!stage || !lead || lead.stageId === toStageId) return

    if (stage.isLost) {
      setPendingMove({ leadId, toStageId })
      return
    }

    applyMove(leadId, toStageId)
  }

  function handleDragCancel(): void {
    setActiveLead(null)
  }

  const pendingLead = pendingMove ? findLead(pendingMove.leadId) : null

  return (
    <div>
      {bannerError ? (
        <div role="alert" className="mb-3 rounded-md border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger">
          {bannerError}
        </div>
      ) : null}

      <div className="mb-3">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={`Buscar em ${orgName}…`}
          aria-label="Buscar por empresa, título ou contato"
          className="w-full max-w-sm rounded-md border border-white/[0.08] bg-surface-elevated px-3 py-2 text-sm text-content-primary placeholder:text-content-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 sm:w-72"
        />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        accessibility={{ announcements }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {columns.map((column) => (
            <PipelineColumn key={column.stage.id} column={column} search={search} now={now} />
          ))}
        </div>

        <DragOverlay>{activeLead ? <PipelineCardPreview lead={activeLead} now={now} /> : null}</DragOverlay>
      </DndContext>

      {pendingMove ? (
        <LostReasonDialog
          open
          leadTitle={pendingLead?.title ?? ''}
          suggestions={lostReasonSuggestions}
          pending={false}
          error={null}
          onConfirm={(reason) => applyMove(pendingMove.leadId, pendingMove.toStageId, reason)}
          onCancel={() => setPendingMove(null)}
        />
      ) : null}
    </div>
  )
}
