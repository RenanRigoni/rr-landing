import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { createLeadSchema, updateLeadSchema } from '@/lib/validation/leads'
import { computeFollowupSchedule, resolveNextAction, type BusinessHours, type FollowupRule } from '@/lib/domain/followup'
import type { Database, Json } from '@/lib/types/database.types'

export interface ActionResult {
  error: string | null
}

export interface StageActionResult extends ActionResult {
  leadId?: string
}

type SalesClient = SupabaseClient<Database, 'sales'>
type RelatedTable = 'contacts' | 'pipeline_stages' | 'lead_sources' | 'leads'

const uuidSchema = z.string().uuid()

const businessHoursSchema = z.object({
  start: z.string(),
  end: z.string(),
  days: z.array(z.number()),
})

// organizations.business_hours é jsonb — sem fronteira de entrada de usuário
// hoje (nenhuma action escreve nesta coluna ainda), mas defensivo contra
// registro corrompido: em vez de deixar o schedule de follow-up quebrar a
// escrita inteira, cai no default gravado pelo seed (docs/DATABASE.md →
// sales.organizations).
const DEFAULT_BUSINESS_HOURS: BusinessHours = { start: '09:00', end: '18:00', days: [1, 2, 3, 4, 5] }

function parseBusinessHours(value: Json): BusinessHours {
  const parsed = businessHoursSchema.safeParse(value)
  return parsed.success ? parsed.data : DEFAULT_BUSINESS_HOURS
}

/**
 * `leads.next_action_at`/`last_contact_at` são cache mantido pela aplicação,
 * não por trigger (D-006) — toda escrita em `activities` que passa por esta
 * camada recalcula os dois aqui. `next_action_at` usa a mesma
 * `resolveNextAction()` de `lib/domain/followup.ts` (4.2) que decide a tela
 * "Ações de hoje" — um só lugar decide o que é "próxima ação".
 */
export async function recalculateLeadCache(supabase: SalesClient, orgId: string, leadId: string): Promise<ActionResult> {
  const { data, error } = await supabase
    .from('activities')
    .select('status, due_at, done_at')
    .eq('org_id', orgId)
    .eq('lead_id', leadId)

  if (error) {
    return { error: 'Não foi possível recalcular o cache do lead.' }
  }

  const rows = data ?? []
  const nextActionAt = resolveNextAction(rows.map((row) => ({ status: row.status, due_at: row.due_at })))
  const doneAts = rows.map((row) => row.done_at).filter((value): value is string => value !== null)
  const lastContactAt = doneAts.length === 0 ? null : doneAts.reduce((latest, current) => (current > latest ? current : latest))

  const { error: updateError } = await supabase
    .from('leads')
    .update({ next_action_at: nextActionAt?.toISOString() ?? null, last_contact_at: lastContactAt })
    .eq('id', leadId)
    .eq('org_id', orgId)

  if (updateError) {
    return { error: 'Não foi possível atualizar o cache do lead.' }
  }

  return { error: null }
}

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

/**
 * Move o lead de estágio e (re)gera os follow-ups automáticos do estágio de
 * destino — este é o único caminho de mudança de estágio (`updateLead` não
 * aceita `stage_id`, ver `lib/validation/leads.ts`), então é aqui que
 * `lib/domain/followup.ts` (4.2) se conecta ao banco (4.3).
 *
 * Semântica de cancelamento, exatamente como documentado em
 * `DATABASE.md` → `sales.followup_rules`:
 * 1. `status`/`closed_at` do lead seguem `is_won`/`is_lost` do estágio de
 *    destino — sem isso as views desta mesma tarefa (`v_today_actions`,
 *    `v_leads_without_action`, ambas filtram `status = 'open'`) nunca
 *    parariam de mostrar um lead que já fechou.
 * 2. Estágio `is_won`/`is_lost` cancela **todos** os follow-ups automáticos
 *    pendentes do lead (gatilho explícito em `DATABASE.md`), não só os do
 *    estágio de destino — combinação com o item 1: um lead fechado não pode
 *    ter cobrança automática pendente.
 * 3. Fora de won/lost: cancela só os pendentes automáticos que pertencem às
 *    regras **deste** estágio de destino antes de regerar — é a leitura
 *    literal de "se já existirem pendentes automáticos para aquele estágio,
 *    cancelar antes de regerar (idempotência — mover A→B→A não duplica)".
 *    Não cancela follow-up manual (`is_auto = false`) em nenhum caso, e não
 *    mexe em pendentes de outro estágio que o lead tenha passado antes (não
 *    é gatilho de cancelamento documentado).
 * 4. Passo cujo `rule_id` já tem uma activity `done` para este lead entra
 *    como `alreadyExecuted: true` em `computeFollowupSchedule` — sem isso,
 *    reentrar no mesmo estágio depois de já ter concluído o passo 1 geraria
 *    um passo 1 novo e duplicado (a razão de `alreadyExecuted` existir desde
 *    a 4.2).
 */
