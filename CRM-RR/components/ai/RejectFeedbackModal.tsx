'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { ERROR_CATEGORIES, type ErrorCategory } from '@/lib/ai/error-categories'

const CATEGORY_LABELS: Record<ErrorCategory, string> = {
  icp_classification: 'Classificação de ICP',
  company_size: 'Porte da empresa',
  need_interpretation: 'Interpretação da necessidade',
  timing: 'Timing',
  budget: 'Orçamento',
  contact_role: 'Cargo do contato',
  hallucinated_information: 'Informação alucinada',
  missing_context: 'Contexto insuficiente',
  wrong_recommendation: 'Recomendação errada',
  other: 'Outro',
}

interface RejectFeedbackModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (category: ErrorCategory, notes: string | null) => void
  pending: boolean
}

export function RejectFeedbackModal({ open, onClose, onConfirm, pending }: RejectFeedbackModalProps) {
  const [category, setCategory] = useState<ErrorCategory>('other')
  const [notes, setNotes] = useState('')

  return (
    <Modal open={open} onClose={onClose} title="O que deu errado?">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="error-category" className="text-xs font-medium text-content-secondary">
            Categoria do erro
          </label>
          <select
            id="error-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as ErrorCategory)}
            className="rounded-inner border border-white/[0.08] bg-surface px-3 py-2 text-sm text-content-primary outline-none focus:border-brand-500"
          >
            {ERROR_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="correction-notes" className="text-xs font-medium text-content-secondary">
            O que deveria ter saído diferente? (opcional)
          </label>
          <textarea
            id="correction-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="rounded-inner border border-white/[0.08] bg-surface px-3 py-2 text-sm text-content-primary outline-none focus:border-brand-500"
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-pill px-5 py-2 text-sm font-medium text-content-secondary transition-colors ease-spring hover:text-content-primary"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => onConfirm(category, notes || null)}
            className="rounded-pill bg-danger px-5 py-2 text-sm font-semibold text-white transition-all ease-spring hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? 'Salvando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
