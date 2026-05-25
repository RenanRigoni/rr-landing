import { ChatCircle, Wrench, WhatsappLogo } from '@phosphor-icons/react/dist/ssr'
import { WHATSAPP_URL } from '@/lib/constants'

const STEPS = [
  {
    number: '01',
    icon: ChatCircle,
    title: 'Você me chama no WhatsApp',
    description:
      'Me conta sobre seu negócio em até 30 minutos. Pode ser por mensagem ou ligação rápida. Você não precisa preparar nada.',
  },
  {
    number: '02',
    icon: Wrench,
    title: 'Eu faço tudo',
    description:
      'Site, Google Empresa, texto, botão de WhatsApp, imagens. Você não precisa fazer nada além de aprovar o resultado.',
  },
  {
    number: '03',
    icon: WhatsappLogo,
    title: 'Seu negócio começa a aparecer',
    description:
      'Perfil no Google ativo. Site no ar. Seus clientes te encontrando e te chamando no WhatsApp.',
  },
]

export function HowItWorks() {
  const [first, ...rest] = STEPS

  return (
    <section id="como-funciona" className="py-24 px-4 bg-surface-muted scroll-mt-24">
      <div className="max-w-5xl mx-auto flex flex-col gap-14">
        <div className="flex flex-col gap-4 max-w-xl">
          <h2 className="font-sans font-bold text-[clamp(1.875rem,4vw,3rem)] leading-[1.2] tracking-[-0.02em] text-content-primary">
            É mais simples do que parece
          </h2>
          <p className="text-lg text-content-secondary leading-[1.7]">
            Sem formulário complicado. Sem briefing de 10 páginas. Sem esperar semanas para ter uma resposta.
          </p>
        </div>

        <div className="flex flex-col gap-5">
          {/* Step 01 — featured, full-width horizontal */}
          <div className="card-border-brand p-px rounded-card">
            <div className="bg-surface-card rounded-[1.875rem] p-8 flex flex-col sm:flex-row gap-6 items-start">
              <div className="flex items-center gap-5 shrink-0">
                <span className="font-mono text-[3.5rem] font-medium leading-none text-white/[0.07]">
                  {first.number}
                </span>
                <div className="w-12 h-12 rounded-full bg-brand-600/20 ring-1 ring-brand-400/30 flex items-center justify-center shrink-0">
                  <first.icon size={24} weight="light" className="text-brand-400" />
                </div>
              </div>
              <div className="flex flex-col gap-2 pt-1">
                <h3 className="font-semibold text-lg text-content-primary leading-[1.3]">
                  {first.title}
                </h3>
                <p className="text-content-secondary leading-[1.7]">
                  {first.description}
                </p>
              </div>
            </div>
          </div>

          {/* Steps 02 & 03 — side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {rest.map((step) => (
              <div key={step.number} className="card-border p-px rounded-card">
                <div className="bg-surface-elevated rounded-[1.875rem] p-7 flex flex-col gap-5">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-full bg-brand-600/15 ring-1 ring-brand-400/20 flex items-center justify-center shrink-0">
                      <step.icon size={20} weight="light" className="text-brand-400" />
                    </div>
                    <span className="font-mono text-2xl font-medium text-white/10">
                      {step.number}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <h3 className="font-semibold text-base text-content-primary leading-[1.3]">
                      {step.title}
                    </h3>
                    <p className="text-sm text-content-secondary leading-[1.6]">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center pt-4">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 rounded-pill bg-brand-600 text-white px-7 py-4 text-base font-semibold transition-all duration-200 ease-spring hover:bg-brand-500 hover:scale-[1.02] hover:shadow-glow-sm active:scale-[0.98]"
          >
            <WhatsappLogo size={20} weight="fill" />
            Começar agora
          </a>
          <p className="text-sm text-content-muted">Sem compromisso · Respondo em até 1h</p>
        </div>
      </div>
    </section>
  )
}
