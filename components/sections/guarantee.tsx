import { ShieldCheck } from '@phosphor-icons/react/dist/ssr'

export function Guarantee() {
  return (
    <section className="py-20 px-4 bg-surface-muted">
      <div className="max-w-3xl mx-auto">
        <div
          className="card-border-brand rounded-card p-px"
        >
          <div className="bg-surface-card rounded-[1.875rem] p-10 flex flex-col md:flex-row gap-8 items-start">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/25 flex items-center justify-center shrink-0">
              <ShieldCheck size={32} weight="light" className="text-emerald-400" />
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <h2 className="font-sans font-bold text-2xl text-content-primary leading-[1.2]">
                  Se não ficar bom, você não paga.
                </h2>
              </div>

              <p className="text-content-secondary leading-[1.7]">
                Você recebe o site, mostra para quem quiser, usa por até{' '}
                <strong className="text-content-primary">7 dias</strong>. Se por qualquer motivo não
                ficar satisfeito com a qualidade e profissionalismo do resultado, devolvemos{' '}
                <strong className="text-content-primary">100% do valor</strong>. Sem burocracia,
                sem justificativa, sem formulário complicado. Uma mensagem no WhatsApp resolve.
              </p>

              <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                <p className="text-sm font-semibold text-content-primary mb-1">
                  Pacote Parceria Digital: Garantia extra de 90 dias
                </p>
                <p className="text-sm text-content-secondary">
                  Se em 90 dias você não estiver recebendo mais contatos pelo WhatsApp ou aparecendo melhor no Google, trabalho mais 30 dias gratuitamente até isso acontecer.
                </p>
              </div>

              <p className="text-sm text-content-muted italic">
                Por que ofereço isso? Porque confio no trabalho. E porque não quero clientes insatisfeitos.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
