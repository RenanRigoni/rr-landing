import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { requireOrgId } from '@/lib/queries/require-org'
import type { Database } from '@/lib/types/database.types'

export type PipelineStage = Database['sales']['Tables']['pipeline_stages']['Row']
export type LeadSource = Database['sales']['Tables']['lead_sources']['Row']

/** Estágios do pipeline da organização atual, na ordem do funil. */
export async function listStages(): Promise<PipelineStage[]> {
  const orgId = await requireOrgId()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pipeline_stages')
    .select('id, org_id, key, label, position, probability, is_won, is_lost, color, created_at, updated_at')
    .eq('org_id', orgId)
    .order('position', { ascending: true })

  if (error) {
    throw new Error(`Falha ao carregar estágios do pipeline: ${error.message}`)
  }

  return data ?? []
}

/** Fontes de lead da organização atual, na ordem de exibição configurada. */
export async function listSources(): Promise<LeadSource[]> {
  const orgId = await requireOrgId()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('lead_sources')
    .select('id, org_id, name, is_active, position, created_at')
    .eq('org_id', orgId)
    .order('position', { ascending: true })

  if (error) {
    throw new Error(`Falha ao carregar fontes de lead: ${error.message}`)
  }

  return data ?? []
}
