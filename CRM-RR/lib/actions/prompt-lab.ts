'use server'

import { revalidatePath } from 'next/cache'
import type { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { runAiPromptById } from '@/lib/ai/gateway'
import { PROMPT_OUTPUT_SCHEMAS, type PromptSlug } from '@/lib/ai/schemas'

export interface CreatePromptVersionState {
  error: string | null
}

/**
 * Cria uma NOVA versão de prompt — nunca sobrescreve a anterior (Regra 4).
 */
export async function createPromptVersion(
  _prevState: CreatePromptVersionState,
  formData: FormData,
): Promise<CreatePromptVersionState> {
  const slug = String(formData.get('slug') ?? '').trim()
  const title = String(formData.get('title') ?? '').trim()
  const systemPrompt = String(formData.get('system_prompt') ?? '').trim()
  const userPromptTemplate = String(formData.get('user_prompt_template') ?? '').trim()
  const model = String(formData.get('model') ?? '').trim()
  const temperature = Number(formData.get('temperature') ?? 0.3)
  const notes = String(formData.get('notes') ?? '').trim() || null
  const activate = formData.get('activate') === 'on'

  if (!slug || !title || !systemPrompt || !userPromptTemplate || !model) {
    return { error: 'Preencha todos os campos obrigatórios' }
  }

  const supabase = await createClient()

  const { data: existingVersions, error: versionsError } = await supabase
    .from('ai_prompts')
    .select('version')
    .eq('slug', slug)
    .order('version', { ascending: false })
    .limit(1)

  if (versionsError) return { error: versionsError.message }

  const nextVersion = (existingVersions?.[0]?.version ?? 0) + 1

  if (activate) {
    await supabase.from('ai_prompts').update({ is_active: false }).eq('slug', slug).eq('is_active', true)
  }

  const { error } = await supabase.from('ai_prompts').insert({
    slug,
    version: nextVersion,
    title,
    system_prompt: systemPrompt,
    user_prompt_template: userPromptTemplate,
    model,
    temperature,
    notes,
    is_active: activate,
  })

  if (error) return { error: error.message }

  await supabase.from('audit_log').insert({
    entity_type: 'ai_prompt',
    entity_id: slug,
    action: 'prompt_version_created',
    diff: { slug, version: nextVersion, activated: activate },
  })

  revalidatePath('/prompt-lab')
  return { error: null }
}

export async function activatePromptVersion(promptId: string, slug: string): Promise<{ error: string | null }> {
  const supabase = await createClient()

  await supabase.from('ai_prompts').update({ is_active: false }).eq('slug', slug).eq('is_active', true)
  const { error } = await supabase.from('ai_prompts').update({ is_active: true }).eq('id', promptId)

  if (error) return { error: error.message }

  revalidatePath('/prompt-lab')
  revalidatePath('/ai-quality')
  return { error: null }
}

export interface ComparisonResult {
  ok: boolean
  comparisonId?: string
  outputA?: unknown
  outputB?: unknown
  error?: string
}

export async function runPromptComparison(
  promptAId: string,
  promptBId: string,
  testInputRaw: string,
): Promise<ComparisonResult> {
  let vars: Record<string, string>
  try {
    vars = JSON.parse(testInputRaw)
  } catch {
    return { ok: false, error: 'Input de teste precisa ser um JSON válido, ex: {"deal_title": "..."}' }
  }

  const supabase = await createClient()

  const { data: promptA, error: promptAError } = await supabase
    .from('ai_prompts')
    .select('id, slug')
    .eq('id', promptAId)
    .single()
  if (promptAError || !promptA) return { ok: false, error: 'Prompt A não encontrado' }

  const { data: promptB, error: promptBError } = await supabase
    .from('ai_prompts')
    .select('id, slug')
    .eq('id', promptBId)
    .single()
  if (promptBError || !promptB) return { ok: false, error: 'Prompt B não encontrado' }

  if (promptA.slug !== promptB.slug) {
    return { ok: false, error: 'Só é possível comparar versões da mesma slug' }
  }

  const schema = PROMPT_OUTPUT_SCHEMAS[promptA.slug as PromptSlug] as z.ZodTypeAny | undefined
  if (!schema) return { ok: false, error: `Slug "${promptA.slug}" não tem schema de output conhecido` }

  try {
    const [resultA, resultB] = await Promise.all([
      runAiPromptById(promptAId, vars, schema),
      runAiPromptById(promptBId, vars, schema),
    ])

    const { data: comparison, error: comparisonError } = await supabase
      .from('prompt_lab_comparisons')
      .insert({
        prompt_a_id: promptAId,
        prompt_b_id: promptBId,
        test_input: vars,
        run_a_id: resultA.runId,
        run_b_id: resultB.runId,
      })
      .select('id')
      .single()

    if (comparisonError) return { ok: false, error: comparisonError.message }

    revalidatePath('/prompt-lab')
    return { ok: true, comparisonId: comparison.id, outputA: resultA.output, outputB: resultB.output }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erro ao chamar a IA' }
  }
}

export async function recordComparisonWinner(comparisonId: string, winner: 'a' | 'b' | 'tie'): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { error } = await supabase.from('prompt_lab_comparisons').update({ winner }).eq('id', comparisonId)

  if (error) return { error: error.message }

  revalidatePath('/prompt-lab')
  return { error: null }
}
