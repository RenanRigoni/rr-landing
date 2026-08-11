'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createActivitySchema } from '@/lib/validation/activities'

export interface ActivityFormState {
  error: string | null
}

export async function createActivity(
  _prevState: ActivityFormState,
  formData: FormData,
): Promise<ActivityFormState> {
  const dealId = formData.get('deal_id')
  const parsed = createActivitySchema.safeParse({
    deal_id: dealId,
    type: formData.get('type'),
    subject: formData.get('subject'),
    notes: formData.get('notes'),
    due_at: formData.get('due_at'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('activities').insert(parsed.data)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/deals/${parsed.data.deal_id}`)
  revalidatePath('/my-day')
  return { error: null }
}

export async function completeActivity(activityId: string, dealId: string, outcome: string | null) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('activities')
    .update({ status: 'done', completed_at: new Date().toISOString(), outcome })
    .eq('id', activityId)

  if (error) throw new Error(error.message)

  revalidatePath(`/deals/${dealId}`)
  revalidatePath('/my-day')
}

export async function deleteActivity(activityId: string, dealId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('activities').delete().eq('id', activityId)

  if (error) throw new Error(error.message)

  revalidatePath(`/deals/${dealId}`)
  revalidatePath('/my-day')
}
