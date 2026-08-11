import { createClient } from '@/lib/supabase/server'

export async function listLeadSources() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('lead_sources')
    .select('id, name')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}
