import type { Metadata } from 'next'
import { ArrowLeft, WhatsappLogo } from '@phosphor-icons/react/dist/ssr'
import { Navbar } from '@/components/sections/navbar'
import { Footer } from '@/components/sections/footer'
import { WhatsappFloat } from '@/components/ui/whatsapp-float'
import { ServicosClient } from '@/components/sections/servicos-client'
import { WHATSAPP_URL, SITE_CONFIG } from '@/lib/constants'

export const metadata: Metadata = {
  title: `Outros Serviços Digitais para Negócios Locais | dev.RR`,
  description: `Cardápio digital, link de bio, e-mail profissional, agendamento online, chatbot WhatsApp e mais. Serviços avulsos e mensais da dev.RR para ${SITE_CONFIG.city} e todo o Brasil.`,
  alternates: { canonical: '/servicos' },
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
            <div className="flex items-center gap-2 bg-brand-600/10 border border-brand-400/20 rounded-xl px-4 py-2.5 w-fit">
              <span className="text-brand-400 text-sm">👆</span>
              <p className="text-brand-300 text-xs font-medium">
                Clique em qualquer card para ver uma prévia do serviço
              </p>
            </div>
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
