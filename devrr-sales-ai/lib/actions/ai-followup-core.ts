import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { buildFollowupContext } from '@/lib/queries/ai-context'
import { runAiPrompt } from '@/lib/ai/gateway'
import { followupPropostaOutputSchema, type FollowupPropostaOutput } from '@/lib/ai/schemas'
import { checkBelongsToOrg, type ActionResult, type StageActionResult } from '@/lib/actions/leads-core'
import { logAudit } from '@/lib/actions/audit'
import type { Database } from '@/lib/types/database.types'

type SalesClient = SupabaseClient<Database, 'sales'>

const uuidSchema = z.string().uuid()
const messageSchema = z.string().trim().min(1, 'A mensagem não pode ficar vazia.').max(4000, 'Mensagem muito longa.')

/** Slug do prompt seedado por organização (migration 0010, `seed_org_defaults`). */
export const FOLLOWUP_PROMPT_SLUG = 'followup_proposta'

export type GenerateFollowupResult =
  | { ok: true; runId: string; message: string; tone: FollowupPropostaOutput['tone']; reasoning: string }
  | { ok: false; error: string }

/**
 * Primeira action real de IA do produto (docs/IMPLEMENTATION_PLAN.md → 5.4).
 * Núcleo testável separado do wrapper `'use server'` — mesmo padrão de todo
 * `*-core` (D-020) e de `gateway.ts`/`ai-context.ts` (D-028/D-030): recebe
 * `client` + `orgId` já resolvidos, nunca chama `cookies()`.
 *
 * Fluxo:
 *  1. valida o `leadId` e monta o contexto via `buildFollowupContext` — que
 *     já revalida o lead (e contato/estágio/organização/atividades) contra
 *     `orgId`; um lead de outro tenant lança `Lead não encontrado.` e vira
 *     `{ ok: false }`, nunca contexto parcial;
 *  2. chama `runAiPrompt` com o schema Zod de saída — o gateway grava
 *     `ai_runs` (`pending_review` em sucesso, `status='error'` + relança se
 *     o gateway cair);
 *  3. revalida a saída com `followupPropostaOutputSchema` — formato
 *     inesperado é `{ ok: false }`, nunca sucesso.
 *
 * Erro de contexto, de gateway ou de schema **nunca** vira `{ ok: true }`.
 */
export async function generateFollowupMessageCore(
  supabase: SalesClient,
  orgId: string,
  leadId: string,
): Promise<GenerateFollowupResult> {
  if (!uuidSchema.safeParse(leadId).success) {
    return { ok: false, error: 'Lead inválido.' }
  }

  let context: Awaited<ReturnType<typeof buildFollowupContext>>
  try {
    context = await buildFollowupContext(supabase, orgId, leadId)
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Não foi possível montar o contexto do lead.' }
  }

  try {
    const { runId, output } = await runAiPrompt(supabase, orgId, {
      slug: FOLLOWUP_PROMPT_SLUG,
      vars: context.vars,
      schema: followupPropostaOutputSchema,
      leadId: context.leadId,
      contactId: context.contactId,
    })

    const parsed = followupPropostaOutputSchema.safeParse(output)
    if (!parsed.success) {
      return { ok: false, error: 'A IA respondeu num formato inesperado. Tente gerar outra versão.' }
    }

    return { ok: true, runId, message: parsed.data.message, tone: parsed.data.tone, reasoning: parsed.data.reasoning }
  } catch (err) {
    // runAiPrompt já gravou ai_runs com status='error' e relançou — aqui só
    // traduz para o resultado tipado, sem engolir.
    return { ok: false, error: err instanceof Error ? err.message : 'Falha ao gerar a mensagem com IA.' }
  }
}

export interface ApplyFollowupMessageInput {
  runId: string
  activityId: string
  leadId: string
  message: string
}

/**
 * "Usar esta" (5.4): grava a mensagem (editável — o texto vem do browser e
 * **não é confiável**, passa por `messageSchema`) em `activities.body`,
 * vincula `ai_run_id`, marca o `ai_run` como `reviewed` e registra
 * `audit_logs` (`ai_used`).
 *
 * Todo id que chega do cliente (`runId`, `activityId`, `leadId`) é
 * revalidado contra `orgId` antes de qualquer escrita — o `ai_run` e a
 * `activity` por consulta própria filtrada por `org_id`, e a `activity`
 * ainda tem que pertencer ao `leadId` informado. Nada de cross-tenant entra.
 */
