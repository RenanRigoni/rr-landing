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

export async function getAiQualitySummary() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('v_ai_quality_summary').select('*')
  if (error) throw new Error(error.message)
  return data
}

export async function getErrorCategoryBreakdown() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ai_feedback')
    .select('error_category')
    .eq('is_useful', false)
    .not('error_category', 'is', null)

  if (error) throw new Error(error.message)

  const counts = new Map<string, number>()
  for (const row of data ?? []) {
    if (!row.error_category) continue
    counts.set(row.error_category, (counts.get(row.error_category) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
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
