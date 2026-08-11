import { createClient } from '@/lib/supabase/server'

export interface PromptGroup {
  slug: string
  versions: {
    id: string
    version: number
    title: string
    model: string
    is_active: boolean
    created_at: string
    notes: string | null
    system_prompt: string
    user_prompt_template: string
    temperature: number
  }[]
}

export async function listPromptGroups(): Promise<PromptGroup[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ai_prompts')
    .select('id, slug, version, title, model, is_active, created_at, notes, system_prompt, user_prompt_template, temperature')
    .order('slug', { ascending: true })
    .order('version', { ascending: false })

  if (error) throw new Error(error.message)

  const groups = new Map<string, PromptGroup>()
  for (const row of data ?? []) {
    if (!groups.has(row.slug)) groups.set(row.slug, { slug: row.slug, versions: [] })
    groups.get(row.slug)!.versions.push(row)
  }
  return Array.from(groups.values())
}

export async function listComparisons(limit = 20) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('prompt_lab_comparisons')
    .select(
      'id, test_input, winner, notes, created_at, prompt_a:ai_prompts!prompt_lab_comparisons_prompt_a_id_fkey(slug, version), prompt_b:ai_prompts!prompt_lab_comparisons_prompt_b_id_fkey(slug, version)',
    )
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return data
}
