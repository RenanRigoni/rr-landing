import { createClient } from '@/lib/supabase/server'

export async function listDealActivities(dealId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('activities')
    .select('id, type, status, subject, notes, due_at, completed_at, outcome, created_at')
    .eq('deal_id', dealId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}
