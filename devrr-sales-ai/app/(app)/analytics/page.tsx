import { redirect } from 'next/navigation'
import { getCurrentOrg } from '@/lib/queries/orgs'
import { getAnalyticsData } from '@/lib/queries/analytics'
import {
  computeForecast,
  computeFunnel,
  computeKpis,
  formatCompactBRL,
  formatPercent,
  groupPerformance,
  leadsCreatedInPeriod,
  lostReasonRanking,
  monthlySeries,
  resolvePeriod,
  scoreVsProgress,
  stalledOpportunities,
  type GroupPerformance,
} from '@/lib/domain/analytics'
import { AnalyticsCard, StatTile } from '@/components/analytics/AnalyticsCard'
import { BarList, type BarListRow } from '@/components/analytics/BarList'
import { MonthlyColumns } from '@/components/analytics/MonthlyColumns'
import { PeriodFilter } from '@/components/analytics/PeriodFilter'

interface AnalyticsPageProps {
  searchParams: Promise<{ periodo?: string }>
}

function performanceRows(groups: GroupPerformance[]): BarListRow[] {
  return groups.map((g) => ({
    label: g.label,
    value: g.leads,
    valueLabel: String(g.leads),
    detail: g.won > 0 ? `${g.won} ganho${g.won > 1 ? 's' : ''}` : undefined,
    tooltip: `${g.leads} leads · ${g.won} ganhos · conversão ${formatPercent(g.winRate)} · aberto ${formatCompactBRL(g.openCents)}`,
  }))
}

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const org = await getCurrentOrg()
  if (!org) redirect('/onboarding')

  const params = await searchParams
  const period = resolvePeriod(params.periodo)
  const now = new Date()
  const { leads, stages } = await getAnalyticsData()

  const periodLeads = leadsCreatedInPeriod(leads, now, period.days)
  const kpis = computeKpis(leads, now, period.days)
  const funnel = computeFunnel(periodLeads, stages)
  const months = monthlySeries(leads, now, period.days === null ? 12 : 6, org.timezone)
  const bySource = groupPerformance(periodLeads, (l) => l.source)
  const byService = groupPerformance(periodLeads, (l) => l.interest)
  const byCity = groupPerformance(periodLeads, (l) => l.city)
  const lostReasons = lostReasonRanking(periodLeads)
  const stalled = stalledOpportunities(leads)
  const scoreBuckets = scoreVsProgress(periodLeads, stages)
  // Sem filtro de período — mesma leitura do cabeçalho do /pipeline (D-046: uma fonte só).
  const forecast = computeForecast(leads, stages)
  const periodText = period.days === null ? 'desde o início' : `nos últimos ${period.label}`

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-content-primary">Analytics</h1>
          <p className="mt-1 text-sm text-content-secondary">
            {org.name} · leads criados {periodText}
          </p>
        </div>
        <PeriodFilter current={period.value} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Receita ganha" value={formatCompactBRL(kpis.wonCents)} detail={`${kpis.wonCount} negócios fechados`} emphasis />
        <StatTile label="Leads no período" value={String(kpis.leadsInPeriod)} />
        <StatTile
          label="Em negociação agora"
          value={formatCompactBRL(kpis.negotiationCents)}
          detail={`${kpis.negotiationCount} em proposta ou negociação`}
        />
        <StatTile label="Taxa de conversão" value={formatPercent(kpis.winRate)} detail="ganhos ÷ fechados" />
        <StatTile
          label="Ciclo médio de venda"
          value={kpis.avgCycleDays === null ? '—' : `${kpis.avgCycleDays} dias`}
          detail="do cadastro ao ganho"
        />
        <StatTile
          label="Previsão ponderada"
          value={formatCompactBRL(forecast.weightedCents)}
          detail={`de ${formatCompactBRL(forecast.openCents)} em aberto`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <AnalyticsCard title="Evolução mensal" subtitle={`Últimos ${months.length} meses`}>
          <MonthlyColumns points={months} />
        </AnalyticsCard>

        <AnalyticsCard title="Funil de conversão" subtitle="Quantos leads do período chegaram a cada etapa">
          <BarList
            rows={funnel.map((step) => ({
              label: step.label,
              value: step.count,
              valueLabel: String(step.count),
              detail: step.rateFromPrevious === null ? undefined : `${formatPercent(step.rateFromPrevious)} da etapa anterior`,
              tooltip: `${step.count} leads chegaram em ${step.label}`,
            }))}
          />
        </AnalyticsCard>
      </div>

      <AnalyticsCard title="Previsão por etapa" subtitle="Valor em aberto × probabilidade de cada etapa">
        <BarList
          rows={forecast.byStage.map((stage) => ({
            label: stage.label,
            value: stage.weightedCents,
            valueLabel: formatCompactBRL(stage.weightedCents),
            detail: `${stage.probability}% de ${formatCompactBRL(stage.openCents)}`,
            tooltip: `${stage.count} leads · aberto ${formatCompactBRL(stage.openCents)} · ponderado ${formatCompactBRL(stage.weightedCents)}`,
          }))}
        />
      </AnalyticsCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <AnalyticsCard title="Leads por origem" subtitle="De onde vêm os leads e quantos viram negócio">
          <BarList rows={performanceRows(bySource)} />
        </AnalyticsCard>
        <AnalyticsCard title="Serviços mais procurados" subtitle="Interesse declarado de cada lead">
          <BarList rows={performanceRows(byService)} />
        </AnalyticsCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <AnalyticsCard title="Oportunidades paradas" subtitle="Situação atual do pipeline">
          <div className="space-y-3">
            <StatTile
              label="Proposta enviada sem resposta"
              value={formatCompactBRL(stalled.awaitingReply.cents)}
              detail={`${stalled.awaitingReply.count} leads aguardando retorno`}
            />
            <StatTile
              label="Qualificados sem proposta"
              value={formatCompactBRL(stalled.awaitingProposal.cents)}
              detail={`${stalled.awaitingProposal.count} leads esperando orçamento`}
            />
          </div>
        </AnalyticsCard>

        <AnalyticsCard title="Motivos de perda" subtitle="Leads do período encerrados como perdidos">
          <BarList
            barClassName="bg-chart-2"
            emptyLabel="Nenhuma perda no período."
            rows={lostReasons.map((r) => ({ label: r.label, value: r.count, valueLabel: String(r.count), tooltip: `${r.count}× ${r.label}` }))}
          />
        </AnalyticsCard>

        <AnalyticsCard title="Leads por cidade">
          <BarList rows={performanceRows(byCity)} barClassName="bg-chart-3" />
        </AnalyticsCard>
      </div>

      <AnalyticsCard
        title="Presença digital × avanço no funil"
        subtitle="Leads com dossiê, agrupados pelo score digital: quantos chegaram até a proposta"
      >
        <BarList
          max={100}
          emptyLabel="Nenhum lead com dossiê no período."
          rows={scoreBuckets.map((bucket) => ({
            label: `${bucket.label} (${bucket.range})`,
            value: bucket.reachedProposalRate === null ? 0 : bucket.reachedProposalRate * 100,
            valueLabel: formatPercent(bucket.reachedProposalRate),
            detail: `${bucket.leads} leads`,
            tooltip: `${bucket.leads} leads com score ${bucket.range} · ${formatPercent(bucket.reachedProposalRate)} chegaram à proposta`,
          }))}
        />
      </AnalyticsCard>
    </div>
  )
}
