import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getProcessDoc, listProcessFeedback, getFollowupProcessGap } from '@/lib/queries/processes'
import { ProcessFeedbackForm } from '@/components/processes/ProcessFeedbackForm'

const TYPE_LABELS: Record<string, string> = {
  friction: 'Dificuldade',
  idea: 'Sugestão',
  win: 'Funcionou bem',
  bug: 'Problema no CRM',
}

interface ProcessDetailPageProps {
  params: Promise<{ slug: string }>
}

export default async function ProcessDetailPage({ params }: ProcessDetailPageProps) {
  const { slug } = await params
  const process = await getProcessDoc(slug)
  if (!process) notFound()

  const [feedback, followupGap] = await Promise.all([
    listProcessFeedback(process.id),
    slug === 'cadencia-de-followup' ? getFollowupProcessGap() : Promise.resolve(null),
  ])

  const steps = Array.isArray(process.steps) ? (process.steps as string[]) : []

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-sans text-2xl font-semibold text-content-primary">{process.title}</h1>
        <p className="text-sm text-content-secondary">{process.objective}</p>
        {process.last_reviewed_at ? (
          <p className="mt-1 font-mono text-[11px] text-content-muted">
            Última revisão: {format(new Date(process.last_reviewed_at), 'dd/MM/yyyy', { locale: ptBR })}
          </p>
        ) : null}
      </div>

      {followupGap && followupGap.observedPct !== null ? (
        <section className="flex flex-col gap-2 rounded-card border border-warning/20 bg-warning/5 p-5">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.15em] text-warning">
            Rastreabilidade — Desenhado vs. Observado
          </h2>
          <p className="text-sm text-content-primary">
            Esperado: <span className="font-mono">{followupGap.expectedPct}%</span> dos deals abertos com próxima ação.
            Observado: <span className="font-mono">{followupGap.observedPct}%</span> ({followupGap.withNextAction}/
            {followupGap.total} deals abertos).
          </p>
          {followupGap.expectedPct - followupGap.observedPct > 0 ? (
            <p className="text-xs text-content-secondary">
              Gap: {Math.round((followupGap.expectedPct - followupGap.observedPct) * 10) / 10} pontos percentuais.
              Interpretação possível: parte das oportunidades abertas está sem próxima ação agendada — verifique{' '}
              <a href="/my-day" className="text-brand-400 hover:underline">
                Meu Dia
              </a>
              .
            </p>
          ) : null}
        </section>
      ) : null}

      <div className="grid grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.15em] text-content-muted">AS-IS (hoje)</h2>
          <p className="text-sm text-content-secondary">{process.as_is_content}</p>
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.15em] text-brand-400">TO-BE (proposto)</h2>
          <p className="text-sm text-content-secondary">{process.to_be_content}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 text-sm">
        <div>
          <h3 className="mb-1 font-mono text-[10px] uppercase tracking-wide text-content-muted">Gatilho</h3>
          <p className="text-content-secondary">{process.trigger_description}</p>
        </div>
        <div>
          <h3 className="mb-1 font-mono text-[10px] uppercase tracking-wide text-content-muted">Entradas</h3>
          <p className="text-content-secondary">{process.inputs}</p>
        </div>
        <div>
          <h3 className="mb-1 font-mono text-[10px] uppercase tracking-wide text-content-muted">Responsável</h3>
          <p className="text-content-secondary">{process.responsible}</p>
        </div>
        <div>
          <h3 className="mb-1 font-mono text-[10px] uppercase tracking-wide text-content-muted">Sistemas envolvidos</h3>
          <p className="text-content-secondary">{process.systems_involved}</p>
        </div>
        <div>
          <h3 className="mb-1 font-mono text-[10px] uppercase tracking-wide text-content-muted">Output esperado</h3>
          <p className="text-content-secondary">{process.expected_output}</p>
        </div>
        <div>
          <h3 className="mb-1 font-mono text-[10px] uppercase tracking-wide text-content-muted">KPIs</h3>
          <p className="text-content-secondary">{process.kpis}</p>
        </div>
      </div>

      {steps.length > 0 ? (
        <div>
          <h2 className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-content-muted">Passos</h2>
          <ol className="flex list-inside list-decimal flex-col gap-1.5 text-sm text-content-secondary">
            {steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      ) : null}

      {process.decision_points ? (
        <div>
          <h2 className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-content-muted">
            Pontos de decisão
          </h2>
          <p className="text-sm text-content-secondary">{process.decision_points}</p>
        </div>
      ) : null}

      {process.known_exceptions ? (
        <div>
          <h2 className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-content-muted">
            Exceções conhecidas
          </h2>
          <p className="text-sm text-content-secondary">{process.known_exceptions}</p>
        </div>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.15em] text-content-muted">
          Feedback operacional ({feedback.length})
        </h2>
        {feedback.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {feedback.map((f) => (
              <li key={f.id} className="rounded-inner border border-white/[0.08] bg-surface-elevated px-3 py-2 text-sm">
                <span className="font-mono text-[10px] uppercase tracking-wide text-content-muted">
                  {TYPE_LABELS[f.feedback_type]}
                </span>
                <p className="text-content-secondary">{f.content}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-content-secondary">Nenhum feedback registrado ainda.</p>
        )}
        <ProcessFeedbackForm processSlug={slug} processId={process.id} />
      </section>
    </div>
  )
}
