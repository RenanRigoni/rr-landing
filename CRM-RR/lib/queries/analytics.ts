import { createClient } from '@/lib/supabase/server'

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
  return data
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
