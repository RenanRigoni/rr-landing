'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface ProcessFeedbackFormState {
  error: string | null
}

export async function createProcessFeedback(
  processSlug: string,
  processId: string,
  _prevState: ProcessFeedbackFormState,
  formData: FormData,
): Promise<ProcessFeedbackFormState> {
  const feedbackType = formData.get('feedback_type')
  const content = String(formData.get('content') ?? '').trim()

  if (!content) return { error: 'Descreva o feedback' }
  if (!['friction', 'idea', 'win', 'bug'].includes(String(feedbackType))) {
    return { error: 'Categoria inválida' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('process_feedback').insert({
    process_id: processId,
    feedback_type: feedbackType as 'friction' | 'idea' | 'win' | 'bug',
    content,
  })

  if (error) return { error: error.message }

  revalidatePath(`/processes/${processSlug}`)
  return { error: null }
}
