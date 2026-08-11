'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { KanbanColumn } from '@/components/pipeline/KanbanColumn'
import { LostReasonModal } from '@/components/pipeline/LostReasonModal'
import { moveDealStage } from '@/lib/actions/deals'
import type { BoardStage } from '@/lib/queries/pipeline'

interface KanbanBoardProps {
  initialStages: BoardStage[]
  lostReasons: { id: string; label: string }[]
}

export function KanbanBoard({ initialStages, lostReasons }: KanbanBoardProps) {
  const router = useRouter()
  const [stages, setStages] = useState(initialStages)
  const [pendingLostMove, setPendingLostMove] = useState<{ dealId: string; stageId: string } | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  function moveDealLocally(dealId: string, targetStageId: string) {
    setStages((prev) => {
      let movedDeal = null
      const withoutDeal = prev.map((stage) => {
        const found = stage.deals.find((d) => d.id === dealId)
        if (found) movedDeal = found
        return { ...stage, deals: stage.deals.filter((d) => d.id !== dealId) }
      })
      if (!movedDeal) return prev
      return withoutDeal.map((stage) =>
        stage.id === targetStageId
          ? { ...stage, deals: [{ ...movedDeal!, stage_id: targetStageId }, ...stage.deals] }
          : stage,
      )
    })
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return

    const dealId = String(active.id)
    const targetStageId = String(over.id)

    const currentStage = stages.find((s) => s.deals.some((d) => d.id === dealId))
    if (!currentStage || currentStage.id === targetStageId) return

    const targetStage = stages.find((s) => s.id === targetStageId)
    if (!targetStage) return

    if (targetStage.is_lost) {
      setPendingLostMove({ dealId, stageId: targetStageId })
      return
    }

    moveDealLocally(dealId, targetStageId)
    const result = await moveDealStage(dealId, { stage_id: targetStageId })
    if (result.error) {
      router.refresh()
      return
    }
    router.refresh()
  }

  async function handleConfirmLost(lostReasonId: string, notes: string | null) {
    if (!pendingLostMove) return { error: 'Nenhuma oportunidade selecionada' }
    const result = await moveDealStage(pendingLostMove.dealId, {
      stage_id: pendingLostMove.stageId,
      lost_reason_id: lostReasonId,
      lost_reason_notes: notes,
    })
    if (!result.error) {
      moveDealLocally(pendingLostMove.dealId, pendingLostMove.stageId)
      router.refresh()
    }
    return result
  }

  return (
    <>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => (
            <KanbanColumn key={stage.id} stage={stage} />
          ))}
        </div>
      </DndContext>

      <LostReasonModal
        open={pendingLostMove !== null}
        onClose={() => setPendingLostMove(null)}
        onConfirm={handleConfirmLost}
        lostReasons={lostReasons}
      />
    </>
  )
}
