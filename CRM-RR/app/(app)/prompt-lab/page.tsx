import { listPromptGroups, listComparisons } from '@/lib/queries/prompt-lab'
import { NewPromptVersionForm } from '@/components/prompt-lab/NewPromptVersionForm'
import { PromptComparisonTool } from '@/components/prompt-lab/PromptComparisonTool'
import { ActivateVersionButton } from '@/components/prompt-lab/ActivateVersionButton'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default async function PromptLabPage() {
  const [groups, comparisons] = await Promise.all([listPromptGroups(), listComparisons()])

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="font-sans text-2xl font-semibold text-content-primary">Prompt Lab</h1>
        <p className="text-sm text-content-secondary">
          Prompts nunca são sobrescritos — cada mudança é uma nova versão. Compare antes de ativar.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.15em] text-content-muted">Versões existentes</h2>
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <div key={group.slug} className="rounded-card border border-white/[0.08] p-4">
              <h3 className="mb-2 font-medium text-content-primary">{group.slug}</h3>
              <div className="flex flex-col gap-2">
                {group.versions.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between rounded-inner border border-white/[0.08] bg-surface-elevated px-3 py-2"
                  >
                    <div>
                      <span className="font-mono text-xs text-content-primary">v{v.version}</span>{' '}
                      <span className="text-xs text-content-secondary">{v.title}</span>
                      {v.notes ? <span className="ml-2 text-[11px] text-content-muted">— {v.notes}</span> : null}
                    </div>
                    {v.is_active ? (
                      <span className="rounded-pill bg-success/15 px-2 py-0.5 font-mono text-[10px] uppercase text-success">
                        ativa
                      </span>
                    ) : (
                      <ActivateVersionButton promptId={v.id} slug={group.slug} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.15em] text-content-muted">Comparar versões</h2>
        <PromptComparisonTool groups={groups} />
      </section>

      {comparisons.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.15em] text-content-muted">
            Comparações anteriores
          </h2>
          <ul className="flex flex-col gap-2">
            {comparisons.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-inner border border-white/[0.08] bg-surface-elevated px-3 py-2 text-xs"
              >
                <span className="text-content-secondary">
                  {c.prompt_a?.slug} v{c.prompt_a?.version} vs v{c.prompt_b?.version} —{' '}
                  {format(new Date(c.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                </span>
                <span className="font-mono text-content-primary">
                  {c.winner ? `Vencedor: ${c.winner.toUpperCase()}` : 'Sem vencedor registrado'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.15em] text-content-muted">Nova versão</h2>
        <NewPromptVersionForm groups={groups} />
      </section>
    </div>
  )
}
