'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LostReasonModal } from '@/components/pipeline/LostReasonModal'
import { moveDealStage } from '@/lib/actions/deals'

interface StageMoverProps {
  dealId: string
  currentStageId: string
  stages: { id: string; name: string; is_won: boolean; is_lost: boolean }[]
  lostReasons: { id: string; label: string }[]
  disabled: boolean
}

export function StageMover({ dealId, currentStageId, stages, lostReasons, disabled }: StageMoverProps) {
  const router = useRouter()
  const [pendingStageId, setPendingStageId] = useState<string | null>(null)

  const pendingStage = pendingStageId ? stages.find((s) => s.id === pendingStageId) : null

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const stageId = e.target.value
    const stage = stages.find((s) => s.id === stageId)
    if (!stage) return

    if (stage.is_lost) {
      setPendingStageId(stageId)
      return
    }

    await moveDealStage(dealId, { stage_id: stageId })
    router.refresh()
  }

  async function handleConfirmLost(lostReasonId: string, notes: string | null) {
    const result = await moveDealStage(dealId, {
      stage_id: pendingStageId,
      lost_reason_id: lostReasonId,
      lost_reason_notes: notes,
    })
    if (!result.error) router.refresh()
    return result
  }

  return (
    <>
      <select
        value={currentStageId}
        onChange={handleChange}
        disabled={disabled}
        className="rounded-inner border border-white/[0.08] bg-surface px-3 py-2 text-sm text-content-primary outline-none transition-colors ease-spring focus:border-brand-500 disabled:opacity-60"
      >
        {stages.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>

      <LostReasonModal
        open={pendingStage !== null}
        onClose={() => setPendingStageId(null)}
        onConfirm={handleConfirmLost}
        lostReasons={lostReasons}
      />
    </>
  )
}
