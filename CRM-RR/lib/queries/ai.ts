import { createClient } from '@/lib/supabase/server'

export async function listAiRuns(limit = 50) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ai_runs')
    .select(
      'id, status, applied, model, input_tokens, output_tokens, latency_ms, error_message, created_at, ai_prompts(slug, title, version)',
    )
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return data
}

export async function listActiveAiPrompts() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ai_prompts')
    .select('id, slug, title, version, model, is_active, created_at')
    .eq('is_active', true)
    .order('slug', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}
