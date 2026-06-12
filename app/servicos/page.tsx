import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import {
  ArrowLeft,
  ChartBar,
  Images,
  Kanban,
  Megaphone,
  Robot,
  ShoppingCartSimple,
  SquaresFour,
  WhatsappLogo,
} from '@phosphor-icons/react/dist/ssr'
import { Navbar } from '@/components/sections/navbar'
import { Footer } from '@/components/sections/footer'
import { WhatsappFloat } from '@/components/ui/whatsapp-float'
import { ServicosClient } from '@/components/sections/servicos-client'
import { WHATSAPP_URL, SITE_CONFIG } from '@/lib/constants'

export const metadata: Metadata = {
  title: `Serviços e Soluções Digitais para Empresas | dev.RR`,
  description: `E-commerce, CRM, sistemas personalizados, SaaS, tráfego pago, mídias digitais, sites e landing pages da dev.RR para ${SITE_CONFIG.city} e todo o Brasil.`,
  alternates: { canonical: '/servicos' },
}

function ServicesHeroVisual() {
  const signalNodes = [
    { x: '12%', y: '25%', delay: '0s', tone: 'bg-brand-400' },
    { x: '33%', y: '16%', delay: '0.55s', tone: 'bg-cyan-300' },
    { x: '65%', y: '34%', delay: '1.05s', tone: 'bg-brand-400' },
    { x: '91%', y: '45%', delay: '1.55s', tone: 'bg-emerald-300' },
    { x: '16%', y: '74%', delay: '2.05s', tone: 'bg-cyan-300' },
    { x: '51%', y: '68%', delay: '2.45s', tone: 'bg-brand-400' },
    { x: '74%', y: '43%', delay: '2.85s', tone: 'bg-cyan-300' },
    { x: '93%', y: '24%', delay: '3.2s', tone: 'bg-emerald-300' },
  ]

  const metrics = [
    { label: 'leads', value: '128', delta: '+24%' },
    { label: 'vendas', value: '42', delta: '+18%' },
    { label: 'campanhas', value: '06', delta: 'ativas' },
  ]

  const pipeline = [
    { label: 'Captou', value: '31', color: 'bg-brand-400' },
    { label: 'Atendeu', value: '18', color: 'bg-cyan-400' },
    { label: 'Fechou', value: '07', color: 'bg-emerald-400' },
  ]

  const modules = [
    { label: 'E-commerce', icon: ShoppingCartSimple },
    { label: 'CRM', icon: Kanban },
    { label: 'Tráfego', icon: Megaphone },
    { label: 'Conteúdo', icon: Images },
  ]

  return (
    <div
      aria-hidden="true"
      className="relative hidden min-h-[520px] w-full items-center justify-center overflow-hidden lg:flex"
    >
      <div className="absolute inset-0 dot-grid opacity-25 [mask-image:radial-gradient(circle_at_55%_45%,black,transparent_68%)]" />
      <div className="absolute inset-10 rounded-[3rem] border border-brand-400/10 opacity-60 [transform:rotate(-8deg)_skewX(-10deg)]" />

      <div className="relative h-[460px] w-full max-w-[450px] [perspective:1200px]">
        <svg
          className="pointer-events-none absolute inset-0 z-[1] h-full w-full opacity-70"
          viewBox="0 0 450 460"
          fill="none"
        >
          <path
            className="hero-data-path"
            d="M52 116 C146 72 214 92 292 154 C345 196 381 230 421 206"
            stroke="url(#heroLineA)"
            strokeWidth="1"
            strokeDasharray="6 10"
          />
          <path
            className="hero-data-path hero-data-path-delayed"
            d="M72 338 C142 278 228 314 285 250 C331 199 364 141 418 112"
            stroke="url(#heroLineB)"
            strokeWidth="1"
            strokeDasharray="5 12"
          />
          <defs>
            <linearGradient id="heroLineA" x1="52" y1="116" x2="421" y2="206" gradientUnits="userSpaceOnUse">
              <stop stopColor="#60A5FA" stopOpacity="0" />
              <stop offset="0.46" stopColor="#60A5FA" stopOpacity="0.75" />
              <stop offset="1" stopColor="#10B981" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="heroLineB" x1="72" y1="338" x2="418" y2="112" gradientUnits="userSpaceOnUse">
              <stop stopColor="#10B981" stopOpacity="0" />
              <stop offset="0.52" stopColor="#38BDF8" stopOpacity="0.65" />
              <stop offset="1" stopColor="#60A5FA" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {signalNodes.map((node) => (
          <span
            key={`${node.x}-${node.y}`}
            className="hero-signal-node absolute z-[2] flex h-4 w-4 items-center justify-center rounded-full border border-brand-400/20 bg-surface/80"
            style={{ left: node.x, top: node.y, animationDelay: node.delay }}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${node.tone}`} />
          </span>
        ))}

        <div
          className="hero-core-panel absolute left-4 top-12 z-10 h-[360px] w-[390px] overflow-hidden rounded-[2rem] border border-brand-400/20 bg-surface-elevated/80 p-5 shadow-card-lg"
          style={{
            '--hero-panel-transform': 'rotateX(58deg) rotateZ(-34deg) translate3d(0, 0, 0)',
          } as CSSProperties}
        >
          <div className="hero-panel-sheen absolute inset-0 pointer-events-none" />
          <div className="hero-scanline absolute inset-x-0 top-0 h-20 pointer-events-none" />

          <div className="relative flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600/20 ring-1 ring-brand-400/25">
                <SquaresFour size={17} weight="duotone" className="text-brand-400" />
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand-400">
                  dev.RR stack
                </p>
                <p className="text-sm font-semibold text-content-primary">Central digital</p>
              </div>
            </div>
            <div className="hero-live-pill rounded-pill bg-emerald-400/10 px-3 py-1 text-[10px] font-semibold text-emerald-300 ring-1 ring-emerald-400/20">
              online
            </div>
          </div>

          <div className="relative mt-4 grid grid-cols-3 gap-3">
            {metrics.map((metric, index) => (
              <div
                key={metric.label}
                className="hero-chip rounded-2xl bg-white/[0.045] p-3 ring-1 ring-white/[0.08]"
                style={{ animationDelay: `${index * 0.25}s` }}
              >
                <p className="text-[10px] text-content-muted">{metric.label}</p>
                <p className="font-mono text-xl text-content-primary">{metric.value}</p>
                <p className="text-[10px] text-brand-400">{metric.delta}</p>
              </div>
            ))}
          </div>

          <div className="relative mt-4 grid grid-cols-3 gap-3">
            {pipeline.map((column) => (
              <div key={column.label} className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/[0.06]">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-content-secondary">{column.label}</span>
                  <span className="font-mono text-[10px] text-content-muted">{column.value}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="hero-pipeline-item rounded-xl bg-white/[0.055] p-2">
                      <div className={`mb-2 h-1.5 w-8 rounded-full ${column.color}`} />
                      <div className="h-1.5 w-full rounded-full bg-white/15" />
                      <div className="mt-1.5 h-1.5 w-2/3 rounded-full bg-white/10" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="relative mt-4 grid grid-cols-4 gap-2">
            {modules.map(({ label, icon: Icon }, index) => (
              <div
                key={label}
                className="hero-module rounded-2xl bg-brand-600/10 p-3 ring-1 ring-brand-400/15"
                style={{ animationDelay: `${index * 0.35}s` }}
              >
                <Icon size={16} weight="duotone" className="mb-2 text-brand-400" />
                <p className="text-[10px] font-medium text-content-secondary">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div
          className="hero-float-near absolute right-5 top-14 z-20 w-44 overflow-hidden rounded-2xl border border-brand-400/20 bg-surface-card/90 p-4 shadow-glow-sm"
          style={{
            '--hero-float-transform': 'translate3d(0, 0, 90px) rotateZ(8deg)',
          } as CSSProperties}
        >
          <div className="hero-card-sweep absolute inset-0 pointer-events-none" />
          <div className="mb-3 flex items-center gap-2">
            <ChartBar size={16} weight="duotone" className="text-brand-400" />
            <p className="text-xs font-semibold text-content-primary">Aquisição</p>
          </div>
          <div className="flex h-16 items-end gap-1.5">
            {[38, 58, 44, 72, 64, 88, 76].map((height, index) => (
              <div
                key={index}
                className="hero-bar flex-1 rounded-sm bg-brand-500/80"
                style={{ height: `${height}%`, animationDelay: `${index * 0.12}s` }}
              />
            ))}
          </div>
          <p className="mt-3 text-[10px] text-content-muted">Google Ads + Meta Ads</p>
        </div>

        <div
          className="hero-float-mid absolute bottom-14 left-5 z-20 w-48 rounded-2xl border border-white/[0.09] bg-surface-elevated/90 p-4 shadow-card"
          style={{
            '--hero-float-transform': 'translate3d(0, 0, 120px) rotateZ(-10deg)',
          } as CSSProperties}
        >
          <div className="mb-3 flex items-center gap-2">
            <Robot size={16} weight="duotone" className="text-brand-400" />
            <p className="text-xs font-semibold text-content-primary">Automação</p>
          </div>
          <div className="space-y-2">
            {['lead recebido', 'CRM atualizado', 'follow-up enviado'].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <span className="hero-status-led h-1.5 w-1.5 rounded-[3px] bg-emerald-400" />
                <span className="text-[10px] text-content-secondary">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div
          className="hero-float-far absolute bottom-7 right-14 z-20 w-40 rounded-2xl border border-white/[0.09] bg-black/30 p-4"
          style={{
            '--hero-float-transform': 'translate3d(0, 0, 70px) rotateZ(5deg)',
          } as CSSProperties}
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-content-muted">
            status
          </p>
          <p className="mt-1 text-sm font-semibold text-content-primary">estrutura pronta</p>
          <div className="mt-3 h-1.5 rounded-full bg-white/10">
            <div className="hero-progress h-full w-[82%] rounded-full bg-brand-500" />
          </div>
        </div>
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
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.82fr)]">
            <div className="flex max-w-2xl flex-col gap-5">
              <a
                href="/"
                className="inline-flex w-fit items-center gap-2 text-sm text-content-muted transition-colors duration-200 hover:text-brand-400"
              >
                <ArrowLeft size={14} weight="bold" />
                Voltar para a página inicial
              </a>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-400">
                Serviços digitais
              </p>
              <h1 className="font-sans text-[clamp(2rem,4.5vw,3.25rem)] font-bold leading-[1.15] tracking-[-0.02em] text-content-primary">
                Mais do que um site.
                <br />
                <span className="font-normal text-content-secondary">
                  Uma estrutura digital completa para vender e organizar.
                </span>
              </h1>
              <p className="max-w-xl text-lg leading-[1.7] text-content-secondary">
                Além de sites e landing pages, a dev.RR também entrega e-commerce,
                CRM, sistemas personalizados, soluções SaaS, tráfego pago e mídias
                digitais para redes sociais. Contrate separado ou em pacotes completos.
              </p>
              <div className="flex w-fit items-center gap-2 rounded-xl border border-brand-400/20 bg-brand-600/10 px-4 py-2.5">
                <span className="text-sm text-brand-400">👆</span>
                <p className="text-xs font-medium text-brand-300">
                  Clique em qualquer card para ver uma prévia do serviço
                </p>
              </div>
            </div>

            <ServicesHeroVisual />
          </div>

          {/* Service grid — client component handles interactivity */}
          <ServicosClient />

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
