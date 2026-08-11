'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { criterionEntrySchema } from '@/lib/validation/qualification'
import { computeOverallScore } from '@/lib/domain/qualification-score'

export interface QualificationFormState {
  error: string | null
}

export async function saveQualification(
  dealId: string,
  _prevState: QualificationFormState,
  formData: FormData,
): Promise<QualificationFormState> {
  const supabase = await createClient()

  const { data: criteria, error: criteriaError } = await supabase
    .from('qualification_criteria')
    .select('id, label, weight, max_score, is_active')
    .eq('is_active', true)

  if (criteriaError) return { error: criteriaError.message }

  const entries: { criterionId: string; label: string; score: number; rationale: string; weight: number; maxScore: number }[] = []

  for (const criterion of criteria ?? []) {
    const rawScore = formData.get(`score_${criterion.id}`)
    if (rawScore === null || rawScore === '') continue

    const parsed = criterionEntrySchema.safeParse({
      score: rawScore,
      rationale: formData.get(`rationale_${criterion.id}`),
    })
    if (!parsed.success) {
      return { error: `${criterion.label}: ${parsed.error.issues[0]?.message ?? 'dados inválidos'}` }
    }

    entries.push({
      criterionId: criterion.id,
      label: criterion.label,
      score: parsed.data.score,
      rationale: parsed.data.rationale,
      weight: criterion.weight,
      maxScore: criterion.max_score,
    })
  }

  if (entries.length === 0) {
    return { error: 'Pontue pelo menos um critério com justificativa' }
  }

  const overallScore = computeOverallScore(
    entries.map((e) => ({ criterionId: e.criterionId, score: e.score, weight: e.weight, maxScore: e.maxScore, isActive: true })),
  )

  const summary = formData.get('summary')

  const { data: existing } = await supabase
    .from('qualifications')
    .select('id')
    .eq('deal_id', dealId)
    .maybeSingle()

  let qualificationId = existing?.id

  if (qualificationId) {
    const { error } = await supabase
      .from('qualifications')
      .update({ overall_score: overallScore, summary: typeof summary === 'string' ? summary : null })
      .eq('id', qualificationId)
    if (error) return { error: error.message }

    await supabase.from('qualification_scores').delete().eq('qualification_id', qualificationId)
  } else {
    const { data: created, error } = await supabase
      .from('qualifications')
      .insert({
        deal_id: dealId,
        overall_score: overallScore,
        summary: typeof summary === 'string' ? summary : null,
        qualified_by: 'human',
      })
      .select('id')
      .single()
    if (error) return { error: error.message }
    qualificationId = created.id
  }

  const { error: scoresError } = await supabase.from('qualification_scores').insert(
    entries.map((e) => ({
      qualification_id: qualificationId!,
      criterion_id: e.criterionId,
      score: e.score,
      rationale: e.rationale,
    })),
  )
  if (scoresError) return { error: scoresError.message }

  const { error: dealUpdateError } = await supabase
    .from('deals')
    .update({ qualification_score: overallScore })
    .eq('id', dealId)
  if (dealUpdateError) return { error: dealUpdateError.message }

  await supabase.from('qualification_history').insert({
    deal_id: dealId,
    snapshot: {
      overall_score: overallScore,
      entries: entries.map((e) => ({ criterion_id: e.criterionId, label: e.label, score: e.score, rationale: e.rationale })),
    },
  })

  await supabase.from('audit_log').insert({
    entity_type: 'deal',
    entity_id: dealId,
    action: 'qualification_updated',
    diff: { overall_score: overallScore },
  })

  revalidatePath(`/deals/${dealId}`)
  return { error: null }
}
