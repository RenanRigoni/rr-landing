import { createClient } from '@/lib/supabase/server'

type ViewName =
  | 'v_funnel_conversion'
  | 'v_deal_stage_duration'
  | 'v_lost_reason_summary'
  | 'v_source_performance'
  | 'v_followup_health'

interface Entry {
  question: string
  view: ViewName
  sql: string
  explanation: string
}

const ENTRIES: Entry[] = [
  {
    question: 'Quantos deals alcançaram cada estágio do pipeline e qual a taxa de conversão para o próximo?',
    view: 'v_funnel_conversion',
    sql: `create view crm.v_funnel_conversion as
with stage_counts as (
  select ps.pipeline_id, ps.id as stage_id, ps.name as stage_name, ps.position,
         count(distinct dsh.deal_id) as deals_reached
  from crm.pipeline_stages ps
  left join crm.deal_stage_history dsh on dsh.to_stage_id = ps.id
  group by ps.pipeline_id, ps.id, ps.name, ps.position
)
select *,
  lead(deals_reached) over (partition by pipeline_id order by position) as next_stage_deals_reached,
  round(100.0 * lead(deals_reached) over (partition by pipeline_id order by position)
    / nullif(deals_reached, 0), 1) as conversion_to_next_pct
from stage_counts
order by pipeline_id, position;`,
    explanation:
      'Conta, por estágio, quantos deals distintos já entraram nele (via deal_stage_history, não o status atual — isso importa porque um deal pode ter passado por um estágio e já ter avançado). A função de janela lead() compara com o estágio seguinte para calcular a taxa de conversão.',
  },
  {
    question: 'Em qual estágio os deals ficam presos por mais tempo, em média?',
    view: 'v_deal_stage_duration',
    sql: `create view crm.v_deal_stage_duration as
select ps.id as stage_id, ps.name as stage_name, ps.pipeline_id, ps.position,
  count(dsh.id) as transitions_out,
  round(avg(dsh.duration_in_previous_stage_seconds) / 86400.0, 1) as avg_days,
  round((percentile_cont(0.5) within group (order by dsh.duration_in_previous_stage_seconds))::numeric / 86400.0, 1) as median_days,
  round(max(dsh.duration_in_previous_stage_seconds) / 86400.0, 1) as max_days
from crm.pipeline_stages ps
left join crm.deal_stage_history dsh
  on dsh.from_stage_id = ps.id and dsh.duration_in_previous_stage_seconds is not null
group by ps.id, ps.name, ps.pipeline_id, ps.position;`,
    explanation:
      'duration_in_previous_stage_seconds é gravado automaticamente por trigger toda vez que um deal muda de estágio — representa quanto tempo ele ficou no estágio anterior. Agregando isso por estágio, média e mediana revelam onde o processo comercial trava (bottleneck).',
  },
  {
    question: 'Quais são os principais motivos de perda de oportunidades?',
    view: 'v_lost_reason_summary',
    sql: `select label, count(*) as total
from crm.deals d
join crm.lost_reasons lr on lr.id = d.lost_reason_id
where d.status = 'lost'
group by label
order by total desc;`,
    explanation:
      'Agrupa deals perdidos pelo motivo registrado. Só é possível porque a Regra 2 do sistema torna lost_reason_id obrigatório no banco — nenhum deal chega a "perdido" sem essa informação, então essa análise nunca fica incompleta.',
  },
  {
    question: 'Quais fontes de aquisição geram os melhores resultados?',
    view: 'v_source_performance',
    sql: `create view crm.v_source_performance as
select ls.id as source_id, ls.name as source_name,
  count(d.id) as total_deals,
  count(d.id) filter (where d.status = 'won') as won_deals,
  round(100.0 * count(d.id) filter (where d.status = 'won')
    / nullif(count(d.id) filter (where d.status in ('won','lost')), 0), 1) as win_rate_pct,
  round(avg(d.value_cents) filter (where d.status = 'won')) as avg_won_value_cents
from crm.lead_sources ls
left join crm.deals d on d.source_id = ls.id
group by ls.id, ls.name;`,
    explanation:
      'Compara volume, taxa de vitória e ticket médio por canal de prospecção. Ajuda a decidir onde investir mais tempo: uma fonte com poucos deals mas win rate alto pode valer mais que uma fonte de alto volume e baixa conversão.',
  },
  {
    question: 'Quais oportunidades abertas estão sem uma próxima ação agendada?',
    view: 'v_followup_health',
    sql: `select d.id, d.title
from crm.deals d
where d.status = 'open'
  and not exists (
    select 1 from crm.activities a
    where a.deal_id = d.id and a.status = 'pending'
  );`,
    explanation:
      'Materializa a Regra 1 (todo deal ativo deveria ter próxima ação) como uma lista concreta. É a mesma lógica usada em /my-day, seção "Sem próxima ação".',
  },
]

export default async function SqlLearningPage() {
  const supabase = await createClient()
  const counts = await Promise.all(
    ENTRIES.map(async (entry) => {
      const { count } = await supabase.from(entry.view).select('*', { count: 'exact', head: true })
      return count ?? 0
    }),
  )

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-sans text-2xl font-semibold text-content-primary">SQL Learning</h1>
        <p className="text-sm text-content-secondary">
          Perguntas de negócio reais, o SQL que as responde, e por que a query funciona assim.
        </p>
      </div>

      {ENTRIES.map((entry, i) => (
        <section key={entry.view} className="flex flex-col gap-3 rounded-card border border-white/[0.08] p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-content-primary">{entry.question}</h2>
            <span className="rounded-pill bg-brand-600/15 px-3 py-1 font-mono text-[10px] uppercase tracking-wide text-brand-400">
              {counts[i]} registro{counts[i] !== 1 ? 's' : ''} agora
            </span>
          </div>
          <pre className="scrollbar-thin overflow-x-auto rounded-inner bg-surface-muted p-4 font-mono text-xs leading-relaxed text-content-secondary">
            {entry.sql}
          </pre>
          <p className="text-sm text-content-secondary">{entry.explanation}</p>
        </section>
      ))}
    </div>
  )
}
