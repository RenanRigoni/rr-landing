import { createClient } from '@/lib/supabase/server'

export async function getDeal(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('deals')
    .select(
      `*,
      companies(id, company_name),
      contacts(id, full_name),
      pipeline_stages(id, name, is_won, is_lost),
      lead_sources(id, name),
      lost_reasons(id, label)`,
    )
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

export async function listDealStageHistory(dealId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('deal_stage_history')
    .select(
      `id, duration_in_previous_stage_seconds, changed_at,
      from_stage:pipeline_stages!deal_stage_history_from_stage_id_fkey(name),
      to_stage:pipeline_stages!deal_stage_history_to_stage_id_fkey(name)`,
    )
    .eq('deal_id', dealId)
    .order('changed_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}
