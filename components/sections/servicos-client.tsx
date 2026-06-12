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
  ShoppingCartSimple,
  Kanban,
  GearSix,
  RocketLaunch,
  Megaphone,
  Images,
  WhatsappLogo,
  Eye,
  CheckCircle,
  ArrowRight,
} from '@phosphor-icons/react'
import { EXTRA_SERVICES, SOLUTION_PACKAGES, WHATSAPP_URL } from '@/lib/constants'
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
  ShoppingCartSimple,
  Kanban,
  GearSix,
  RocketLaunch,
  Megaphone,
  Images,
} as const

type IconKey = keyof typeof ICON_MAP

interface ActivePreview {
  iconKey: string
  name: string
}

function buildWhatsAppUrl(message: string) {
  const baseUrl = WHATSAPP_URL.split('?')[0]
  return `${baseUrl}?text=${encodeURIComponent(message)}`
}

function SolutionPackageCard({
  icon,
  name,
  tagline,
  price,
  period,
  highlight,
  badge,
  features,
  bonus,
  cta,
}: {
  icon: string
  name: string
  tagline: string
  price: string
  period: string | null
  highlight: boolean
  badge: string | null
  features: readonly string[]
  bonus: string
  cta: string
}) {
  const Icon = ICON_MAP[icon as IconKey]

  return (
    <div className={`${highlight ? 'card-border-brand shadow-glow-sm' : 'card-border'} p-px rounded-card`}>
      <div className={`${highlight ? 'bg-surface-card' : 'bg-surface-elevated'} rounded-[1.875rem] p-8 flex flex-col gap-6 h-full`}>
        <div className="flex items-start justify-between gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-600/15 border border-brand-400/20 flex items-center justify-center shrink-0">
            {Icon && <Icon size={22} weight="duotone" className="text-brand-400" />}
          </div>
          {badge && (
            <span className="rounded-pill bg-brand-600 text-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] whitespace-nowrap">
              {badge}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <h3 className="font-semibold text-lg text-content-primary leading-snug">{name}</h3>
          <p className="text-sm text-content-secondary leading-relaxed">{tagline}</p>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-content-muted">
            A partir de
          </span>
          <div className="flex flex-wrap items-baseline gap-1.5">
            <span className="text-sm text-content-muted">R$</span>
            <span className="font-mono font-medium text-4xl text-content-primary">{price}</span>
            {period && <span className="text-xs text-content-muted">{period}</span>}
          </div>
        </div>

        <div className="border-t border-white/[0.08]" />

        <ul className="flex flex-col gap-3 flex-1">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-3 text-sm text-content-secondary leading-relaxed">
              <CheckCircle size={16} weight="fill" className="text-brand-400 shrink-0 mt-0.5" />
              {feature}
            </li>
          ))}
        </ul>

        <div className="rounded-xl bg-brand-600/10 border border-brand-400/15 p-3">
          <p className="text-xs text-content-secondary leading-relaxed">{bonus}</p>
        </div>

        <a
          href={buildWhatsAppUrl(`Olá! Tenho interesse no pacote: ${name}`)}
          target="_blank"
          rel="noopener noreferrer"
          className={highlight
            ? 'group flex items-center justify-center gap-2 rounded-pill bg-brand-600 text-white px-6 py-3.5 text-sm font-semibold transition-all duration-200 ease-spring hover:bg-brand-500 hover:scale-[1.02] hover:shadow-glow-sm active:scale-[0.98]'
            : 'group flex items-center justify-center gap-2 rounded-pill glass text-content-primary px-6 py-3.5 text-sm font-semibold transition-all duration-200 ease-spring hover:border-brand-400/30 hover:text-brand-400 hover:bg-brand-600/10'
          }
        >
          <WhatsappLogo size={16} weight="fill" />
          {cta}
          <span className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center transition-transform duration-200 ease-spring group-hover:translate-x-0.5">
            <ArrowRight size={12} weight="bold" />
          </span>
        </a>
      </div>
    </div>
  )
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
          href={buildWhatsAppUrl(`Olá! Tenho interesse no serviço: ${name}`)}
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
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-3 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-400">
            Soluções completas
          </p>
          <h2 className="font-sans font-bold text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.2] tracking-[-0.02em] text-content-primary">
            Quando você quer a estrutura inteira funcionando
          </h2>
          <p className="text-content-secondary leading-[1.7]">
            Pacotes para unir presença digital, captação de clientes, organização comercial,
            vendas online e conteúdo profissional em uma entrega só.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
          {SOLUTION_PACKAGES.map((plan) => (
            <SolutionPackageCard key={plan.name} {...plan} />
          ))}
        </div>
      </div>

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
