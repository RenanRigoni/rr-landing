import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { buildFollowupVars, type FollowupContextActivity } from '@/lib/domain/ai-context'
import type { Database } from '@/lib/types/database.types'

type SalesClient = SupabaseClient<Database, 'sales'>

const uuidSchema = z.string().uuid()

// Strings de coluna em literal único, não concatenadas — string via `+`
// perde o tipo literal e o `.select()` do postgrest-js cai em
// `GenericStringError` (achado real, mesma nota em lib/queries/leads.ts).
const LEAD_COLUMNS = 'id, contact_id, stage_id, title, interest, value_cents, last_contact_at'
const ACTIVITY_COLUMNS = 'id, title, status, due_at, done_at, created_at, is_auto, step_number'

export interface FollowupContext {
  /** As 9 variáveis do prompt `followup_proposta`, prontas para `runAiPrompt({ vars })`. */
  vars: Record<string, string>
  leadId: string
  /** Contato do lead — o chamador (5.4) passa como `contactId` para `runAiPrompt`, para auditoria em `ai_runs`. */
  contactId: string
}

/**
 * Reúne o contexto real do lead para o prompt `followup_proposta`
 * (docs/IMPLEMENTATION_PLAN.md → 5.3).
 *
 * Recebe `client` + `orgId` explícitos, no mesmo formato de
 * `lib/ai/gateway.ts` (D-028) e de todo `*-core` (D-020): quem resolve
 * sessão/organização é a action `'use server'` da 5.4, nunca esta camada.
 * É o que torna o isolamento entre tenants testável sem `cookies()`
 * (D-030). `orgId` é sempre server-side — jamais vem do cliente.
 *
 * **Toda linha lida é filtrada por `org_id`:** o lead pedido, e o
 * contato / estágio / organização / atividades que ele referencia. Um
 * `leadId` de outra organização (ou um `orgId` que não é do usuário) não
 * encontra o lead e **lança** `Lead não encontrado.` — nunca devolve
 * contexto parcial. Contato ou estágio ausentes na organização são
 * invariante quebrada (D-020 valida na escrita), não fluxo esperado —
 * também lançam.
 *
 * Não chama a IA. `runAiPrompt` (5.4) recebe `vars` / `leadId` /
 * `contactId` deste retorno. Erro de banco aqui é propagado (lança),
 * nunca vira contexto vazio silencioso.
 */
export async function buildFollowupContext(supabase: SalesClient, orgId: string, leadId: string): Promise<FollowupContext> {
  if (!uuidSchema.safeParse(leadId).success) {
    throw new Error('Lead inválido.')
  }

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select(LEAD_COLUMNS)
    .eq('id', leadId)
    .eq('org_id', orgId)
    .maybeSingle()

  if (leadError) {
    throw new Error(`Falha ao carregar o lead para o contexto de IA: ${leadError.message}`)
  }
  if (!lead) {
    throw new Error('Lead não encontrado.')
  }

  const [contactResult, stageResult, orgResult, activitiesResult] = await Promise.all([
    supabase.from('contacts').select('id, full_name').eq('id', lead.contact_id).eq('org_id', orgId).maybeSingle(),
    supabase.from('pipeline_stages').select('id, label').eq('id', lead.stage_id).eq('org_id', orgId).maybeSingle(),
    supabase.from('organizations').select('id, name').eq('id', orgId).maybeSingle(),
    supabase
      .from('activities')
      .select(ACTIVITY_COLUMNS)
      .eq('org_id', orgId)
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .limit(5),
  ])

  if (contactResult.error || stageResult.error || orgResult.error || activitiesResult.error) {
    throw new Error('Falha ao carregar dados relacionados para o contexto de IA.')
  }
  if (!orgResult.data) {
    throw new Error('Organização não encontrada.')
  }
  if (!contactResult.data) {
    throw new Error('Lead referencia contato fora da organização atual.')
  }
  if (!stageResult.data) {
    throw new Error('Lead referencia estágio fora da organização atual.')
  }

  const activities: FollowupContextActivity[] = (activitiesResult.data ?? []).map((row) => ({
    title: row.title,
    status: row.status,
    due_at: row.due_at,
    done_at: row.done_at,
    created_at: row.created_at,
    is_auto: row.is_auto,
    step_number: row.step_number,
  }))

  const vars = buildFollowupVars({
    empresa: orgResult.data.name,
    contatoNome: contactResult.data.full_name,
    leadTitulo: lead.title,
    interesse: lead.interest,
    valueCents: lead.value_cents,
    lastContactAt: lead.last_contact_at,
    estagio: stageResult.data.label,
    activities,
  })

  return { vars, leadId, contactId: lead.contact_id }
}
