import { XCircle } from '@phosphor-icons/react/dist/ssr'

const PAINS = [
  'Seu cliente pesquisa "clínica perto de mim" e encontra seu concorrente, não você.',
  'Você não tem site, ou tem um que parece abandonado desde 2017.',
  'Tentou criar no Wix mas ficou pela metade. Ou pagou barato e ficou envergonhado.',
  'Recebe indicações, mas elas estão secando. Quer novos clientes, não só quem já te conhece.',
  'Toda vez que alguém pesquisa seu serviço na sua cidade, você perde para quem tem presença digital.',
]

export function Problem() {
  return (
    <section className="py-24 px-4 bg-surface-muted">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col gap-12">
          <div className="flex flex-col gap-4">
            <span className="inline-flex w-fit items-center rounded-pill bg-red-500/15 text-red-400 border border-red-500/20 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em]">
              O problema
            </span>
            <h2 className="font-sans font-bold text-[clamp(1.875rem,4vw,3rem)] leading-[1.2] tracking-[-0.02em] text-content-primary text-balance">
              Você é bom no que faz.{' '}
              <span className="text-content-secondary">
                O problema é que seu cliente não te encontra.
              </span>
            </h2>
            <p className="text-lg text-content-secondary leading-[1.7] max-w-[55ch]">
              Pensa no que acontece quando alguém pesquisa{' '}
              <em>&ldquo;[seu serviço] perto de mim&rdquo;</em> agora mesmo. Quem aparece?
              Seu concorrente (que talvez nem seja tão bom quanto você).
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {PAINS.map((pain) => (
              <div
                key={pain}
                className="flex items-start gap-4 p-5 bg-surface-elevated border border-white/[0.06] rounded-2xl"
              >
                <XCircle size={20} weight="fill" className="text-red-400 shrink-0 mt-0.5" />
                <p className="text-content-secondary leading-[1.6]">{pain}</p>
              </div>
            ))}
          </div>

          <div className="card-border-brand rounded-2xl p-px">
            <div className="bg-surface-card rounded-[1rem] p-8">
              <p className="text-xl font-semibold text-content-primary leading-[1.5]">
                A boa notícia: isso tem solução. E é mais simples do que você imagina.
              </p>
              <p className="text-content-secondary mt-2 text-base">
                Você não precisa de agência. Não precisa aprender tecnologia. Precisa de alguém que faça por você.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
