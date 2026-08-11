import { createClient } from '@/lib/supabase/server'
import { calcStageConversion } from '@/lib/domain/conversion'

export interface DashboardKpis {
  activeDeals: number
  pipelineValueCents: number
  wonValueCents: number
  lostValueCents: number
  winRatePct: number | null
  avgDealValueCents: number | null
}

export async function getDashboardKpis(): Promise<DashboardKpis> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('deals').select('status, value_cents')
  if (error) throw new Error(error.message)

  const rows = data ?? []
  const active = rows.filter((d) => d.status === 'open')
  const won = rows.filter((d) => d.status === 'won')
  const lost = rows.filter((d) => d.status === 'lost')

  const pipelineValueCents = active.reduce((sum, d) => sum + d.value_cents, 0)
  const wonValueCents = won.reduce((sum, d) => sum + d.value_cents, 0)
  const lostValueCents = lost.reduce((sum, d) => sum + d.value_cents, 0)
  const closedCount = won.length + lost.length

  return {
    activeDeals: active.length,
    pipelineValueCents,
    wonValueCents,
    lostValueCents,
    winRatePct: closedCount > 0 ? Math.round((won.length / closedCount) * 1000) / 10 : null,
    avgDealValueCents: won.length > 0 ? Math.round(wonValueCents / won.length) : null,
  }
}

export async function getFunnelConversion(pipelineId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('v_funnel_conversion')
    .select('*')
    .eq('pipeline_id', pipelineId)
    .order('position', { ascending: true })
  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => ({
    ...row,
    conversion_to_next_pct: calcStageConversion(row.deals_reached, row.next_stage_deals_reached ?? 0),
  }))
}

export async function getStageDuration(pipelineId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('v_deal_stage_duration')
    .select('*')
    .eq('pipeline_id', pipelineId)
    .order('position', { ascending: true })
  if (error) throw new Error(error.message)
  return data
}

export async function getLostReasonSummary() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('v_lost_reason_summary').select('*')
  if (error) throw new Error(error.message)
  return data
}

export async function getSourcePerformance() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('v_source_performance')
    .select('*')
    .order('total_deals', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

export interface BottleneckInsight {
  data: string
  interpretation: string
}

type StageDurationRow = Awaited<ReturnType<typeof getStageDuration>>[number]
type LostReasonRow = Awaited<ReturnType<typeof getLostReasonSummary>>[number]
type FollowupHealthCounts = Awaited<ReturnType<typeof getFollowupHealthSummary>>

/**
 * Identifica possíveis gargalos a partir de dados já carregados (a página que
 * chama já buscou essas 3 fontes para outros gráficos — não refaz queries).
 * Cada insight separa DADO (fato observado) de INTERPRETAÇÃO (hipótese, nunca
 * afirmação categórica) — seção 11 da spec.
 */
export function getBottleneckInsights(
  stageDuration: StageDurationRow[],
  followupHealth: FollowupHealthCounts,
  lostReasons: LostReasonRow[],
): BottleneckInsight[] {
  const insights: BottleneckInsight[] = []

  const withAvg = stageDuration.filter((s) => s.avg_days !== null && s.avg_days > 0)
  if (withAvg.length >= 2) {
    const avgOfAll = withAvg.reduce((sum, s) => sum + (s.avg_days ?? 0), 0) / withAvg.length
    const slowest = withAvg.reduce((max, s) => ((s.avg_days ?? 0) > (max.avg_days ?? 0) ? s : max))
    const ratio = avgOfAll > 0 ? (slowest.avg_days ?? 0) / avgOfAll : 0
    if (ratio >= 1.5) {
      insights.push({
        data: `Tempo médio no estágio "${slowest.stage_name}" é ${slowest.avg_days} dias, contra uma média de ${Math.round(avgOfAll * 10) / 10} dias nos demais estágios com dados.`,
        interpretation: `Esse estágio pode ser um gargalo do processo — vale investigar o que está travando as oportunidades ali.`,
      })
    }
  }

  const totalOpen = followupHealth.overdue + followupHealth.due_soon + followupHealth.no_next_action + followupHealth.healthy
  if (totalOpen > 0) {
    const noActionPct = Math.round((followupHealth.no_next_action / totalOpen) * 1000) / 10
    if (noActionPct >= 20) {
      insights.push({
        data: `${noActionPct}% das oportunidades abertas (${followupHealth.no_next_action} de ${totalOpen}) não têm nenhuma atividade pendente.`,
        interpretation: `Follow-up pode estar sendo esquecido com frequência — considere revisar "Meu Dia" diariamente.`,
      })
    }
  }

  const totalLost = lostReasons.reduce((sum, r) => sum + r.deals_lost, 0)
  if (totalLost >= 3) {
    const top = lostReasons.reduce((max, r) => (r.deals_lost > max.deals_lost ? r : max))
    const pct = Math.round((top.deals_lost / totalLost) * 1000) / 10
    if (pct >= 30) {
      insights.push({
        data: `${pct}% das oportunidades perdidas (${top.deals_lost} de ${totalLost}) tiveram o motivo "${top.label}".`,
        interpretation: `Pode valer a pena investigar esse motivo especificamente — mas confirme com os casos reais antes de mudar processo ou preço.`,
      })
    }
  }

  return insights
}

export async function getFollowupHealthSummary() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('v_followup_health').select('health_status')
  if (error) throw new Error(error.message)

  const counts = { overdue: 0, due_soon: 0, no_next_action: 0, healthy: 0 }
  for (const row of data ?? []) {
    counts[row.health_status] += 1
  }
  return counts
}
