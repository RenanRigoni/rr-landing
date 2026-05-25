import { TrendUp, WhatsappLogo, GoogleLogo, Clock } from '@phosphor-icons/react/dist/ssr'
import { WHATSAPP_URL } from '@/lib/constants'

const METRICS = [
  { label: 'Posição no Google', before: 'Não aparecia', after: 'Top 3', icon: GoogleLogo },
  { label: 'Contatos/semana WhatsApp', before: '0', after: '3–4', icon: WhatsappLogo },
  { label: 'Novos clientes no 1º mês', before: '0', after: '2 fechados', icon: TrendUp },
  { label: 'Prazo de entrega', before: 'N/A', after: '6 dias úteis', icon: Clock },
]

export function CaseStudy() {
  return (
    <section className="py-24 px-4 bg-surface">
      <div className="max-w-5xl mx-auto flex flex-col gap-12">
        <div className="flex flex-col gap-4 max-w-xl">
          <h2 className="font-sans font-bold text-[clamp(1.875rem,4vw,3rem)] leading-[1.2] tracking-[-0.02em] text-content-primary">
            De invisível a 1ª página:{' '}
            <span className="text-content-secondary">
              como uma fisioterapeuta passou a receber 3 contatos novos por semana
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Narrative */}
          <div className="flex flex-col gap-6 text-content-secondary leading-[1.7]">
            <div>
              <p className="font-semibold text-content-primary text-sm uppercase tracking-wide mb-2">
                A situação
              </p>
              <p>
                Dra. Camila tem 8 anos de experiência em fisioterapia. Sua agenda nunca ficou vazia, mas sempre dependeu de uma coisa só: indicação. Ela é boa no que faz. O problema era que quem nunca a conheceu não tinha como chegar até ela.
              </p>
            </div>

            <div>
              <p className="font-semibold text-content-primary text-sm uppercase tracking-wide mb-2">
                O problema real
              </p>
              <blockquote className="bg-brand-600/10 border border-brand-400/15 rounded-xl p-4 italic text-content-secondary">
                &ldquo;Minha concorrente abriu o consultório dois quarteirões abaixo e em seis meses estava lotada. Eu já estava lá há anos. Fui pesquisar e vi que ela aparecia na primeira página do Google. Eu nem aparecia.&rdquo;
              </blockquote>
            </div>

            <div>
              <p className="font-semibold text-content-primary text-sm uppercase tracking-wide mb-2">
                O que foi feito
              </p>
              <p>
                Pacote Presença Profissional. Uma conversa de 35 minutos. Em 6 dias úteis: Google Empresa configurado com as categorias certas, landing page com o copy que ela tinha falado na conversa, e botão de WhatsApp direto na página.
              </p>
            </div>

            <div>
              <p className="font-semibold text-content-primary text-sm uppercase tracking-wide mb-2">
                O resultado
              </p>
              <p>
                Na segunda semana, chegou o primeiro contato de alguém que ela nunca tinha visto: encontrou no Google, achou o perfil profissional, clicou no WhatsApp. Três meses depois: top 3 nas buscas e média de 3–4 contatos novos por semana.
              </p>
              <blockquote className="bg-brand-600/10 border border-brand-400/15 rounded-xl p-4 italic text-content-secondary mt-4">
                &ldquo;Agora quando alguém me pede indicação de fisioterapeuta, eu falo: pesquisa no Google. E eu apareço.&rdquo;
              </blockquote>
            </div>
          </div>

          {/* Metrics */}
          <div className="flex flex-col gap-4">
            {METRICS.map((m) => (
              <div
                key={m.label}
                className="card-border p-px rounded-2xl"
              >
                <div className="bg-surface-elevated rounded-[1rem] p-5 flex items-center gap-5">
                  <div className="w-10 h-10 rounded-full bg-brand-600/15 ring-1 ring-brand-400/20 flex items-center justify-center shrink-0">
                    <m.icon size={18} weight="light" className="text-brand-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-content-muted font-medium mb-1">{m.label}</p>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-red-400 line-through">{m.before}</span>
                      <span className="text-xs text-content-muted">→</span>
                      <span className="text-sm font-semibold text-emerald-400">{m.after}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="card-border-brand rounded-2xl p-px mt-2">
              <div className="bg-surface-card rounded-[1rem] p-5">
                <p className="text-sm font-medium text-content-muted mb-1">Pacote utilizado</p>
                <p className="font-semibold text-lg text-content-primary">Presença Profissional: R$ 1.797</p>
                <p className="text-content-secondary text-sm mt-1">Resultado visível na 2ª semana após entrega</p>
              </div>
            </div>

            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-pill glass text-content-primary px-6 py-3.5 text-sm font-semibold transition-all duration-200 ease-spring hover:border-brand-400/30 hover:text-brand-400 hover:bg-brand-600/10"
            >
              <WhatsappLogo size={16} weight="fill" />
              Quero o mesmo resultado
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
