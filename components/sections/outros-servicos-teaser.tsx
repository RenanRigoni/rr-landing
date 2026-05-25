import { ArrowRight } from '@phosphor-icons/react/dist/ssr'

const PILLS = [
  'Link de bio',
  'Cardápio digital',
  'E-mail profissional',
  'Agendamento online',
  'Chatbot WhatsApp',
  'Relatório mensal',
]

export function OutrosServicosteaser() {
  return (
    <section className="py-16 px-4 bg-surface-elevated border-t border-b border-white/[0.06]">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex flex-col gap-3 max-w-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-400">
            Além dos pacotes
          </p>
          <h2 className="font-sans font-bold text-2xl md:text-3xl text-content-primary leading-snug tracking-tight">
            Precisa de algo diferente?
          </h2>
          <p className="text-sm text-content-secondary leading-relaxed">
            Cardápio digital, link de bio, agendamento online, chatbot no WhatsApp e mais. Serviços avulsos e mensais para complementar sua presença digital.
          </p>
          <div className="flex flex-wrap gap-2 mt-1">
            {PILLS.map((pill) => (
              <span
                key={pill}
                className="px-3 py-1 rounded-pill text-xs text-content-secondary bg-white/[0.05] border border-white/[0.08]"
              >
                {pill}
              </span>
            ))}
          </div>
        </div>

        <a
          href="/servicos"
          className="group shrink-0 flex items-center gap-3 rounded-pill glass px-7 py-4 text-sm font-semibold text-content-primary transition-all duration-200 ease-spring hover:border-brand-400/30 hover:text-brand-400 hover:bg-brand-600/10 whitespace-nowrap"
        >
          Ver todos os serviços
          <span className="w-7 h-7 rounded-full bg-white/[0.08] flex items-center justify-center transition-transform duration-200 ease-spring group-hover:translate-x-0.5">
            <ArrowRight size={13} weight="bold" />
          </span>
        </a>
      </div>
    </section>
  )
}
