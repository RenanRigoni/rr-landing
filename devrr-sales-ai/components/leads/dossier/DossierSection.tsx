'use client'

import type { ReactNode } from 'react'
import { labelClass } from './DossierFields'

// Accordion nativo do dossiê (7.6): `<details>`/`<summary>`, sem lib. O
// `<summary>` já é focável e alterna com teclado por padrão. Os botões de
// ação ficam FORA do `<summary>` (botão dentro de summary compete com o
// toggle) — numa barra logo abaixo. Sem animação de entrada
// (DESIGN_SYSTEM.md → o que NÃO herdar).

interface DossierSectionProps {
  title: string
  /** Contador "N de M preenchidos". Omitidos juntos, o contador some — é o caso
   * da seção "Dados do lead" do cadastro (7.7), onde `title`/`full_name` são
   * obrigatórios e um contador de preenchimento não diria nada. */
  filled?: number
  total?: number
  /** Só passado quando a seção tem campos que faz sentido zerar em massa. */
  onClear?: () => void
  /** Só passado quando a seção tem ao menos um campo de enum. */
  onMarkNotAnalyzed?: () => void
  defaultOpen?: boolean
  children: ReactNode
}

const actionButtonClass =
  'rounded-lg border border-white/[0.08] px-2.5 py-1 text-[11px] font-medium text-content-secondary transition-colors ease-spring hover:text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface'

export function DossierSection({
  title,
  filled,
  total,
  onClear,
  onMarkNotAnalyzed,
  defaultOpen = false,
  children,
}: DossierSectionProps) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-lg border border-white/[0.08] bg-surface-elevated"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="text-sm font-semibold text-content-primary">{title}</span>
        {filled !== undefined && total !== undefined ? (
          <span className="font-mono text-xs text-content-muted">
            {filled} de {total} preenchidos
          </span>
        ) : null}
      </summary>

      <div className="border-t border-white/[0.06] px-4 py-4">
        {onClear || onMarkNotAnalyzed ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {onClear ? (
              <button type="button" onClick={onClear} className={actionButtonClass}>
                Limpar seção
              </button>
            ) : null}
            {onMarkNotAnalyzed ? (
              <button type="button" onClick={onMarkNotAnalyzed} className={actionButtonClass}>
                Marcar não analisado
              </button>
            ) : null}
          </div>
        ) : null}
        {children}
      </div>
    </details>
  )
}

export { labelClass }
