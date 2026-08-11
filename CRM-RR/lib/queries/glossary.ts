import { createClient } from '@/lib/supabase/server'

export async function listGlossaryTerms() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('glossary_terms')
    .select('id, term, definition')
    .order('term', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}
