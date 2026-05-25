import { ArrowRight, WhatsappLogo, GoogleLogo, Star, MagnifyingGlass } from '@phosphor-icons/react/dist/ssr'
import { WHATSAPP_URL, SITE_CONFIG } from '@/lib/constants'
import { CountUp } from '@/components/ui/count-up'

export function Hero() {
  return (
    <section className="relative min-h-[100dvh] flex items-center pt-28 pb-24 px-4 overflow-hidden dot-grid">
      {/* Ambient glow orbs */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true" style={{ contain: 'strict' }}>
        <div className="absolute top-[-10%] left-[-5%] w-[700px] h-[700px] rounded-full bg-brand-600/20 blur-[120px]" />
        <div className="absolute bottom-[-5%] right-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/15 blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-brand-400/5 blur-[80px]" />
      </div>

      <div className="relative max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-12 lg:gap-16 items-center">

        {/* Left: copy */}
        <div className="flex flex-col gap-6">

          {/* Terminal eyebrow */}
          <div className="inline-flex w-fit items-center gap-1.5 font-mono text-[11px] bg-white/[0.05] border border-white/[0.10] rounded-lg px-3 py-2">
            <span className="text-brand-400">~/dev.rr</span>
            <span className="text-content-muted px-0.5">$</span>
            <span className="text-content-secondary">criar-site --local --prazo 7d</span>
            <span className="inline-block w-[6px] h-[13px] bg-brand-400 ml-0.5 animate-blink" />
          </div>

          {/* H1 */}
          <h1 className="font-display font-extrabold text-[clamp(2.75rem,6vw,5.5rem)] leading-[1.04] tracking-[-0.03em] text-content-primary text-balance">
            Seu concorrente já aparece no Google.{' '}
            <span className="block text-brand-400 mt-1">
              E você?
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-[clamp(1rem,2vw,1.2rem)] text-content-secondary leading-[1.7] max-w-[46ch]">
            Crio sites profissionais, landing pages e perfis no Google para negócios locais, com foco em uma coisa só: fazer seu WhatsApp receber mais contatos.
          </p>

          {/* Deploy status strip */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {[
              { label: 'Entrega em 7 dias', color: 'bg-emerald-400' },
              { label: 'Atendo online · Brasil todo', color: 'bg-brand-400' },
              { label: 'Sem agência', color: 'bg-violet-400' },
            ].map(({ label, color }) => (
              <span key={label} className="flex items-center gap-1.5 text-xs text-content-muted font-medium">
                <span className={`w-1.5 h-1.5 rounded-full ${color}`} />
                {label}
              </span>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-center gap-2 rounded-pill bg-brand-600 text-white px-6 py-4 text-base font-semibold transition-all duration-300 ease-spring hover:bg-brand-500 hover:scale-[1.02] hover:shadow-glow-brand active:scale-[0.98]"
            >
              <WhatsappLogo size={20} weight="fill" />
              Quero mais clientes pelo WhatsApp
              <span className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center transition-transform duration-300 ease-spring group-hover:translate-x-0.5 group-hover:-translate-y-px">
                <ArrowRight size={14} weight="bold" />
              </span>
            </a>
            <a
              href="#pacotes"
              className="flex items-center justify-center gap-2 rounded-pill glass text-content-primary px-6 py-4 text-base font-semibold transition-all duration-200 ease-spring hover:border-brand-400/30 hover:text-brand-400 hover:bg-brand-600/10"
            >
              Ver pacotes e preços
            </a>
          </div>

          <p className="text-xs text-content-muted">
            Sem compromisso. Respondo em até 1 hora em dias úteis.
          </p>
        </div>

        {/* Right: floating glass result card */}
        <div className="hidden lg:block">
          <div className="animate-float relative">
            {/* Ambient glow behind card */}
            <div className="absolute -inset-6 bg-gradient-to-br from-brand-600/15 via-violet-600/8 to-transparent rounded-card blur-2xl pointer-events-none" />

            {/* Gradient-border card wrapper */}
            <div
              className="relative rounded-card p-px"
              style={{
                background:
                  'linear-gradient(135deg, rgba(37,99,235,0.5) 0%, rgba(99,102,241,0.3) 50%, rgba(255,255,255,0.06) 100%)',
              }}
            >
              <div className="bg-surface-card rounded-[1.875rem] p-7 flex flex-col gap-6">

                <p className="text-xs font-semibold text-content-muted uppercase tracking-[0.15em]">
                  Exemplo de resultado
                </p>

                {/* Google mock */}
                <div className="flex flex-col gap-3">
                  {/* Fake search bar */}
                  <div className="flex items-center gap-2 bg-white/[0.06] border border-white/[0.10] rounded-pill px-3 py-2 shadow-sm">
                    <GoogleLogo size={14} weight="fill" className="text-blue-400 shrink-0" />
                    <span className="text-xs text-content-secondary flex-1">fisioterapia {SITE_CONFIG.city}</span>
                    <MagnifyingGlass size={13} className="text-content-muted shrink-0" />
                  </div>

                  {/* Results */}
                  {[
                    'Clínica São Lucas — Fisioterapia',
                    'Clínica Reabilita — Fisioterapia',
                    'Fisioterapia Vida Plena',
                  ].map((name, i) => (
                    <div
                      key={name}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-default select-none ${
                        i === 0
                          ? 'border-brand-400/30 bg-brand-600/10'
                          : 'border-white/[0.06] bg-white/[0.025]'
                      }`}
                    >
                      <span
                        className={`text-sm font-bold w-5 shrink-0 ${
                          i === 0 ? 'text-brand-400' : 'text-content-muted'
                        }`}
                      >
                        {i + 1}
                      </span>
                      <div className="flex flex-col gap-0.5">
                        <span
                          className={`text-sm font-semibold ${
                            i === 0 ? 'text-brand-400' : 'text-content-secondary'
                          }`}
                        >
                          {name}
                        </span>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, si) => (
                            <Star
                              key={si}
                              size={10}
                              weight="fill"
                              className={i === 0 ? 'text-amber-400' : 'text-white/15'}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Divider */}
                <div className="border-t border-white/[0.08]" />

                {/* WhatsApp stat with animated counter */}
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center ring-1 ring-emerald-500/25">
                    <WhatsappLogo size={20} weight="fill" className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-content-muted">Contatos esta semana</p>
                    <p className="font-mono font-medium text-xl text-content-primary">
                      +<CountUp target={12} />
                    </p>
                  </div>
                  <span className="ml-auto text-xs font-medium text-emerald-400 bg-emerald-500/15 rounded-full px-2.5 py-1">
                    ↑ 3×
                  </span>
                </div>

                <p className="text-[11px] text-content-muted text-center">
                  Ilustrativo · Resultados variam por negócio e mercado
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  )
}
