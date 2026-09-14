'use client'

import { useEffect, useRef, useState } from 'react'

interface LostReasonDialogProps {
  open: boolean
  leadTitle: string
  suggestions: string[]
  pending: boolean
  error: string | null
  onConfirm: (reason: string) => void
  onCancel: () => void
}

const DATALIST_ID = 'lost-reason-suggestions'
const MIN_LENGTH = 3

// `<dialog>` nativo (docs/specs/FASE_8_PIPELINE.md → 8.2): `showModal()`/
// `close()` via ref em vez de biblioteca — Esc já dispara o evento nativo
// `cancel` (fecha sozinho) e `close` cobre todo caminho de fechamento
// (Esc, botão Cancelar, confirmação com sucesso) com um só handler.
export function LostReasonDialog({ open, leadTitle, suggestions, pending, error, onConfirm, onCancel }: LostReasonDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [reason, setReason] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) {
      setReason('')
      dialog.showModal()
      inputRef.current?.focus()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  const canConfirm = reason.trim().length >= MIN_LENGTH && !pending

  function handleConfirm(): void {
    if (!canConfirm) return
    onConfirm(reason)
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onCancel}
      className="w-full max-w-sm rounded-lg border border-white/[0.08] bg-surface-elevated p-0 text-content-primary backdrop:bg-black/60"
    >
      <div className="p-5">
        <h2 className="text-sm font-semibold text-content-primary">Marcar como perdido</h2>
        <p className="mt-1 truncate text-xs text-content-secondary">{leadTitle}</p>

        <label htmlFor="lost-reason-input" className="mt-4 block text-[10px] uppercase tracking-[0.12em] text-content-muted">
          Motivo da perda
        </label>
        <input
          ref={inputRef}
          id="lost-reason-input"
          type="text"
          value={reason}
          list={DATALIST_ID}
          onChange={(event) => setReason(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              handleConfirm()
            }
          }}
          className="mt-1 w-full rounded-md border border-white/[0.08] bg-surface-muted px-3 py-2 text-sm text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        />
        <datalist id={DATALIST_ID}>
          {suggestions.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>

        {suggestions.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {suggestions.slice(0, 5).map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setReason(suggestion)}
                className="rounded-pill bg-white/[0.04] px-2.5 py-1 text-xs text-content-secondary transition-colors ease-spring hover:bg-white/[0.08] hover:text-content-primary"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}

        {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="rounded-md bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-content-secondary transition-colors ease-spring hover:bg-white/[0.08] hover:text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={handleConfirm}
            className="rounded-md bg-danger px-3 py-1.5 text-xs font-semibold text-white transition-colors ease-spring hover:bg-danger/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? 'Marcando…' : 'Marcar como perdido'}
          </button>
        </div>
      </div>
    </dialog>
  )
}
