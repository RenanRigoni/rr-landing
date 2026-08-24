import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { requireOrgId } from '@/lib/queries/require-org'
import type { Database } from '@/lib/types/database.types'

export type Lead = Database['sales']['Tables']['leads']['Row']

// String concatenada via `+` perde o tipo literal e faz o `.select()` do
// postgrest-js cair em `GenericStringError` (achado real ao rodar
// typecheck) — precisa ser um único literal, por isso a linha longa.
const LEAD_COLUMNS =
  'id, org_id, contact_id, title, interest, source_id, stage_id, status, temperature, value_cents, currency, last_contact_at, next_action_at, responded_at, closed_at, lost_reason, notes, is_demo, created_by, created_at, updated_at'

export interface ListLeadsFilters {
  stageId?: string
  sourceId?: string
  status?: Database['sales']['Enums']['lead_status']
  search?: string
}

export async function listLeads(filters: ListLeadsFilters = {}): Promise<Lead[]> {
  const orgId = await requireOrgId()
  const supabase = await createClient()

  let query = supabase.from('leads').select(LEAD_COLUMNS).eq('org_id', orgId)

  if (filters.stageId) {
    query = query.eq('stage_id', filters.stageId)
  }
  if (filters.sourceId) {
    query = query.eq('source_id', filters.sourceId)
  }
  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  if (filters.search) {
    query = query.ilike('title', `%${filters.search}%`)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Falha ao carregar leads: ${error.message}`)
  }

  return data ?? []
}

export async function getLead(leadId: string): Promise<Lead | null> {
  const orgId = await requireOrgId()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('leads')
    .select(LEAD_COLUMNS)
    .eq('id', leadId)
    .eq('org_id', orgId)
    .maybeSingle()

  if (error) {
    throw new Error(`Falha ao carregar lead: ${error.message}`)
  }

  return data
}
