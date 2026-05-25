'use client'

import { useState, useCallback } from 'react'
import {
  Link,
  ForkKnife,
  Funnel,
  EnvelopeSimple,
  ChartBar,
  Star,
  Wrench,
  SquaresFour,
  CalendarCheck,
  Robot,
  WhatsappLogo,
  Eye,
} from '@phosphor-icons/react'
import { EXTRA_SERVICES, WHATSAPP_URL } from '@/lib/constants'
import { PhoneModal } from '@/components/ui/phone-modal'
import { MOCKUP_MAP } from '@/components/ui/service-mockups'

const ICON_MAP = {
  Link,
  ForkKnife,
  Funnel,
  EnvelopeSimple,
  ChartBar,
  Star,
  Wrench,
  SquaresFour,
  CalendarCheck,
  Robot,
} as const

type IconKey = keyof typeof ICON_MAP

interface ActivePreview {
  iconKey: string
  name: string
}

function ServiceCard({
  icon,
  name,
  description,
  price,
  period,
  cta,
  onPreview,
}: {
  icon: string
  name: string
  description: string
  price: string
  period: string | null
  cta: string
  onPreview: () => void
}) {
  const Icon = ICON_MAP[icon as IconKey]

  return (
    <div
      onClick={onPreview}
      className="group card-border p-px rounded-card cursor-pointer transition-all duration-200 hover:shadow-glow-sm"
      style={{ '--tw-shadow-color': 'rgba(37,99,235,0.15)' } as React.CSSProperties}
    >
      <div className="bg-surface-elevated rounded-[1.875rem] p-7 flex flex-col gap-5 h-full relative overflow-hidden transition-colors duration-200 group-hover:bg-[rgba(37,99,235,0.04)]">
        {/* Border glow on hover */}
        <div className="absolute inset-0 rounded-[1.875rem] border border-brand-400/0 group-hover:border-brand-400/20 transition-all duration-200 pointer-events-none" />

        {/* "Ver prévia" badge — always visible, top-right */}
        <div className="absolute top-5 right-5 flex items-center gap-1.5 bg-brand-600/15 border border-brand-400/25 rounded-pill px-2.5 py-1 group-hover:bg-brand-600/25 group-hover:border-brand-400/40 transition-all duration-200">
          <Eye size={11} weight="fill" className="text-brand-400" />
          <span className="text-brand-400 text-[9px] font-semibold uppercase tracking-wide">Ver prévia</span>
        </div>

        <div className="w-11 h-11 rounded-xl bg-brand-600/15 border border-brand-400/20 flex items-center justify-center shrink-0">
          {Icon && <Icon size={20} weight="duotone" className="text-brand-400" />}
        </div>

        <div className="flex flex-col gap-1.5 flex-1 pr-12">
          <h3 className="font-semibold text-base text-content-primary leading-snug">{name}</h3>
          <p className="text-sm text-content-secondary leading-relaxed">{description}</p>
        </div>

        {/* Click hint */}
        <div className="flex items-center gap-1.5 text-brand-400/60 group-hover:text-brand-400 transition-colors duration-200">
          <Eye size={12} />
          <span className="text-[10px] font-medium">Clique para ver como fica</span>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-content-muted">
            A partir de
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-xs text-content-muted">R$</span>
            <span className="font-mono font-medium text-2xl text-content-primary">{price}</span>
            {period && <span className="text-xs text-content-muted ml-0.5">{period}</span>}
          </div>
        </div>

        <a
          href={`${WHATSAPP_URL}&text=${encodeURIComponent(`Olá! Tenho interesse no serviço: ${name}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-center gap-2 rounded-pill glass text-content-primary px-5 py-3 text-sm font-semibold transition-all duration-200 ease-spring hover:border-brand-400/30 hover:text-brand-400 hover:bg-brand-600/10 relative z-10"
        >
          <WhatsappLogo size={15} weight="fill" />
          {cta}
        </a>
      </div>
    </div>
  )
}

export function ServicosClient() {
  const [active, setActive] = useState<ActivePreview | null>(null)

  const handleClose = useCallback(() => setActive(null), [])

  const MockupComponent = active ? MOCKUP_MAP[active.iconKey] : null

  return (
    <>
      {EXTRA_SERVICES.map((group) => (
        <div key={group.category} className="flex flex-col gap-8">
          <div className="flex items-center gap-4">
            <h2 className="font-semibold text-lg text-content-primary whitespace-nowrap">
              {group.category}
            </h2>
            <div className="flex-1 h-px bg-white/[0.07]" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {group.items.map((item) => (
              <ServiceCard
                key={item.name}
                {...item}
                onPreview={() => setActive({ iconKey: item.icon, name: item.name })}
              />
            ))}
          </div>
        </div>
      ))}

      <PhoneModal
        isOpen={!!active}
        onClose={handleClose}
        title={active?.name ?? ''}
      >
        {MockupComponent && <MockupComponent />}
      </PhoneModal>
    </>
  )
}
