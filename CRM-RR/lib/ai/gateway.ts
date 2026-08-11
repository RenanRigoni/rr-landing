import 'server-only'
import { generateText, Output } from 'ai'
import type { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { renderTemplate } from '@/lib/ai/render-template'
import type { Json } from '@/lib/types/database.types'

interface RunAiPromptParams<T> {
  slug: string
  vars: Record<string, string>
  schema: z.ZodType<T>
  dealId?: string
  companyId?: string
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
 * Único ponto de chamada ao Vercel AI Gateway (Regra 6: toda execução de IA é
 * historicamente registrada, inclusive erros). Grava o resultado em crm.ai_runs
 * com status='pending_review' (Regra 3: nenhum output de IA é aplicado sozinho).
 */
async function executePrompt<T>(
  promptRow: PromptRow,
  vars: Record<string, string>,
  schema: z.ZodType<T>,
  ids: { dealId?: string; companyId?: string; contactId?: string },
): Promise<AiRunResult<T>> {
  const supabase = await createClient()
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
        prompt_id: promptRow.id,
        deal_id: ids.dealId ?? null,
        company_id: ids.companyId ?? null,
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

    if (runError) throw new Error(runError.message)

    return { runId: run.id, output: result.output }
  } catch (err) {
    const latencyMs = Date.now() - start
    const message = err instanceof Error ? err.message : 'Erro desconhecido'

    await supabase.from('ai_runs').insert({
      prompt_id: promptRow.id,
      deal_id: ids.dealId ?? null,
      company_id: ids.companyId ?? null,
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
 * Usado pelos botões de IA reais (qualificar, resumir, rascunhar e-mail).
 */
export async function runAiPrompt<T>({
  slug,
  vars,
  schema,
  dealId,
  companyId,
  contactId,
}: RunAiPromptParams<T>): Promise<AiRunResult<T>> {
  const supabase = await createClient()

  const { data: promptRow, error: promptError } = await supabase
    .from('ai_prompts')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (promptError) throw new Error(promptError.message)
  if (!promptRow) throw new Error(`Nenhum prompt ativo encontrado para "${slug}"`)

  return executePrompt(promptRow, vars, schema, { dealId, companyId, contactId })
}

/**
 * Executa uma versão ESPECÍFICA de prompt por id, ativa ou não — usado pelo
 * Prompt Lab para comparar versões lado a lado sem precisar ativá-las.
 */
export async function runAiPromptById<T>(
  promptId: string,
  vars: Record<string, string>,
  schema: z.ZodType<T>,
): Promise<AiRunResult<T>> {
  const supabase = await createClient()

  const { data: promptRow, error: promptError } = await supabase
    .from('ai_prompts')
    .select('*')
    .eq('id', promptId)
    .maybeSingle()

  if (promptError) throw new Error(promptError.message)
  if (!promptRow) throw new Error('Prompt não encontrado')

  return executePrompt(promptRow, vars, schema, {})
}
