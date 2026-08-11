import { createClient } from '@/lib/supabase/server'

export async function listCompanies() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('companies')
    .select('id, company_name, industry, city, icp_fit, is_demo, created_at')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

export async function getCompany(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('companies').select('*').eq('id', id).maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

export async function listCompanyContacts(companyId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('contacts')
    .select('id, full_name, role_title, email')
    .eq('company_id', companyId)
    .order('full_name', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}
