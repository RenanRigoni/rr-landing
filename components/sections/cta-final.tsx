import { WhatsappLogo, ArrowRight } from '@phosphor-icons/react/dist/ssr'
import { WHATSAPP_URL } from '@/lib/constants'

export function CtaFinal() {
  return (
    <section className="relative py-28 px-4 bg-surface dot-grid overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true" style={{ contain: 'strict' }}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-brand-600/15 blur-[100px] rounded-full" />
      </div>

      <div className="relative max-w-3xl mx-auto flex flex-col items-center gap-8 text-center">
        <div className="flex flex-col gap-5">
          <h2 className="font-sans font-bold text-[clamp(1.875rem,4vw,3rem)] leading-[1.2] tracking-[-0.02em] text-content-primary text-balance">
            Enquanto você lê isso, alguém está pesquisando no Google pelo serviço que você oferece.
          </h2>
          <p className="text-lg text-content-secondary leading-[1.7] text-balance">
            Ele vai encontrar você, ou o seu concorrente. Cada semana sem presença digital é mais uma semana de clientes indo para quem aparece no Google.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 rounded-pill bg-brand-600 text-white px-8 py-4 text-base font-semibold transition-all duration-300 ease-spring hover:bg-brand-500 hover:scale-[1.02] hover:shadow-glow-brand active:scale-[0.98]"
          >
            <WhatsappLogo size={20} weight="fill" />
            Falar agora no WhatsApp
            <span className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center transition-transform duration-200 ease-spring group-hover:translate-x-0.5 group-hover:-translate-y-px">
              <ArrowRight size={14} weight="bold" />
            </span>
          </a>
        </div>

        <p className="text-sm text-content-muted">
          Respondo em até 1 hora em dias úteis · Sem compromisso · Só uma conversa
        </p>
      </div>
    </section>
  )
}
