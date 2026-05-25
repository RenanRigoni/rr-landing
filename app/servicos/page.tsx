import type { Metadata } from 'next'
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
  ArrowLeft,
} from '@phosphor-icons/react/dist/ssr'
import { Navbar } from '@/components/sections/navbar'
import { Footer } from '@/components/sections/footer'
import { WhatsappFloat } from '@/components/ui/whatsapp-float'
import { EXTRA_SERVICES, WHATSAPP_URL, SITE_CONFIG } from '@/lib/constants'

export const metadata: Metadata = {
  title: `Outros Serviços Digitais para Negócios Locais | dev.RR`,
  description: `Cardápio digital, link de bio, e-mail profissional, agendamento online, chatbot WhatsApp e mais. Serviços avulsos e mensais da dev.RR para ${SITE_CONFIG.city} e todo o Brasil.`,
  alternates: { canonical: '/servicos' },
}

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

function ServiceCard({
  icon,
  name,
  description,
  price,
  period,
  cta,
}: {
  icon: string
  name: string
  description: string
  price: string
  period: string | null
  cta: string
}) {
  const Icon = ICON_MAP[icon as IconKey]

  return (
    <div className="card-border p-px rounded-card">
      <div className="bg-surface-elevated rounded-[1.875rem] p-7 flex flex-col gap-5 h-full">
        <div className="w-11 h-11 rounded-xl bg-brand-600/15 border border-brand-400/20 flex items-center justify-center shrink-0">
          {Icon && <Icon size={20} weight="duotone" className="text-brand-400" />}
        </div>

        <div className="flex flex-col gap-1.5 flex-1">
          <h3 className="font-semibold text-base text-content-primary">{name}</h3>
          <p className="text-sm text-content-secondary leading-relaxed">{description}</p>
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
          className="flex items-center justify-center gap-2 rounded-pill glass text-content-primary px-5 py-3 text-sm font-semibold transition-all duration-200 ease-spring hover:border-brand-400/30 hover:text-brand-400 hover:bg-brand-600/10"
        >
          <WhatsappLogo size={15} weight="fill" />
          {cta}
        </a>
      </div>
    </div>
  )
}

export default function ServicosPage() {
  return (
    <>
      <Navbar />
      <main id="main-content" className="pt-32 pb-24 px-4">
        <div className="max-w-6xl mx-auto flex flex-col gap-20">

          {/* Header */}
          <div className="flex flex-col gap-5 max-w-2xl">
            <a
              href="/"
              className="inline-flex items-center gap-2 text-sm text-content-muted hover:text-brand-400 transition-colors duration-200 w-fit"
            >
              <ArrowLeft size={14} weight="bold" />
              Voltar para a página inicial
            </a>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-400">
              Outros serviços
            </p>
            <h1 className="font-sans font-bold text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.15] tracking-[-0.02em] text-content-primary">
              Mais do que um site.
              <br />
              <span className="text-content-secondary font-normal">
                Tudo que o seu negócio precisa online.
              </span>
            </h1>
            <p className="text-lg text-content-secondary leading-[1.7] max-w-xl">
              Além dos pacotes principais, ofereço serviços avulsos e mensais para complementar a sua presença digital. Contrate o que faz sentido agora.
            </p>
          </div>

          {/* Service categories */}
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
                  <ServiceCard key={item.name} {...item} />
                ))}
              </div>
            </div>
          ))}

          {/* CTA bottom */}
          <div className="card-border-brand p-px rounded-card">
            <div className="bg-surface-card rounded-[1.875rem] p-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex flex-col gap-2 max-w-lg">
                <h2 className="font-sans font-bold text-2xl md:text-3xl text-content-primary tracking-tight leading-snug">
                  Não encontrou o que procurava?
                </h2>
                <p className="text-content-secondary text-sm leading-relaxed">
                  Me descreve o que você precisa no WhatsApp. Se estiver dentro do que faço, te mando proposta em até 24 horas.
                </p>
              </div>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 flex items-center gap-2 rounded-pill bg-brand-600 text-white px-7 py-4 text-sm font-semibold transition-all duration-200 ease-spring hover:bg-brand-500 hover:scale-[1.02] hover:shadow-glow-sm active:scale-[0.98] whitespace-nowrap"
              >
                <WhatsappLogo size={18} weight="fill" />
                Falar no WhatsApp
              </a>
            </div>
          </div>

        </div>
      </main>
      <Footer />
      <WhatsappFloat />
    </>
  )
}