export async function moveStageCore(supabase: SalesClient, orgId: string, leadId: string, stageId: string): Promise<StageActionResult> {
  const idResult = uuidSchema.safeParse(leadId)
  if (!idResult.success) {
    return { error: 'Lead inválido' }
  }

  const stageResult = uuidSchema.safeParse(stageId)
  if (!stageResult.success) {
    return { error: 'Estágio inválido' }
  }

  const { data: stage, error: stageError } = await supabase
    .from('pipeline_stages')
    .select('id, is_won, is_lost')
    .eq('id', stageResult.data)
    .eq('org_id', orgId)
    .maybeSingle()

  if (stageError) {
    return { error: 'Não foi possível verificar o estágio.' }
  }
  if (!stage) {
    return { error: 'Estágio não encontrado.' }
  }

  const nextStatus: Database['sales']['Enums']['lead_status'] = stage.is_won ? 'won' : stage.is_lost ? 'lost' : 'open'
  const closedAt = nextStatus === 'open' ? null : new Date().toISOString()

  const { data: moved, error: moveError } = await supabase
    .from('leads')
    .update({ stage_id: stageResult.data, status: nextStatus, closed_at: closedAt })
    .eq('id', idResult.data)
    .eq('org_id', orgId)
    .select('id, contact_id')

  if (moveError) {
    return { error: 'Não foi possível mover o lead.' }
  }
  if (!moved || moved.length === 0) {
    return { error: 'Lead não encontrado.' }
  }

  const lead = moved[0]!

  if (stage.is_won || stage.is_lost) {
    const { error: cancelAllError } = await supabase
      .from('activities')
      .update({ status: 'cancelled' })
      .eq('org_id', orgId)
      .eq('lead_id', idResult.data)
      .eq('status', 'pending')
      .eq('is_auto', true)

    if (cancelAllError) {
      return { error: 'Não foi possível cancelar os follow-ups pendentes.' }
    }
  } else {
    const scheduleResult = await regenerateStageFollowups(supabase, orgId, idResult.data, lead.contact_id, stage.id)
    if (scheduleResult.error) {
      return { error: scheduleResult.error }
    }
  }

  const cacheResult = await recalculateLeadCache(supabase, orgId, idResult.data)
  if (cacheResult.error) {
    return cacheResult
  }

  return { error: null, leadId: idResult.data }
}

