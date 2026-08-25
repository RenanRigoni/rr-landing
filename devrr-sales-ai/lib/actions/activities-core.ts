import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { createActivitySchema, rescheduleActivitySchema, completeActivitySchema } from '@/lib/validation/activities'
import { belongsToOrg, recalculateLeadCache, type StageActionResult } from '@/lib/actions/leads-core'
import type { Database } from '@/lib/types/database.types'

type SalesClient = SupabaseClient<Database, 'sales'>

const uuidSchema = z.string().uuid()

/**
 * Cria activity manual (nota, ligação, tarefa...). Nunca é o caminho de
 * geração automática de follow-up — isso é `lib/actions/leads-core.ts` →
 * `moveStageCore`, que grava `is_auto`/`rule_id`/`step_number` direto, sem
 * passar por Zod (não é entrada de usuário). Aqui esses três campos nunca
 * vêm do parâmetro `input`: `is_auto` é sempre `false`, `rule_id`/
 * `step_number` sempre `null` — mass assignment fechado no schema
 * (`lib/validation/activities.ts`), não só por convenção de chamada.
 */
export async function createActivityCore(
  supabase: SalesClient,
  orgId: string,
  userId: string | null,
  input: unknown,
): Promise<StageActionResult & { id?: string }> {
  const parsed = createActivitySchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  if (!(await belongsToOrg(supabase, 'leads', parsed.data.lead_id, orgId))) {
    return { error: 'Lead não encontrado.' }
  }
  if (parsed.data.contact_id && !(await belongsToOrg(supabase, 'contacts', parsed.data.contact_id, orgId))) {
    return { error: 'Contato não encontrado.' }
  }

  const isScheduled = parsed.data.due_at !== null && parsed.data.due_at !== undefined

  const { data, error } = await supabase
    .from('activities')
    .insert({
      org_id: orgId,
      lead_id: parsed.data.lead_id,
      contact_id: parsed.data.contact_id ?? null,
      type: parsed.data.type,
      title: parsed.data.title,
      body: parsed.data.body ?? null,
      status: isScheduled ? 'pending' : 'done',
      due_at: isScheduled ? parsed.data.due_at!.toISOString() : null,
      done_at: isScheduled ? null : new Date().toISOString(),
      is_auto: false,
      rule_id: null,
      step_number: null,
      created_by: userId,
    })
    .select('id')
    .single()

  if (error || !data) {
    return { error: 'Não foi possível criar a atividade.' }
  }

  const cacheResult = await recalculateLeadCache(supabase, orgId, parsed.data.lead_id)
  if (cacheResult.error) {
    return cacheResult
  }

  return { error: null, id: data.id, leadId: parsed.data.lead_id }
}

async function fetchActivity(supabase: SalesClient, orgId: string, activityId: string) {
  return supabase.from('activities').select('id, lead_id, status').eq('id', activityId).eq('org_id', orgId).maybeSingle()
}

/** Idempotente: concluir uma activity já concluída não reescreve `done_at` nem falha. */
export async function completeActivityCore(supabase: SalesClient, orgId: string, activityId: string, input: unknown = {}): Promise<StageActionResult> {
  const idResult = uuidSchema.safeParse(activityId)
  if (!idResult.success) {
    return { error: 'Atividade inválida' }
  }

  const parsed = completeActivitySchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const { data: activity, error: fetchError } = await fetchActivity(supabase, orgId, idResult.data)
  if (fetchError) {
    return { error: 'Não foi possível verificar a atividade.' }
  }
  if (!activity) {
    return { error: 'Atividade não encontrada.' }
  }
  if (activity.status === 'done') {
    return { error: null, leadId: activity.lead_id }
  }

  const doneAt = (parsed.data.done_at ?? new Date()).toISOString()

  const { data, error } = await supabase
    .from('activities')
    .update({ status: 'done', done_at: doneAt })
    .eq('id', idResult.data)
    .eq('org_id', orgId)
    .select('id')

  if (error) {
    return { error: 'Não foi possível concluir a atividade.' }
  }
  if (!data || data.length === 0) {
    return { error: 'Atividade não encontrada.' }
  }

  const cacheResult = await recalculateLeadCache(supabase, orgId, activity.lead_id)
  if (cacheResult.error) {
    return cacheResult
  }

  return { error: null, leadId: activity.lead_id }
}

/** Idempotente: cancelar uma activity já cancelada não falha nem duplica efeito. */
export async function cancelActivityCore(supabase: SalesClient, orgId: string, activityId: string): Promise<StageActionResult> {
  const idResult = uuidSchema.safeParse(activityId)
  if (!idResult.success) {
    return { error: 'Atividade inválida' }
  }

  const { data: activity, error: fetchError } = await fetchActivity(supabase, orgId, idResult.data)
  if (fetchError) {
    return { error: 'Não foi possível verificar a atividade.' }
  }
  if (!activity) {
    return { error: 'Atividade não encontrada.' }
  }
  if (activity.status === 'cancelled') {
    return { error: null, leadId: activity.lead_id }
  }

  const { data, error } = await supabase.from('activities').update({ status: 'cancelled' }).eq('id', idResult.data).eq('org_id', orgId).select('id')

  if (error) {
    return { error: 'Não foi possível cancelar a atividade.' }
  }
  if (!data || data.length === 0) {
    return { error: 'Atividade não encontrada.' }
  }

  const cacheResult = await recalculateLeadCache(supabase, orgId, activity.lead_id)
  if (cacheResult.error) {
    return cacheResult
  }

  return { error: null, leadId: activity.lead_id }
}

/** Só reagenda activity pendente — concluída/cancelada não tem "próxima data" pra mudar. */
export async function rescheduleActivityCore(supabase: SalesClient, orgId: string, activityId: string, input: unknown): Promise<StageActionResult> {
  const idResult = uuidSchema.safeParse(activityId)
  if (!idResult.success) {
    return { error: 'Atividade inválida' }
  }

  const parsed = rescheduleActivitySchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Data inválida' }
  }

  const { data: activity, error: fetchError } = await fetchActivity(supabase, orgId, idResult.data)
  if (fetchError) {
    return { error: 'Não foi possível verificar a atividade.' }
  }
  if (!activity) {
    return { error: 'Atividade não encontrada.' }
  }
  if (activity.status !== 'pending') {
    return { error: 'Só é possível reagendar uma atividade pendente.' }
  }

  const { data, error } = await supabase
    .from('activities')
    .update({ due_at: parsed.data.due_at.toISOString() })
    .eq('id', idResult.data)
    .eq('org_id', orgId)
    .eq('status', 'pending')
    .select('id')

  if (error) {
    return { error: 'Não foi possível reagendar a atividade.' }
  }
  if (!data || data.length === 0) {
    return { error: 'Atividade não encontrada ou não está mais pendente.' }
  }

  const cacheResult = await recalculateLeadCache(supabase, orgId, activity.lead_id)
  if (cacheResult.error) {
    return cacheResult
  }

  return { error: null, leadId: activity.lead_id }
}
