import { createClient } from '@/lib/supabase/server'

export async function listPlaybooks() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('playbooks')
    .select('id, slug, title, type, status, version, updated_at')
    .order('type', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

export async function getPlaybook(slug: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('playbooks').select('*, process_docs(title, slug)').eq('slug', slug).maybeSingle()

  if (error) throw new Error(error.message)
  return data
}
