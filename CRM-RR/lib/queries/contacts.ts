import { createClient } from '@/lib/supabase/server'

export async function listContacts() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('contacts')
    .select('id, full_name, role_title, email, phone, company_id, companies(company_name)')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

export async function getContact(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('contacts').select('*').eq('id', id).maybeSingle()

  if (error) throw new Error(error.message)
  return data
}
