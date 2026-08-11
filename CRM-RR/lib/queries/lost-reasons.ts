import { createClient } from '@/lib/supabase/server'

export async function listLostReasons() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('lost_reasons')
    .select('id, label, category')
    .eq('is_active', true)
    .order('label', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}
