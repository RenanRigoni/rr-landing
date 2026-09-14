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

/**
 * Motivos de perda mais usados pela organização, para sugerir no diálogo de
 * "marcar como perdido" (8.2). Só sugestão — conta em JS sobre uma amostra
 * (`limit(500)`), não precisa de RPC nem de varrer a tabela inteira.
 */
export async function listLostReasonSuggestions(): Promise<string[]> {
  const orgId = await requireOrgId()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('leads')
    .select('lost_reason')
    .eq('org_id', orgId)
    .eq('status', 'lost')
    .not('lost_reason', 'is', null)
    .limit(500)

  if (error) {
    throw new Error(`Falha ao carregar sugestões de motivo de perda: ${error.message}`)
  }

  const counts = new Map<string, number>()
  for (const row of data ?? []) {
    if (row.lost_reason === null) continue
    counts.set(row.lost_reason, (counts.get(row.lost_reason) ?? 0) + 1)
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([reason]) => reason)
}