export async function applyFollowupMessageCore(
  supabase: SalesClient,
  orgId: string,
  userId: string | null,
  input: ApplyFollowupMessageInput,
): Promise<StageActionResult> {
  if (
    !uuidSchema.safeParse(input.runId).success ||
    !uuidSchema.safeParse(input.activityId).success ||
    !uuidSchema.safeParse(input.leadId).success
  ) {
    return { error: 'Requisição inválida.' }
  }

  const parsedMessage = messageSchema.safeParse(input.message)
  if (!parsedMessage.success) {
    return { error: parsedMessage.error.issues[0]?.message ?? 'Mensagem inválida.' }
  }

  const { data: run, error: runError } = await supabase
    .from('ai_runs')
    .select('id, status')
    .eq('id', input.runId)
    .eq('org_id', orgId)
    .maybeSingle()

  if (runError) {
    return { error: 'Não foi possível verificar a execução de IA.' }
  }
  if (!run) {
    return { error: 'Execução de IA não encontrada.' }
  }

  const { data: activity, error: activityError } = await supabase
    .from('activities')
    .select('id, lead_id')
    .eq('id', input.activityId)
    .eq('org_id', orgId)
    .maybeSingle()

  if (activityError) {
    return { error: 'Não foi possível verificar a atividade.' }
  }
  if (!activity) {
    return { error: 'Atividade não encontrada.' }
  }
  if (activity.lead_id !== input.leadId) {
    return { error: 'Atividade não pertence ao lead informado.' }
  }

  const leadError = await checkBelongsToOrg(supabase, 'leads', input.leadId, orgId, 'Lead não encontrado.')
  if (leadError) {
    return { error: leadError }
  }

  const { data: updated, error: updateError } = await supabase
    .from('activities')
    .update({ body: parsedMessage.data, ai_run_id: input.runId })
    .eq('id', input.activityId)
    .eq('org_id', orgId)
    .select('id')

  if (updateError) {
    return { error: 'Não foi possível salvar a mensagem na atividade.' }
  }
  if (!updated || updated.length === 0) {
    return { error: 'Atividade não encontrada.' }
  }

  const { error: runUpdateError } = await supabase
    .from('ai_runs')
    .update({ status: 'reviewed', reviewed_by: userId, reviewed_at: new Date().toISOString() })
    .eq('id', input.runId)
    .eq('org_id', orgId)

  if (runUpdateError) {
    return { error: 'Não foi possível marcar a execução de IA como revisada.' }
  }

  await logAudit(supabase, orgId, userId, 'activity', input.activityId, 'ai_used', { ai_run_id: input.runId })

  return { error: null, leadId: input.leadId }
}

/**
 * "Descartar" (5.4): marca o `ai_run` como `discarded` e nada mais. Não
 * grava `audit_logs` — o estado do próprio `ai_run` já é o registro, e
 * `ai_used` é o único verbo de IA no vocabulário de auditoria da 5.4.
 * Idempotente: descartar de novo não falha.
 */
export async function discardAiRunCore(
  supabase: SalesClient,
  orgId: string,
  userId: string | null,
  runId: string,
): Promise<ActionResult> {
  if (!uuidSchema.safeParse(runId).success) {
    return { error: 'Execução de IA inválida.' }
  }

  const { data: run, error: runError } = await supabase
    .from('ai_runs')
    .select('id, status')
    .eq('id', runId)
    .eq('org_id', orgId)
    .maybeSingle()

  if (runError) {
    return { error: 'Não foi possível verificar a execução de IA.' }
  }
  if (!run) {
    return { error: 'Execução de IA não encontrada.' }
  }
  if (run.status === 'discarded') {
    return { error: null }
  }

  const { error: updateError } = await supabase
    .from('ai_runs')
    .update({ status: 'discarded', reviewed_by: userId, reviewed_at: new Date().toISOString() })
    .eq('id', runId)
    .eq('org_id', orgId)

  if (updateError) {
    return { error: 'Não foi possível descartar a execução de IA.' }
  }

  return { error: null }
}
