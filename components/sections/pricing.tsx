import { CheckCircle, Gift, ArrowRight, WhatsappLogo, Star } from '@phosphor-icons/react/dist/ssr'
import { PRICING_PLANS, WHATSAPP_URL } from '@/lib/constants'

export function Pricing() {
  return (
    <section id="pacotes" className="py-24 px-4 bg-surface scroll-mt-24">
      <div className="max-w-6xl mx-auto flex flex-col gap-14">
        <div className="flex flex-col gap-4 max-w-xl">
          <h2 className="font-sans font-bold text-[clamp(1.875rem,4vw,3rem)] leading-[1.2] tracking-[-0.02em] text-content-primary">
            Escolha o que faz sentido para o seu negócio agora
          </h2>
          <p className="text-lg text-content-secondary leading-[1.7]">
            Sem contrato mínimo. Sem taxa de setup. Sem surpresas. O que está aqui é o que você paga.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          {PRICING_PLANS.map((plan) => {
            if (plan.highlight) {
              return (
                <div
                  key={plan.name}
                  className="card-border-brand rounded-card p-px shadow-glow-sm"
                >
                  <div className="bg-surface-card rounded-[1.875rem] p-8 flex flex-col gap-6">
                    {plan.badge && (
                      <span className="inline-flex w-fit items-center gap-1.5 rounded-pill bg-brand-600 text-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em]">
                        <Star size={10} weight="fill" className="text-yellow-400" /> {plan.badge}
                      </span>
                    )}
                    <div className="flex flex-col gap-1">
                      <h3 className="font-semibold text-lg text-content-primary">{plan.name}</h3>
                      <p className="text-sm text-content-secondary">{plan.tagline}</p>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-sans text-base text-content-muted">R$</span>
                      <span className="font-mono font-medium text-4xl text-content-primary">{plan.price}</span>
                    </div>
                    <div className="border-t border-white/[0.10]" />
                    <ul className="flex flex-col gap-3">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-3 text-sm text-content-secondary">
                          <CheckCircle size={16} weight="fill" className="text-brand-400 shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-white/[0.05] border border-white/[0.08]">
                      <Gift size={16} weight="light" className="text-brand-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-content-secondary">
                        <span className="text-content-primary font-medium">Bônus: </span>
                        {plan.bonus}
                      </p>
                    </div>
                    <a
                      href={WHATSAPP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-center gap-2 rounded-pill bg-brand-600 text-white px-6 py-3.5 text-sm font-semibold transition-all duration-200 ease-spring hover:bg-brand-500 hover:scale-[1.02] hover:shadow-glow-sm active:scale-[0.98]"
                    >
                      <WhatsappLogo size={16} weight="fill" />
                      {plan.cta}
                      <span className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center transition-transform duration-200 ease-spring group-hover:translate-x-0.5">
                        <ArrowRight size={12} weight="bold" />
                      </span>
                    </a>
                  </div>
                </div>
              )
            }

            return (
              <div key={plan.name} className="card-border p-px rounded-card">
                <div className="bg-surface-elevated rounded-[1.875rem] p-8 flex flex-col gap-6">
                  <div className="flex flex-col gap-1">
                    <h3 className="font-semibold text-lg text-content-primary">{plan.name}</h3>
                    <p className="text-sm text-content-secondary">{plan.tagline}</p>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-sans text-base text-content-muted">R$</span>
                    <span className="font-mono font-medium text-4xl text-content-primary">{plan.price}</span>
                    {plan.period && (
                      <span className="text-sm text-content-muted ml-1">{plan.period}</span>
                    )}
                  </div>
                  <div className="border-t border-white/[0.08]" />
                  <ul className="flex flex-col gap-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-3 text-sm text-content-secondary">
                        <CheckCircle size={16} weight="fill" className="text-brand-400 shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-brand-600/10 border border-brand-400/15">
                    <Gift size={16} weight="light" className="text-brand-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-content-secondary">
                      <span className="text-content-primary font-medium">Bônus: </span>
                      {plan.bonus}
                    </p>
                  </div>
                  <a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-pill glass text-content-primary px-6 py-3.5 text-sm font-semibold transition-all duration-200 ease-spring hover:border-brand-400/30 hover:text-brand-400 hover:bg-brand-600/10"
                  >
                    <WhatsappLogo size={16} weight="fill" />
                    {plan.cta}
                  </a>
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-center text-sm text-content-muted">
          Em dúvida sobre qual pacote escolher?{' '}
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-400 font-medium hover:underline"
          >
            Me chama no WhatsApp
          </a>{' '}
          e te indico o certo em 5 minutos.
        </p>
      </div>
    </section>
  )
}
