import { listAiRuns, listActiveAiPrompts, getAiQualitySummary, getErrorCategoryBreakdown } from '@/lib/queries/ai'

const STATUS_LABEL: Record<string, string> = { pending_review: 'Aguardando revisão', reviewed: 'Revisado', error: 'Erro' }
const STATUS_COLOR: Record<string, string> = {
  pending_review: 'text-warning',
  reviewed: 'text-success',
  error: 'text-danger',
}

const CATEGORY_LABELS: Record<string, string> = {
  icp_classification: 'Classificação de ICP',
  company_size: 'Porte da empresa',
  need_interpretation: 'Interpretação da necessidade',
  timing: 'Timing',
  budget: 'Orçamento',
  contact_role: 'Cargo do contato',
  hallucinated_information: 'Informação alucinada',
  missing_context: 'Contexto insuficiente',
  wrong_recommendation: 'Recomendação errada',
  other: 'Outro',
}

export default async function AiQualityPage() {
  const [runs, prompts, qualitySummary, errorBreakdown] = await Promise.all([
    listAiRuns(),
    listActiveAiPrompts(),
    getAiQualitySummary(),
    getErrorCategoryBreakdown(),
  ])

  const total = runs.length
  const applied = runs.filter((r) => r.applied).length
  const errors = runs.filter((r) => r.status === 'error').length
  const acceptanceRate = total > 0 ? Math.round((applied / total) * 1000) / 10 : null

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-sans text-2xl font-semibold text-content-primary">Qualidade de IA</h1>
        <p className="text-sm text-content-secondary">
          Toda execução de IA é logada aqui — nada é aplicado sem revisão humana.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-white/[0.08] bg-surface-elevated p-4">
          <span className="font-mono text-[10px] uppercase tracking-wide text-content-muted">Execuções totais</span>
          <p className="font-mono text-xl text-content-primary">{total}</p>
        </div>
        <div className="rounded-lg border border-white/[0.08] bg-surface-elevated p-4">
          <span className="font-mono text-[10px] uppercase tracking-wide text-content-muted">Taxa de aceitação</span>
          <p className="font-mono text-xl text-success">{acceptanceRate !== null ? `${acceptanceRate}%` : '—'}</p>
        </div>
        <div className="rounded-lg border border-white/[0.08] bg-surface-elevated p-4">
          <span className="font-mono text-[10px] uppercase tracking-wide text-content-muted">Erros</span>
          <p className="font-mono text-xl text-danger">{errors}</p>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.15em] text-content-muted">
          Performance por versão de prompt
        </h2>
        {qualitySummary.length === 0 ? (
          <p className="text-sm text-content-secondary">Nenhum prompt com execuções ainda.</p>
        ) : (
          <div className="overflow-hidden rounded-card border border-white/[0.08]">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-elevated text-xs uppercase tracking-wide text-content-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Prompt</th>
                  <th className="px-4 py-3 font-medium">Execuções</th>
                  <th className="px-4 py-3 font-medium">Aceitação</th>
                  <th className="px-4 py-3 font-medium">Rating médio</th>
                  <th className="px-4 py-3 font-medium">Latência média</th>
                </tr>
              </thead>
              <tbody>
                {qualitySummary.map((row) => (
                  <tr key={row.prompt_id} className="border-t border-white/[0.08]">
                    <td className="px-4 py-3 text-content-primary">
                      {row.slug} <span className="text-content-muted">v{row.version}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-content-secondary">{row.total_runs}</td>
                    <td className="px-4 py-3 font-mono text-xs text-success">
                      {row.acceptance_pct !== null ? `${row.acceptance_pct}%` : '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-content-secondary">{row.avg_rating ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-content-secondary">
                      {row.avg_latency_ms ? `${row.avg_latency_ms}ms` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {errorBreakdown.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.15em] text-danger">
            Erros mais comuns (agrupados por categoria)
          </h2>
          <ul className="flex flex-col gap-1.5">
            {errorBreakdown.map((e) => (
              <li key={e.category} className="flex items-center justify-between text-sm">
                <span className="text-content-secondary">{CATEGORY_LABELS[e.category] ?? e.category}</span>
                <span className="font-mono text-content-primary">{e.count}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.15em] text-content-muted">Prompts ativos</h2>
        <div className="flex flex-wrap gap-2">
          {prompts.map((p) => (
            <span
              key={p.id}
              className="rounded-pill border border-white/[0.08] bg-surface-elevated px-3 py-1 font-mono text-xs text-content-secondary"
            >
              {p.slug} v{p.version} · {p.model}
            </span>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.15em] text-content-muted">
          Execuções recentes ({runs.length})
        </h2>
        {runs.length === 0 ? (
          <p className="text-sm text-content-secondary">Nenhuma execução de IA ainda.</p>
        ) : (
          <div className="overflow-hidden rounded-card border border-white/[0.08]">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-elevated text-xs uppercase tracking-wide text-content-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Prompt</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Aplicado</th>
                  <th className="px-4 py-3 font-medium">Tokens</th>
                  <th className="px-4 py-3 font-medium">Latência</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} className="border-t border-white/[0.08]">
                    <td className="px-4 py-3 text-content-primary">
                      {run.ai_prompts?.slug} <span className="text-content-muted">v{run.ai_prompts?.version}</span>
                    </td>
                    <td className={`px-4 py-3 ${STATUS_COLOR[run.status]}`}>{STATUS_LABEL[run.status]}</td>
                    <td className="px-4 py-3 text-content-secondary">{run.applied ? 'Sim' : 'Não'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-content-secondary">
                      {run.input_tokens ?? '—'} / {run.output_tokens ?? '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-content-secondary">
                      {run.latency_ms ? `${run.latency_ms}ms` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
