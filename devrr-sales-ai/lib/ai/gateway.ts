import { generateText, Output } from 'ai'
import type { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { renderTemplate } from '@/lib/ai/render-template'
import type { Database, Json } from '@/lib/types/database.types'

type SalesClient = SupabaseClient<Database, 'sales'>

interface RunAiPromptParams<T> {
  slug: string
  vars: Record<string, string>
  schema: z.ZodType<T>
  leadId?: string
  contactId?: string
}

export interface AiRunResult<T> {
  runId: string
  output: T
}

type PromptRow = {
  id: string
  system_prompt: string
  user_prompt_template: string
  model: string
  temperature: number
}

/**
 * Único ponto de chamada ao Vercel AI Gateway. Grava o resultado em
 * sales.ai_runs com status='pending_review' — nenhum output de IA é
 * aplicado sozinho (regra dura do CLAUDE.md). `orgId` e `client` vêm do
 * chamador (mesmo padrão *-core de lib/actions/leads-core.ts, D-020):
 * quem resolve sessão/org é a action 'use server', não esta camada.
 *
 * `leadId`/`contactId` não são validados contra `orgId` aqui — é
 * responsabilidade do chamador (checkBelongsToOrg, como todo *-core já
 * faz antes de referenciar uma entidade relacionada). Esta função só
 * grava o que recebe.
 */
async function executePrompt<T>(
  supabase: SalesClient,
  orgId: string,
  promptRow: PromptRow,
  vars: Record<string, string>,
  schema: z.ZodType<T>,
  ids: { leadId?: string; contactId?: string },
): Promise<AiRunResult<T>> {
  const userPrompt = renderTemplate(promptRow.user_prompt_template, vars)
  const inputPayload: Json = { vars }
  const start = Date.now()

  try {
    const result = await generateText({
      model: promptRow.model,
      system: promptRow.system_prompt,
      prompt: userPrompt,
      temperature: promptRow.temperature,
      output: Output.object({ schema }),
    })

    const latencyMs = Date.now() - start

    const { data: run, error: runError } = await supabase
      .from('ai_runs')
      .insert({
        org_id: orgId,
        prompt_id: promptRow.id,
        lead_id: ids.leadId ?? null,
        contact_id: ids.contactId ?? null,
        input_payload: inputPayload,
        raw_response: JSON.stringify(result.output),
        parsed_output: result.output as unknown as Json,
        status: 'pending_review',
        model: promptRow.model,
        input_tokens: result.usage.inputTokens ?? null,
        output_tokens: result.usage.outputTokens ?? null,
        latency_ms: latencyMs,
      })
      .select('id')
      .single()

    if (runError || !run) {
      throw new Error(runError?.message ?? 'Não foi possível gravar a execução de IA.')
    }

    return { runId: run.id, output: result.output }
  } catch (err) {
    const latencyMs = Date.now() - start
    const message = err instanceof Error ? err.message : 'Erro desconhecido'

    await supabase.from('ai_runs').insert({
      org_id: orgId,
      prompt_id: promptRow.id,
      lead_id: ids.leadId ?? null,
      contact_id: ids.contactId ?? null,
      input_payload: inputPayload,
      status: 'error',
      model: promptRow.model,
      latency_ms: latencyMs,
      error_message: message,
    })

    throw err
  }
}

/**
 * Busca o prompt ATIVO da slug no banco — nunca hardcoded — e executa.
 * Se a chave do Gateway faltar ou a chamada cair, o erro é gravado em
 * ai_runs (status='error') e relançado: nunca falha em silêncio.
 */
export async function runAiPrompt<T>(
  supabase: SalesClient,
  orgId: string,
  { slug, vars, schema, leadId, contactId }: RunAiPromptParams<T>,
): Promise<AiRunResult<T>> {
  const { data: promptRow, error: promptError } = await supabase
    .from('ai_prompts')
    .select('id, system_prompt, user_prompt_template, model, temperature')
    .eq('org_id', orgId)
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (promptError) {
    throw new Error(promptError.message)
  }
  if (!promptRow) {
    throw new Error(`Nenhum prompt ativo encontrado para "${slug}".`)
  }

  return executePrompt(supabase, orgId, promptRow, vars, schema, { leadId, contactId })
}