async function regenerateStageFollowups(
  supabase: SalesClient,
  orgId: string,
  leadId: string,
  contactId: string,
  stageId: string,
): Promise<ActionResult> {
  const { data: rules, error: rulesError } = await supabase
    .from('followup_rules')
    .select('id, step_number, delay_days, channel, is_active')
    .eq('org_id', orgId)
    .eq('trigger_stage_id', stageId)

  if (rulesError) {
    return { error: 'Não foi possível carregar as regras de follow-up.' }
  }
  if (!rules || rules.length === 0) {
    return { error: null }
  }

  const ruleIds = rules.map((rule) => rule.id)

  const { error: cancelError } = await supabase
    .from('activities')
    .update({ status: 'cancelled' })
    .eq('org_id', orgId)
    .eq('lead_id', leadId)
    .eq('status', 'pending')
    .eq('is_auto', true)
    .in('rule_id', ruleIds)

  if (cancelError) {
    return { error: 'Não foi possível cancelar follow-ups pendentes deste estágio.' }
  }

  const { data: doneActivities, error: doneError } = await supabase
    .from('activities')
    .select('rule_id')
    .eq('org_id', orgId)
    .eq('lead_id', leadId)
    .eq('status', 'done')
    .in('rule_id', ruleIds)

  if (doneError) {
    return { error: 'Não foi possível verificar passos de follow-up já executados.' }
  }

  const executedRuleIds = new Set((doneActivities ?? []).map((activity) => activity.rule_id))

  const { data: org, error: orgError } = await supabase.from('organizations').select('timezone, business_hours').eq('id', orgId).single()

  if (orgError || !org) {
    return { error: 'Não foi possível carregar a configuração da organização.' }
  }

  const followupRules: FollowupRule[] = rules.map((rule) => ({
    stepNumber: rule.step_number,
    delayDays: rule.delay_days,
    isActive: rule.is_active,
    alreadyExecuted: executedRuleIds.has(rule.id),
  }))

  const schedule = computeFollowupSchedule({
    enteredStageAt: new Date(),
    rules: followupRules,
    timezone: org.timezone,
    businessHours: parseBusinessHours(org.business_hours),
  })

  if (schedule.length === 0) {
    return { error: null }
  }

  const ruleByStep = new Map(rules.map((rule) => [rule.step_number, rule]))
  const inserts: Database['sales']['Tables']['activities']['Insert'][] = schedule.map((item) => {
    const rule = ruleByStep.get(item.stepNumber)!
    return {
      org_id: orgId,
      lead_id: leadId,
      contact_id: contactId,
      type: rule.channel,
      title: `Follow-up automático — passo ${item.stepNumber}`,
      status: 'pending',
      due_at: item.dueAt.toISOString(),
      is_auto: true,
      rule_id: rule.id,
      step_number: item.stepNumber,
    }
  })

  const { error: insertError } = await supabase.from('activities').insert(inserts)
  if (insertError) {
    return { error: 'Não foi possível gerar os follow-ups automáticos.' }
  }

  return { error: null }
}

/**
 * "Cliente respondeu": grava `responded_at`, cancela todos os automáticos
 * pendentes (gatilho documentado em `DATABASE.md`) e registra uma activity
 * de histórico — o cancelamento em massa não pode ser silencioso, senão
 * "o sistema ia cobrar mas o cliente respondeu" (a razão de D-005 manter
 * cancelado visível, esmaecido, na timeline em vez de sumir) fica sem prova.
 *
 * Idempotente: se `responded_at` já estava preenchido, a segunda chamada não
 * reescreve o timestamp nem duplica a activity de histórico — só o primeiro
 * "cliente respondeu" é o evento real.
 */
export async function markRespondedCore(supabase: SalesClient, orgId: string, leadId: string, userId: string | null): Promise<StageActionResult> {
  const idResult = uuidSchema.safeParse(leadId)
  if (!idResult.success) {
    return { error: 'Lead inválido' }
  }

  const respondedAt = new Date().toISOString()

  const { data: updated, error: updateError } = await supabase
    .from('leads')
    .update({ responded_at: respondedAt })
    .eq('id', idResult.data)
    .eq('org_id', orgId)
    .is('responded_at', null)
    .select('id, contact_id')

  if (updateError) {
    return { error: 'Não foi possível registrar a resposta do lead.' }
  }

  if (!updated || updated.length === 0) {
    const { data: existing, error: existingError } = await supabase
      .from('leads')
      .select('id')
      .eq('id', idResult.data)
      .eq('org_id', orgId)
      .maybeSingle()

    if (existingError) {
      return { error: 'Não foi possível verificar o lead.' }
    }
    if (!existing) {
      return { error: 'Lead não encontrado.' }
    }

    // Lead existe e já tinha responded_at — chamada repetida, idempotente.
    return { error: null, leadId: idResult.data }
  }

  const lead = updated[0]!

  const { error: cancelError } = await supabase
    .from('activities')
    .update({ status: 'cancelled' })
    .eq('org_id', orgId)
    .eq('lead_id', idResult.data)
    .eq('status', 'pending')
    .eq('is_auto', true)

  if (cancelError) {
    return { error: 'Não foi possível cancelar os follow-ups pendentes.' }
  }

  const { error: historyError } = await supabase.from('activities').insert({
    org_id: orgId,
    lead_id: idResult.data,
    contact_id: lead.contact_id,
    type: 'note',
    title: 'Cliente respondeu',
    status: 'done',
    done_at: respondedAt,
    is_auto: false,
    created_by: userId,
  })

  if (historyError) {
    return { error: 'Não foi possível registrar o histórico da resposta.' }
  }

  const cacheResult = await recalculateLeadCache(supabase, orgId, idResult.data)
  if (cacheResult.error) {
    return cacheResult
  }

  return { error: null, leadId: idResult.data }
}
