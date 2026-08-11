'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createDealSchema, moveDealStageSchema } from '@/lib/validation/deals'
import { isLostReasonRequired } from '@/lib/domain/lost-reason-rules'
import { logAudit } from '@/lib/actions/audit'

export interface DealFormState {
  error: string | null
}

export async function createDeal(_prevState: DealFormState, formData: FormData): Promise<DealFormState> {
  const valueReais = formData.get('value_reais')
  const valueCents = valueReais ? Math.round(Number(valueReais) * 100) : 0

  const parsed = createDealSchema.safeParse({
    title: formData.get('title'),
    company_id: formData.get('company_id'),
    primary_contact_id: formData.get('primary_contact_id'),
    pipeline_id: formData.get('pipeline_id'),
    stage_id: formData.get('stage_id'),
    value_cents: Number.isFinite(valueCents) ? valueCents : 0,
    source_id: formData.get('source_id'),
    expected_close_date: formData.get('expected_close_date'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.from('deals').insert(parsed.data).select('id').single()

  if (error) {
    return { error: error.message }
  }

  await logAudit(supabase, 'deal', data.id, 'deal_created')

  revalidatePath('/pipeline')
  redirect(`/deals/${data.id}`)
}

/**
 * Move um deal para outro estágio. Se o estágio de destino é terminal
 * (is_won/is_lost), deriva deals.status automaticamente — o trigger de
 * banco crm.fn_enforce_lost_reason garante que 'lost' nunca é gravado sem
 * lost_reason_id, mesmo que esta validação de aplicação seja contornada.
 */
export async function moveDealStage(dealId: string, input: unknown): Promise<{ error: string | null }> {
  const parsed = moveDealStageSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const supabase = await createClient()

  const { data: stage, error: stageError } = await supabase
    .from('pipeline_stages')
    .select('is_won, is_lost')
    .eq('id', parsed.data.stage_id)
    .single()

  if (stageError || !stage) {
    return { error: stageError?.message ?? 'Estágio não encontrado' }
  }

  if (isLostReasonRequired(stage.is_lost, parsed.data.lost_reason_id)) {
    return { error: 'Motivo de perda é obrigatório' }
  }

  const status = stage.is_won ? 'won' : stage.is_lost ? 'lost' : 'open'
  const closedAt = stage.is_won || stage.is_lost ? new Date().toISOString() : null

  const { error } = await supabase
    .from('deals')
    .update({
      stage_id: parsed.data.stage_id,
      status,
      closed_at: closedAt,
      lost_reason_id: stage.is_lost ? parsed.data.lost_reason_id : null,
      lost_reason_notes: stage.is_lost ? parsed.data.lost_reason_notes : null,
    })
    .eq('id', dealId)

  if (error) {
    return { error: error.message }
  }

  await logAudit(
    supabase,
    'deal',
    dealId,
    stage.is_won ? 'marked_won' : stage.is_lost ? 'marked_lost' : 'stage_changed',
    { stage_id: parsed.data.stage_id, status },
  )

  revalidatePath('/pipeline')
  revalidatePath(`/deals/${dealId}`)
  revalidatePath('/my-day')
  return { error: null }
}

export async function deleteDeal(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('deals').delete().eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  await logAudit(supabase, 'deal', id, 'deal_deleted')

  revalidatePath('/pipeline')
  redirect('/pipeline')
}
