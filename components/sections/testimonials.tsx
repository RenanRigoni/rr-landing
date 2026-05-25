import { Quotes, Star } from '@phosphor-icons/react/dist/ssr'

const TESTIMONIALS = [
  {
    text: 'Antes eu dependia só de indicação. Hoje apareço na primeira página do Google para fisioterapia na minha cidade. Recebi 3 novos contatos na primeira semana. Valeu cada centavo.',
    name: 'Dra. Camila S.',
    business: 'Clínica de Fisioterapia',
    city: 'Patrocínio/MG',
    initials: 'CS',
  },
  {
    text: 'Achei que ia ser complicado, mas foi uma conversa de meia hora e em 6 dias o site estava no ar. Profissional, claro e com o botão do WhatsApp bem visível. Meus clientes adoraram.',
    name: 'Rodrigo M.',
    business: 'Eletricista Autônomo',
    city: 'Patrocínio/MG',
    initials: 'RM',
  },
  {
    text: 'Paguei quase o mesmo que uma agência cobrou só para fazer o orçamento. Aqui saí com site, Google Empresa configurado e ainda tive suporte por 30 dias. Recomendo sem hesitar.',
    name: 'Ana Paula F.',
    business: 'Salão de Beleza',
    city: 'Patrocínio/MG',
    initials: 'AP',
  },
]

export function Testimonials() {
  const [featured, ...rest] = TESTIMONIALS

  return (
    <section id="depoimentos" className="py-24 px-4 bg-surface-muted scroll-mt-24">
      <div className="max-w-6xl mx-auto flex flex-col gap-14">
        <div className="flex flex-col gap-4 max-w-xl">
          <h2 className="font-sans font-bold text-[clamp(1.875rem,4vw,3rem)] leading-[1.2] tracking-[-0.02em] text-content-primary">
            O que donos de negócios locais estão dizendo
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Featured testimonial */}
          <div className="card-border md:col-span-2 p-px rounded-card">
            <div className="bg-surface-elevated rounded-[1.875rem] p-7 md:p-10 flex flex-col md:flex-row gap-6 md:gap-12">
              <div className="flex flex-col gap-4 flex-1">
                <Quotes size={32} weight="fill" className="text-brand-400/30" />
                <p className="text-content-secondary leading-[1.8] italic text-base md:text-lg">
                  &ldquo;{featured.text}&rdquo;
                </p>
              </div>
              <div className="flex flex-col justify-end gap-3 md:w-52 shrink-0">
                <div className="border-t border-white/[0.08] md:border-t-0 pt-4 md:pt-0">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-brand-600 flex items-center justify-center shrink-0 ring-2 ring-white/10">
                      <span className="text-white text-xs font-semibold">{featured.initials}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-content-primary">{featured.name}</p>
                      <p className="text-xs text-content-muted">
                        {featured.business} · {featured.city}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-0.5 mt-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={13} weight="fill" className="text-amber-400" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Standard testimonials */}
          {rest.map((t) => (
            <div
              key={t.name}
              className="card-border p-px rounded-card"
            >
              <div className="bg-surface-elevated rounded-[1.875rem] p-7 flex flex-col gap-5 h-full">
                <Quotes size={28} weight="fill" className="text-brand-400/30" />
                <p className="text-content-secondary leading-[1.7] text-sm flex-1 italic">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="border-t border-white/[0.08] pt-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center shrink-0 ring-2 ring-white/10">
                      <span className="text-white text-xs font-semibold">{t.initials}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-content-primary">{t.name}</p>
                      <p className="text-xs text-content-muted">
                        {t.business} · {t.city}
                      </p>
                    </div>
                    <div className="ml-auto flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={12} weight="fill" className="text-amber-400" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-content-muted">
          * Depoimentos reais de clientes. Nomes usados com autorização.
        </p>
      </div>
    </section>
  )
}
