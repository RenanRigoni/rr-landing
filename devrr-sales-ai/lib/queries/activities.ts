import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { requireOrgId } from '@/lib/queries/require-org'
import type { Database } from '@/lib/types/database.types'

export type Activity = Database['sales']['Tables']['activities']['Row']

const ACTIVITY_COLUMNS =
  'id, org_id, lead_id, contact_id, type, title, body, status, due_at, done_at, is_auto, rule_id, step_number, ai_run_id, is_demo, created_by, created_at, updated_at'

/**
 * Timeline do lead (4.5): todas as activities — feitas, pendentes e
 * canceladas — mais recentes primeiro. Cancelada não é filtrada aqui: D-005
 * documenta que ela fica visível, esmaecida, porque "o sistema ia cobrar mas
 * o cliente respondeu" é justamente o que prova o valor do produto.
 *
 * Desempate por `id` (achado E do checkpoint da Fase 4): os passos de uma
 * mesma cadência nascem no mesmo `insert` (`regenerateStageFollowups`), com
 * `created_at` praticamente idêntico — sem um segundo critério a ordem entre
 * eles é instável de um carregamento pro outro. `id` está presente em toda
 * linha e é sempre distinto; não carrega significado nenhum além de tornar a
 * ordem determinística.
 */
export async function listActivitiesForLead(leadId: string): Promise<Activity[]> {
  const orgId = await requireOrgId()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('activities')
    .select(ACTIVITY_COLUMNS)
    .eq('org_id', orgId)
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: true })

  if (error) {
    throw new Error(`Falha ao carregar histórico do lead: ${error.message}`)
  }

  return data ?? []
}
