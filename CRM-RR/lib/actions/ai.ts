'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { runAiPrompt } from '@/lib/ai/gateway'
import { computeOverallScore } from '@/lib/domain/qualification-score'
import {
  qualifyDealOutputSchema,
  summarizeDealOutputSchema,
  draftFollowupEmailOutputSchema,
  type QualifyDealOutput,
  type SummarizeDealOutput,
  type DraftFollowupEmailOutput,
} from '@/lib/ai/schemas'

export type AiActionResult<T> = { ok: true; runId: string; output: T } | { ok: false; error: string }

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Erro desconhecido ao chamar a IA'
}

async function loadDealContext(dealId: string) {
  const supabase = await createClient()
  const { data: deal, error } = await supabase
    .from('deals')
    .select(
      `id, title, company_id, primary_contact_id,
      companies(company_name, industry, company_size, notes),
      contacts(full_name, role_title),
      pipeline_stages(name)`,
    )
    .eq('id', dealId)
    .single()

  if (error || !deal) throw new Error(error?.message ?? 'Deal não encontrado')
  return deal
}

export async function analyzeDealQualification(dealId: string): Promise<AiActionResult<QualifyDealOutput>> {
  try {
    const deal = await loadDealContext(dealId)
    const supabase = await createClient()

    const { data: qualification } = await supabase
      .from('qualifications')
      .select('id')
      .eq('deal_id', dealId)
      .maybeSingle()

    const { data: existingScores } = qualification
      ? await supabase
          .from('qualification_scores')
          .select('score, rationale, qualification_criteria(label)')
          .eq('qualification_id', qualification.id)
      : { data: null }

    const existingSummary =
      existingScores && existingScores.length > 0
        ? existingScores.map((s) => `${s.qualification_criteria?.label}: ${s.score}/5 (${s.rationale})`).join('; ')
        : 'Nenhuma pontuação registrada ainda.'

    const { runId, output } = await runAiPrompt({
      slug: 'qualify-deal',
      schema: qualifyDealOutputSchema,
      dealId,
      companyId: deal.company_id ?? undefined,
      contactId: deal.primary_contact_id ?? undefined,
      vars: {
        deal_title: deal.title,
        company_name: deal.companies?.company_name ?? 'Não informado',
        industry: deal.companies?.industry ?? 'Não informado',
        company_size: deal.companies?.company_size ?? 'Não informado',
        contact_name: deal.contacts?.full_name ?? 'Não informado',
        contact_role: deal.contacts?.role_title ?? 'Não informado',
        company_notes: deal.companies?.notes ?? 'Sem notas.',
        existing_scores_summary: existingSummary,
      },
    })

    revalidatePath(`/deals/${dealId}`)
    return { ok: true, runId, output }
  } catch (err) {
    return { ok: false, error: errorMessage(err) }
  }
}

export const ERROR_CATEGORIES = [
  'icp_classification',
  'company_size',
  'need_interpretation',
  'timing',
  'budget',
  'contact_role',
  'hallucinated_information',
  'missing_context',
  'wrong_recommendation',
  'other',
] as const

export type ErrorCategory = (typeof ERROR_CATEGORIES)[number]

/**
 * Marca uma sugestão de IA como revisada sem aplicar nenhuma mudança, e grava
 * feedback estruturado com categoria de erro (Regra 3: humano decide, nunca é
 * automático; alimenta a análise de erros recorrentes em /ai-quality).
 */
export async function rejectAiRun(
  runId: string,
  dealId: string,
  errorCategory: ErrorCategory,
  correctionNotes: string | null,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('ai_runs')
    .update({ status: 'reviewed', applied: false, reviewed_at: new Date().toISOString() })
    .eq('id', runId)

  if (error) return { error: error.message }

  await supabase.from('ai_feedback').insert({
    ai_run_id: runId,
    is_useful: false,
    error_category: errorCategory,
    correction_notes: correctionNotes,
  })

  await supabase.from('audit_log').insert({
    entity_type: 'ai_run',
    entity_id: runId,
    action: 'ai_suggestion_rejected',
    diff: { error_category: errorCategory },
  })

  revalidatePath(`/deals/${dealId}`)
  revalidatePath('/ai-quality')
  return { error: null }
}

/**
 * Aplica a sugestão de qualificação da IA como uma qualificação real —
 * ação humana explícita (clique em "Aplicar"), nunca automática.
 */
