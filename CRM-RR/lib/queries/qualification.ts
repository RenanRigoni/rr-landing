import { createClient } from '@/lib/supabase/server'

export async function listQualificationCriteria() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('qualification_criteria')
    .select('id, key, label, description, weight, max_score, is_active, position')
    .eq('is_active', true)
    .order('position', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

export async function getDealQualification(dealId: string) {
  const supabase = await createClient()
  const { data: qualification, error } = await supabase
    .from('qualifications')
    .select('id, overall_score, summary, qualified_by, updated_at')
    .eq('deal_id', dealId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!qualification) return null

  const { data: scores, error: scoresError } = await supabase
    .from('qualification_scores')
    .select('criterion_id, score, rationale, qualification_criteria(label, weight, max_score)')
    .eq('qualification_id', qualification.id)

  if (scoresError) throw new Error(scoresError.message)

  return { qualification, scores: scores ?? [] }
}
