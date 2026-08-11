import { createClient } from '@/lib/supabase/server'

export async function listProcessDocs() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('process_docs')
    .select('id, slug, title, objective, status, last_reviewed_at')
    .order('title', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

export async function getProcessDoc(slug: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('process_docs').select('*').eq('slug', slug).maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

export async function listProcessFeedback(processId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('process_feedback')
    .select('id, feedback_type, content, resolved, created_at')
    .eq('process_id', processId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

/**
 * Compara o comportamento DESENHADO de "Cadência de Follow-up" (100% dos deals
 * abertos com próxima ação) contra o OBSERVADO em crm.v_followup_health —
 * rastreabilidade de processo real (Fase 8 / seção 22 da spec).
 */
export async function getFollowupProcessGap() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('v_followup_health').select('health_status')
  if (error) throw new Error(error.message)

  const total = data?.length ?? 0
  const withNextAction = (data ?? []).filter((r) => r.health_status !== 'no_next_action').length
  const observedPct = total > 0 ? Math.round((withNextAction / total) * 1000) / 10 : null

  return { expectedPct: 100, observedPct, total, withNextAction }
}
