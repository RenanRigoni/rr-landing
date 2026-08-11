import { createClient } from '@/lib/supabase/server'
import { daysSince } from '@/lib/domain/stage-duration'

export interface BoardDeal {
  id: string
  title: string
  stage_id: string
  value_cents: number
  currency: string
  company_name: string | null
  contact_name: string | null
  source_name: string | null
  stage_entered_at: string
  days_in_stage: number
  next_activity_due_at: string | null
  next_activity_subject: string | null
  is_overdue: boolean
  qualification_score: number | null
}

export interface BoardStage {
  id: string
  name: string
  position: number
  probability: number
  is_won: boolean
  is_lost: boolean
  color: string | null
  deals: BoardDeal[]
}

export interface PipelineBoard {
  pipeline: { id: string; name: string }
  stages: BoardStage[]
}

export async function getPipelineBoard(pipelineId?: string): Promise<PipelineBoard> {
  const supabase = await createClient()

  const pipelineQuery = pipelineId
    ? supabase.from('pipelines').select('id, name').eq('id', pipelineId).single()
    : supabase.from('pipelines').select('id, name').eq('is_default', true).single()

  const { data: pipeline, error: pipelineError } = await pipelineQuery
  if (pipelineError || !pipeline) throw new Error(pipelineError?.message ?? 'Pipeline não encontrado')

  const { data: stages, error: stagesError } = await supabase
    .from('pipeline_stages')
    .select('id, name, position, probability, is_won, is_lost, color')
    .eq('pipeline_id', pipeline.id)
    .order('position', { ascending: true })
  if (stagesError) throw new Error(stagesError.message)

  const { data: deals, error: dealsError } = await supabase
    .from('deals')
    .select(
      'id, title, stage_id, value_cents, currency, created_at, qualification_score, companies(company_name), contacts(full_name), lead_sources(name)',
    )
    .eq('pipeline_id', pipeline.id)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
  if (dealsError) throw new Error(dealsError.message)

  const dealIds = (deals ?? []).map((d) => d.id)

  const stageEnteredAt = new Map<string, string>()
  const nextActivity = new Map<string, { due_at: string | null; subject: string }>()

  if (dealIds.length > 0) {
    const [{ data: history }, { data: activities }] = await Promise.all([
      supabase
        .from('deal_stage_history')
        .select('deal_id, changed_at')
        .in('deal_id', dealIds)
        .order('changed_at', { ascending: false }),
      supabase
        .from('activities')
        .select('deal_id, due_at, subject')
        .in('deal_id', dealIds)
        .eq('status', 'pending')
        .order('due_at', { ascending: true, nullsFirst: false }),
    ])

    for (const row of history ?? []) {
      if (!stageEnteredAt.has(row.deal_id)) stageEnteredAt.set(row.deal_id, row.changed_at)
    }
    for (const row of activities ?? []) {
      if (row.deal_id && !nextActivity.has(row.deal_id)) {
        nextActivity.set(row.deal_id, { due_at: row.due_at, subject: row.subject })
      }
    }
  }

  const now = Date.now()

  const boardStages: BoardStage[] = (stages ?? []).map((stage) => ({
    ...stage,
    deals: (deals ?? [])
      .filter((deal) => deal.stage_id === stage.id)
      .map((deal) => {
        const activity = nextActivity.get(deal.id)
        const enteredAt = stageEnteredAt.get(deal.id) ?? deal.created_at
        return {
          id: deal.id,
          title: deal.title,
          stage_id: deal.stage_id,
          value_cents: deal.value_cents,
          currency: deal.currency,
          company_name: deal.companies?.company_name ?? null,
          contact_name: deal.contacts?.full_name ?? null,
          source_name: deal.lead_sources?.name ?? null,
          stage_entered_at: enteredAt,
          days_in_stage: daysSince(enteredAt, now),
          next_activity_due_at: activity?.due_at ?? null,
          next_activity_subject: activity?.subject ?? null,
          is_overdue: activity?.due_at ? new Date(activity.due_at).getTime() < now : false,
          qualification_score: deal.qualification_score,
        }
      }),
  }))

  return { pipeline, stages: boardStages }
}

export async function listPipelineStages(pipelineId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pipeline_stages')
    .select('id, name, position, is_won, is_lost')
    .eq('pipeline_id', pipelineId)
    .order('position', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

export async function getDefaultPipeline() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('pipelines').select('id, name').eq('is_default', true).single()
  if (error) throw new Error(error.message)
  return data
}
