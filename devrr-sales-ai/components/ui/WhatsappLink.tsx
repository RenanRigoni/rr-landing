'use client'

import type { MouseEvent, PointerEvent } from 'react'
import { WhatsappLogo } from '@phosphor-icons/react'
import { buildWhatsappUrl } from '@/lib/domain/whatsapp'

interface WhatsappLinkProps {
  phone: string | null
  text?: string
  variant?: 'icon' | 'button'
  label?: string
}

// stopPropagation em onPointerDown/onClick sempre — inofensivo onde não há
// ancestral clicável, e necessário onde há (PipelineCard é um <Link>
// arrastável; a linha de Ações de hoje também é clicável).
function stopPropagation(event: PointerEvent | MouseEvent): void {
  event.stopPropagation()
}

/**
 * Click-to-chat do WhatsApp (D-010/D-045 — sem integração oficial no MVP).
 * `null` sem telefone válido: quem renderiza não mostra nada. Nunca registra
 * atividade sozinho — o app não sabe se a mensagem foi enviada de verdade.
 */
export function WhatsappLink({ phone, text, variant = 'icon', label = 'WhatsApp' }: WhatsappLinkProps) {
  const url = buildWhatsappUrl(phone, text)
  if (url === null) return null

  if (variant === 'button') {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onPointerDown={stopPropagation}
        onClick={stopPropagation}
        className="inline-flex items-center gap-1.5 rounded-md bg-success/15 px-2.5 py-1.5 text-xs font-medium text-success transition-colors ease-spring hover:bg-success/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      >
        <WhatsappLogo weight="regular" className="size-4" />
        {label}
      </a>
    )
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onPointerDown={stopPropagation}
      onClick={stopPropagation}
      aria-label="Abrir conversa no WhatsApp"
      className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-success transition-colors ease-spring hover:bg-success/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
    >
      <WhatsappLogo weight="regular" className="size-4" />
    </a>
  )
}
