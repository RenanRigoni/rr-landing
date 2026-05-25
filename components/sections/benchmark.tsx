import { TrendUp, XCircle, CheckCircle } from '@phosphor-icons/react/dist/ssr'

const ROWS = [
  {
    metric: 'Visitas ao site por mês',
    withoutValue: 'Muito baixo',
    withoutBar: 14,
    withValue: '4× mais',
    withBar: 100,
  },
  {
    metric: 'Taxa de conversão de visitas em contatos',
    withoutValue: '1,8%',
    withoutBar: 40,
    withValue: '4,5%',
    withBar: 100,
  },
  {
    metric: 'Buscas locais que viram contato em 24h',
    withoutValue: 'Quase zero',
    withoutBar: 6,
    withValue: '76% das buscas',
    withBar: 100,
  },
  {
    metric: 'Ações mensais (ligações + rotas + site)',
    withoutValue: '~15/mês',
    withoutBar: 18,
    withValue: '~81/mês',
    withBar: 100,
  },
]

const SOURCES = [
  { label: 'Birdeye', url: 'https://birdeye.com/blog/state-of-google-business-profiles/' },
  { label: 'SQ Magazine', url: 'https://www.contentbycass.com/blog/75-google-business-profile-stats-2025' },
  { label: 'Safari Digital', url: 'https://searchendurance.com/google-business-profile-statistics/' },
  { label: 'SEO Sherpa', url: 'https://seosherpa.com/landing-page-statistics/' },
]

export function Benchmark() {
  return (
    <section className="py-24 px-4 bg-surface-muted">
      <div className="max-w-5xl mx-auto flex flex-col gap-14">

        {/* Header */}
        <div className="flex flex-col gap-4 max-w-2xl">
          <span className="inline-flex w-fit items-center gap-2 rounded-pill bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em]">
            <TrendUp size={12} weight="bold" />
            Dados reais · Fontes verificadas
          </span>
          <h2 className="font-sans font-bold text-[clamp(1.875rem,4vw,3rem)] leading-[1.2] tracking-[-0.02em] text-content-primary">
            O que os números dizem sobre presença digital
          </h2>
          <p className="text-lg text-content-secondary leading-[1.7]">
            Não é opinião: é o que estudos com milhares de negócios mostram. A diferença entre aparecer e não aparecer no Google é mensurável.
          </p>
        </div>

        {/* Editorial stat block */}
        <div className="card-border-brand rounded-card p-px">
          <div className="bg-surface-card rounded-[1.875rem] p-8 md:p-10 flex flex-col gap-6">
            <p className="text-xl md:text-2xl font-semibold text-content-primary leading-[1.5] max-w-3xl">
              Negócios com perfil Google otimizado geram{' '}
              <span className="font-mono text-brand-400">4×</span> mais visitas ao site,
              convertem{' '}
              <span className="font-mono text-brand-400">2,5×</span> mais visitantes em contatos,
              e{' '}
              <span className="font-mono text-emerald-400">76%</span> das buscas locais resultam
              em ligação ou visita em menos de 24 horas.
            </p>
            <div className="flex flex-wrap gap-x-5 gap-y-1 pt-4 border-t border-white/[0.06]">
              <span className="text-[11px] text-content-muted">Fontes:</span>
              {[
                { label: 'Birdeye', url: 'https://birdeye.com/blog/state-of-google-business-profiles/' },
                { label: 'SQ Magazine', url: 'https://www.contentbycass.com/blog/75-google-business-profile-stats-2025' },
                { label: 'Safari Digital', url: 'https://searchendurance.com/google-business-profile-statistics/' },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-content-muted hover:text-brand-400 transition-colors duration-200 underline underline-offset-2"
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Visual comparison */}
        <div className="flex flex-col gap-6">
          <h3 className="font-semibold text-lg text-content-primary">
            Comparativo: com vs. sem presença digital estruturada
          </h3>

          {/* Desktop column headers */}
          <div className="hidden md:grid grid-cols-[1fr_200px_200px] gap-4 items-center px-1">
            <div />
            <div className="flex items-center gap-2">
              <XCircle size={14} weight="fill" className="text-red-400 shrink-0" />
              <span className="text-xs font-semibold text-red-400 uppercase tracking-wide">Sem presença</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={14} weight="fill" className="text-emerald-400 shrink-0" />
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Com Google + Site</span>
            </div>
          </div>

          {/* Desktop rows */}
          <div className="hidden md:flex flex-col gap-3">
            {ROWS.map((row) => (
              <div
                key={row.metric}
                className="grid grid-cols-[1fr_200px_200px] gap-4 items-center p-5 rounded-2xl bg-surface-elevated border border-white/[0.06]"
              >
                <p className="text-sm font-medium text-content-secondary">{row.metric}</p>

                <div className="flex flex-col gap-1.5">
                  <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-red-500/40"
                      style={{ width: `${row.withoutBar}%` }}
                    />
                  </div>
                  <span className="text-xs text-red-400 font-medium">{row.withoutValue}</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500"
                      style={{ width: `${row.withBar}%` }}
                    />
                  </div>
                  <span className="text-xs text-emerald-400 font-medium">{row.withValue}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile rows: stacked */}
          <div className="md:hidden flex flex-col gap-3">
            {ROWS.map((row) => (
              <div key={row.metric} className="bg-surface-elevated border border-white/[0.06] rounded-2xl p-5 flex flex-col gap-4">
                <p className="text-sm font-medium text-content-secondary">{row.metric}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <XCircle size={11} weight="fill" className="text-red-400 shrink-0" />
                      <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wide">Sem presença</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-red-500/40"
                        style={{ width: `${row.withoutBar}%` }}
                      />
                    </div>
                    <span className="text-xs text-red-400 font-medium">{row.withoutValue}</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle size={11} weight="fill" className="text-emerald-400 shrink-0" />
                      <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wide">Com Google + Site</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500"
                        style={{ width: `${row.withBar}%` }}
                      />
                    </div>
                    <span className="text-xs text-emerald-400 font-medium">{row.withValue}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Source attribution */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 border-t border-white/[0.06]">
          <span className="text-xs text-content-muted">Fontes:</span>
          {SOURCES.map((s) => (
            <a
              key={s.label}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-content-muted hover:text-brand-400 transition-colors duration-200 underline underline-offset-2"
            >
              {s.label}
            </a>
          ))}
        </div>

      </div>
    </section>
  )
}
