import {
  getDemoDataCounts,
  listPipelinesWithStages,
  listAllLostReasons,
  listAllLeadSources,
  listAllQualificationCriteria,
} from '@/lib/queries/settings'
import { PurgeDemoDataButton } from '@/components/ui/PurgeDemoDataButton'

export default async function SettingsPage() {
  const [demoCounts, pipelines, lostReasons, leadSources, criteria] = await Promise.all([
    getDemoDataCounts(),
    listPipelinesWithStages(),
    listAllLostReasons(),
    listAllLeadSources(),
    listAllQualificationCriteria(),
  ])

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="font-sans text-2xl font-semibold text-content-primary">Settings</h1>
        <p className="text-sm text-content-secondary">
          Configuração operacional do CRM. Prompts de IA ficam em{' '}
          <a href="/prompt-lab" className="text-brand-400 hover:underline">
            Prompt Lab
          </a>
          .
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.15em] text-content-muted">Pipeline</h2>
        {pipelines.map((p) => (
          <div key={p.id} className="rounded-card border border-white/[0.08] p-4">
            <h3 className="mb-2 text-sm font-medium text-content-primary">
              {p.name} {p.is_default ? <span className="text-xs text-content-muted">(padrão)</span> : null}
            </h3>
            <ol className="flex flex-wrap gap-2">
              {(p.pipeline_stages ?? [])
                .sort((a, b) => a.position - b.position)
                .map((s) => (
                  <li
                    key={s.id}
                    className="rounded-pill border border-white/[0.08] bg-surface-elevated px-3 py-1 font-mono text-xs text-content-secondary"
                  >
                    {s.position}. {s.name} {s.is_won ? '(ganho)' : s.is_lost ? '(perdido)' : `${s.probability}%`}
                  </li>
                ))}
            </ol>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.15em] text-content-muted">
          Critérios de qualificação
        </h2>
        <div className="flex flex-wrap gap-2">
          {criteria.map((c) => (
            <span
              key={c.id}
              className="rounded-pill border border-white/[0.08] bg-surface-elevated px-3 py-1 font-mono text-xs text-content-secondary"
            >
              {c.label} · peso {c.weight}
            </span>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-8">
        <section className="flex flex-col gap-3">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.15em] text-content-muted">Motivos de perda</h2>
          <ul className="flex flex-col gap-1">
            {lostReasons.map((r) => (
              <li key={r.id} className="text-sm text-content-secondary">
                {r.label} <span className="font-mono text-[10px] text-content-muted">({r.category})</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.15em] text-content-muted">
            Fontes de aquisição
          </h2>
          <ul className="flex flex-col gap-1">
            {leadSources.map((s) => (
              <li key={s.id} className="text-sm text-content-secondary">
                {s.name}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.15em] text-danger">Dados de demonstração</h2>
        <p className="text-sm text-content-secondary">
          Remove permanentemente qualquer registro marcado como demo (is_demo=true). Nunca afeta configuração real
          (pipeline, motivos de perda, critérios de qualificação, prompts de IA, fontes de lead).
        </p>
        <PurgeDemoDataButton counts={demoCounts} />
      </section>
    </div>
  )
}
