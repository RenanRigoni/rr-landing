'use client'

import { WhatsappLogo } from '@phosphor-icons/react'
import { WHATSAPP_URL } from '@/lib/constants'

export function WhatsappFloat() {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      className="fixed bottom-6 right-6 z-40 group flex items-center gap-3 rounded-pill bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 px-5 py-3.5 text-sm font-semibold transition-all duration-500 ease-spring hover:bg-emerald-600 hover:scale-[1.04] active:scale-[0.98]"
    >
      <WhatsappLogo size={22} weight="fill" />
      <span className="hidden sm:inline">Falar no WhatsApp</span>
    </a>
  )
}