export async function applyQualificationSuggestion(
  runId: string,
  dealId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient()

  const { data: run, error: runError } = await supabase
    .from('ai_runs')
    .select('parsed_output')
    .eq('id', runId)
    .maybeSingle()

  if (runError || !run) return { error: runError?.message ?? 'Execução de IA não encontrada' }

  const parsed = qualifyDealOutputSchema.safeParse(run.parsed_output)
  if (!parsed.success) return { error: 'Output de IA em formato inesperado' }

  const { data: criteria, error: criteriaError } = await supabase
    .from('qualification_criteria')
    .select('id, key, weight, max_score')
    .eq('is_active', true)

  if (criteriaError) return { error: criteriaError.message }

  const criteriaByKey = new Map((criteria ?? []).map((c) => [c.key, c]))

  const entries = parsed.data.criteria
    .map((suggestion) => {
      const criterion = criteriaByKey.get(suggestion.key)
      if (!criterion) return null
      return {
        criterionId: criterion.id,
        score: suggestion.suggestedScore,
        rationale: `[Sugerido por IA, confiança ${suggestion.confidence}] ${suggestion.reasoning}`,
        weight: criterion.weight,
        maxScore: criterion.max_score,
      }
    })
    .filter((e): e is NonNullable<typeof e> => e !== null)

  if (entries.length === 0) return { error: 'Nenhum critério reconhecido no output da IA' }

  const overallScore = computeOverallScore(
    entries.map((e) => ({ criterionId: e.criterionId, score: e.score, weight: e.weight, maxScore: e.maxScore, isActive: true })),
  )

  const { data: existing } = await supabase.from('qualifications').select('id').eq('deal_id', dealId).maybeSingle()

  let qualificationId = existing?.id
  if (qualificationId) {
    await supabase
      .from('qualifications')
      .update({ overall_score: overallScore, summary: parsed.data.overallAssessment, qualified_by: 'ai' })
      .eq('id', qualificationId)
    await supabase.from('qualification_scores').delete().eq('qualification_id', qualificationId)
  } else {
    const { data: created, error } = await supabase
      .from('qualifications')
      .insert({ deal_id: dealId, overall_score: overallScore, summary: parsed.data.overallAssessment, qualified_by: 'ai' })
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

  await supabase.from('deals').update({ qualification_score: overallScore }).eq('id', dealId)

  await supabase.from('qualification_history').insert({
    deal_id: dealId,
    snapshot: {
      overall_score: overallScore,
      source: 'ai',
      ai_run_id: runId,
      entries: entries.map((e) => ({ criterion_id: e.criterionId, score: e.score, rationale: e.rationale })),
    },
  })

  await supabase
    .from('ai_runs')
    .update({ status: 'reviewed', applied: true, reviewed_at: new Date().toISOString() })
    .eq('id', runId)

  await supabase.from('ai_feedback').insert({ ai_run_id: runId, is_useful: true })

  await supabase.from('audit_log').insert({
    entity_type: 'ai_run',
    entity_id: runId,
    action: 'ai_suggestion_accepted',
    diff: { overall_score: overallScore },
  })

  revalidatePath(`/deals/${dealId}`)
  revalidatePath('/ai-quality')
  return { error: null }
}

/**
 * Marca um output de IA (resumo, e-mail) como usado — não há campo estruturado
 * do CRM para "aplicar" nesses casos, então isso só registra que o humano
 * revisou e considerou útil (usado no cálculo de aceitação em /ai-quality).
 */
export async function acknowledgeAiRun(runId: string, dealId: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('ai_runs')
    .update({ status: 'reviewed', applied: true, reviewed_at: new Date().toISOString() })
    .eq('id', runId)

  if (error) return { error: error.message }

  await supabase.from('ai_feedback').insert({ ai_run_id: runId, is_useful: true })

  await supabase.from('audit_log').insert({
    entity_type: 'ai_run',
    entity_id: runId,
    action: 'ai_suggestion_accepted',
    diff: null,
  })

  revalidatePath(`/deals/${dealId}`)
  revalidatePath('/ai-quality')
  return { error: null }
}

export async function summarizeDeal(dealId: string): Promise<AiActionResult<SummarizeDealOutput>> {
  try {
    const deal = await loadDealContext(dealId)
    const supabase = await createClient()

    const { data: activities } = await supabase
      .from('activities')
      .select('subject, status, type, created_at')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false })
      .limit(5)

    const recentActivities =
      activities && activities.length > 0
        ? activities.map((a) => `${a.type} — ${a.subject} (${a.status})`).join('; ')
        : 'Nenhuma atividade registrada.'

    const { data: qualification } = await supabase
      .from('qualifications')
      .select('overall_score, summary')
      .eq('deal_id', dealId)
      .maybeSingle()

    const { runId, output } = await runAiPrompt({
      slug: 'summarize-deal',
      schema: summarizeDealOutputSchema,
      dealId,
      companyId: deal.company_id ?? undefined,
      contactId: deal.primary_contact_id ?? undefined,
      vars: {
        company_name: deal.companies?.company_name ?? 'Não informado',
        deal_title: deal.title,
        stage_name: deal.pipeline_stages?.name ?? 'Não informado',
        deal_value: 'não informado no contexto',
        recent_activities: recentActivities,
        qualification_summary: qualification
          ? `Score ${qualification.overall_score ?? '—'}/100. ${qualification.summary ?? ''}`
          : 'Ainda não qualificado.',
      },
    })

    revalidatePath(`/deals/${dealId}`)
    return { ok: true, runId, output }
  } catch (err) {
    return { ok: false, error: errorMessage(err) }
  }
}

export async function draftFollowupEmail(dealId: string): Promise<AiActionResult<DraftFollowupEmailOutput>> {
  try {
    const deal = await loadDealContext(dealId)
    const supabase = await createClient()

    const { data: lastActivity } = await supabase
      .from('activities')
      .select('subject, notes, type, created_at')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const { runId, output } = await runAiPrompt({
      slug: 'draft-followup-email',
      schema: draftFollowupEmailOutputSchema,
      dealId,
      companyId: deal.company_id ?? undefined,
      contactId: deal.primary_contact_id ?? undefined,
      vars: {
        company_name: deal.companies?.company_name ?? 'Não informado',
        contact_name: deal.contacts?.full_name ?? 'Não informado',
        contact_role: deal.contacts?.role_title ?? 'Não informado',
        deal_title: deal.title,
        stage_name: deal.pipeline_stages?.name ?? 'Não informado',
        last_interaction_context: lastActivity
          ? `${lastActivity.type}: ${lastActivity.subject}${lastActivity.notes ? ' — ' + lastActivity.notes : ''}`
          : 'Nenhuma interação registrada ainda.',
      },
    })

    revalidatePath(`/deals/${dealId}`)
    return { ok: true, runId, output }
  } catch (err) {
    return { ok: false, error: errorMessage(err) }
  }
}
