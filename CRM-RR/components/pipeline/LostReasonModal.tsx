'use client'

import { useState, useTransition } from 'react'
import { Modal } from '@/components/ui/Modal'

interface LostReasonModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (lostReasonId: string, notes: string | null) => Promise<{ error: string | null }>
  lostReasons: { id: string; label: string }[]
}

export function LostReasonModal({ open, onClose, onConfirm, lostReasons }: LostReasonModalProps) {
  const [reasonId, setReasonId] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleClose() {
    setReasonId('')
    setNotes('')
    setError(null)
    onClose()
  }

  function handleConfirm() {
    if (!reasonId) {
      setError('Selecione um motivo')
      return
    }
    startTransition(async () => {
      const result = await onConfirm(reasonId, notes || null)
      if (result.error) {
        setError(result.error)
        return
      }
      handleClose()
    })
  }

  return (
    <Modal open={open} onClose={handleClose} title="Por que essa oportunidade foi perdida?">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="lost-reason" className="text-xs font-medium text-content-secondary">
            Motivo <span className="text-danger">*</span>
          </label>
          <select
            id="lost-reason"
            value={reasonId}
            onChange={(e) => setReasonId(e.target.value)}
            className="rounded-inner border border-white/[0.08] bg-surface px-3 py-2 text-sm text-content-primary outline-none transition-colors ease-spring focus:border-brand-500"
          >
            <option value="">Selecione…</option>
            {lostReasons.map((reason) => (
              <option key={reason.id} value={reason.id}>
                {reason.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="lost-notes" className="text-xs font-medium text-content-secondary">
            Detalhes (opcional)
          </label>
          <textarea
            id="lost-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="rounded-inner border border-white/[0.08] bg-surface px-3 py-2 text-sm text-content-primary outline-none transition-colors ease-spring focus:border-brand-500"
          />
        </div>

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-pill px-5 py-2 text-sm font-medium text-content-secondary transition-colors ease-spring hover:text-content-primary"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={pending}
            className="rounded-pill bg-danger px-5 py-2 text-sm font-semibold text-white transition-all ease-spring hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? 'Salvando…' : 'Marcar como perdida'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
