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

type SalesClient = Awaited<ReturnType<typeof createClient>>

export interface LeadContactSummary {
  id: string
  full_name: string
  phone: string | null
  /**
   * E-mail do contato (`contacts.email`). Entrou na 7.9: é um dos campos de
   * identificação do dossiê exportado (`DOSSIE.md` §1). Nulo quando o operador
   * não informou.
   */
  email: string | null
  /**
   * Nome comercial da empresa do contato (`contacts.company_name`, preenchido
   * pelo campo "Empresa" de `/leads/new`). Entrou na 7.7: é a fonte REAL de
   * "Empresa" no dossiê — `leads.title` é o título do lead ("Landing page para
   * loja de móveis"), outra informação. Nulo quando o operador não informou.
   */
  company_name: string | null
}

export interface LeadStageSummary {
  id: string
  key: string
  label: string
  color: string | null
}

export interface LeadSourceSummary {
  id: string
  name: string
}

export interface LeadWithDisplay extends Lead {
  contact: LeadContactSummary
  stage: LeadStageSummary
  source: LeadSourceSummary | null
}

/**
 * Junta lead + contato + estágio + fonte sem embedded select do postgrest-js
 * (evitado de propósito: com os types de `sales` mantidos à mão, não há
 * garantia de que o formato de `Relationships` produz o alias certo pro
 * embed tipar direito — já foi achado real de tipagem quebrada em
 * `.select()` com string não-literal nesta mesma tarefa 3.4/leads.ts. Três
 * queries simples e explícitas, com o mesmo filtro `org_id` de sempre, são
 * mais previsíveis que depender desse mecanismo sem poder confirmar o tipo
 * gerado.
 *
 * Lança se algum lead referenciar contato/estágio fora da organização
 * atual — não deveria acontecer (D-020: toda escrita valida isso antes de
 * gravar), então aqui é invariante, não fluxo esperado.
 */
async function attachDisplayData(supabase: SalesClient, orgId: string, leads: Lead[]): Promise<LeadWithDisplay[]> {
  if (leads.length === 0) {
    return []
  }

  const contactIds = [...new Set(leads.map((lead) => lead.contact_id))]
  const stageIds = [...new Set(leads.map((lead) => lead.stage_id))]
  const sourceIds = [...new Set(leads.map((lead) => lead.source_id).filter((id): id is string => id !== null))]

  const [contactsResult, stagesResult, sourcesResult] = await Promise.all([
    supabase.from('contacts').select('id, full_name, phone, email, company_name').eq('org_id', orgId).in('id', contactIds),
    supabase.from('pipeline_stages').select('id, key, label, color').eq('org_id', orgId).in('id', stageIds),
    sourceIds.length > 0
      ? supabase.from('lead_sources').select('id, name').eq('org_id', orgId).in('id', sourceIds)
      : Promise.resolve({ data: [] as LeadSourceSummary[], error: null }),
  ])

  if (contactsResult.error || stagesResult.error || sourcesResult.error) {
    throw new Error('Falha ao carregar dados relacionados dos leads.')
  }

  const contactById = new Map((contactsResult.data ?? []).map((row) => [row.id, row]))
  const stageById = new Map((stagesResult.data ?? []).map((row) => [row.id, row]))
  const sourceById = new Map((sourcesResult.data ?? []).map((row) => [row.id, row]))

  return leads.map((lead) => {
    const contact = contactById.get(lead.contact_id)
    const stage = stageById.get(lead.stage_id)

    if (!contact || !stage) {
      throw new Error(`Lead ${lead.id} referencia contato ou estágio fora da organização atual.`)
    }

    return {
      ...lead,
      contact,
      stage,
      source: lead.source_id ? (sourceById.get(lead.source_id) ?? null) : null,
    }
  })
}

/** `listLeads()` + dados de contato/estágio/fonte para a tela de lista (3.5). */
export async function listLeadsForDisplay(filters: ListLeadsFilters = {}): Promise<LeadWithDisplay[]> {
  const orgId = await requireOrgId()
  const supabase = await createClient()

  const leads = await listLeads(filters)
  return attachDisplayData(supabase, orgId, leads)
}

/** `getLead()` + dados de contato/estágio/fonte para a tela de detalhe (3.5). */
export async function getLeadForDisplay(leadId: string): Promise<LeadWithDisplay | null> {
  const orgId = await requireOrgId()
  const supabase = await createClient()

  const lead = await getLead(leadId)
  if (!lead) {
    return null
  }

  const [withDisplay] = await attachDisplayData(supabase, orgId, [lead])
  return withDisplay ?? null
}
