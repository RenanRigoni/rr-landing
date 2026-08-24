import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { createLeadSchema, updateLeadSchema } from '@/lib/validation/leads'
import type { Database } from '@/lib/types/database.types'

export interface ActionResult {
  error: string | null
}

type SalesClient = SupabaseClient<Database, 'sales'>
type RelatedTable = 'contacts' | 'pipeline_stages' | 'lead_sources'

const uuidSchema = z.string().uuid()

/**
 * `contact_id`/`stage_id`/`source_id` chegam do cliente como só um uuid —
 * nada garante por si só que a linha referenciada é da organização atual.
 * FK garante que a linha existe em algum lugar, não que existe NA org certa
 * (não há check cruzando org_id entre leads e as tabelas relacionadas — ver
 * docs/DATABASE.md, migration 0005). Sem esta checagem explícita, um lead
 * pode nascer/mudar apontando para um contato ou estágio de outro tenant:
 * insert passa (a FK existe), RLS de `leads` não vê o problema porque
 * filtra só por leads.org_id, e o resultado é uma linha corrompida que
 * vaza estrutura de outra organização através de join.
 */
export async function belongsToOrg(supabase: SalesClient, table: RelatedTable, id: string, orgId: string): Promise<boolean> {
  const { data } = await supabase.from(table).select('id').eq('id', id).eq('org_id', orgId).maybeSingle()
  return data !== null
}

export async function createLeadCore(
  supabase: SalesClient,
  orgId: string,
  userId: string | null,
  input: unknown,
): Promise<ActionResult & { id?: string }> {
  const parsed = createLeadSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  if (!(await belongsToOrg(supabase, 'contacts', parsed.data.contact_id, orgId))) {
    return { error: 'Contato não encontrado.' }
  }

  if (!(await belongsToOrg(supabase, 'pipeline_stages', parsed.data.stage_id, orgId))) {
    return { error: 'Estágio não encontrado.' }
  }

  if (parsed.data.source_id && !(await belongsToOrg(supabase, 'lead_sources', parsed.data.source_id, orgId))) {
    return { error: 'Fonte não encontrada.' }
  }

  const { data, error } = await supabase
    .from('leads')
    .insert({
      org_id: orgId,
      contact_id: parsed.data.contact_id,
      title: parsed.data.title,
      interest: parsed.data.interest ?? null,
      source_id: parsed.data.source_id ?? null,
      stage_id: parsed.data.stage_id,
      temperature: parsed.data.temperature ?? null,
      value_cents: parsed.data.value_cents,
      currency: parsed.data.currency,
      lost_reason: parsed.data.lost_reason ?? null,
      notes: parsed.data.notes ?? null,
      created_by: userId,
    })
    .select('id')
    .single()

  if (error || !data) {
    return { error: 'Não foi possível criar o lead.' }
  }

  return { error: null, id: data.id }
}

export async function updateLeadCore(
  supabase: SalesClient,
  orgId: string,
  leadId: string,
  input: unknown,
): Promise<ActionResult> {
  const idResult = uuidSchema.safeParse(leadId)
  if (!idResult.success) {
    return { error: 'Lead inválido' }
  }

  // updateLeadSchema já não tem stage_id no shape (Zod remove via .omit() em
  // lib/validation/leads.ts) — mudar estágio só existe por moveStage(),
  // que também é o único lugar que vai gravar a activity da mudança quando
  // sales.activities existir (Fase 4). Envio de stage_id aqui é descartado
  // silenciosamente pelo parse, não chega a virar coluna no update.
  const parsed = updateLeadSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  if (parsed.data.contact_id && !(await belongsToOrg(supabase, 'contacts', parsed.data.contact_id, orgId))) {
    return { error: 'Contato não encontrado.' }
  }

  if (parsed.data.source_id && !(await belongsToOrg(supabase, 'lead_sources', parsed.data.source_id, orgId))) {
    return { error: 'Fonte não encontrada.' }
  }

  const updates: Database['sales']['Tables']['leads']['Update'] = { ...parsed.data }
  if (Object.keys(updates).length === 0) {
    return { error: 'Nada para atualizar.' }
  }

  const { data, error } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', idResult.data)
    .eq('org_id', orgId)
    .select('id')

  if (error) {
    return { error: 'Não foi possível atualizar o lead.' }
  }

  if (!data || data.length === 0) {
    return { error: 'Lead não encontrado.' }
  }

  return { error: null }
}

export async function moveStageCore(
  supabase: SalesClient,
  orgId: string,
  leadId: string,
  stageId: string,
): Promise<ActionResult> {
  const idResult = uuidSchema.safeParse(leadId)
  if (!idResult.success) {
    return { error: 'Lead inválido' }
  }

  const stageResult = uuidSchema.safeParse(stageId)
  if (!stageResult.success) {
    return { error: 'Estágio inválido' }
  }

  if (!(await belongsToOrg(supabase, 'pipeline_stages', stageResult.data, orgId))) {
    return { error: 'Estágio não encontrado.' }
  }

  const { data, error } = await supabase
    .from('leads')
    .update({ stage_id: stageResult.data })
    .eq('id', idResult.data)
    .eq('org_id', orgId)
    .select('id')

  if (error) {
    return { error: 'Não foi possível mover o lead.' }
  }

  if (!data || data.length === 0) {
    return { error: 'Lead não encontrado.' }
  }

  // Registro da mudança como activity fica pendente: sales.activities só
  // existe a partir de supabase/migrations/0006_activities.sql (tarefa 4.1,
  // Fase 4), ainda não aplicada nesta fase — não pode ser criada aqui sem
  // antecipar migration de outra tarefa. moveStage já isola a transição de
  // estágio nesta única função, então quando 0006 existir o insert de
  // activity entra bem aqui, sem mudar o contrato desta função nem abrir um
  // segundo caminho de mudança de estágio (esse é o ponto de updateLead não
  // aceitar stage_id: só existe UM caminho para mudar estágio, e é este).

  return { error: null }
}
