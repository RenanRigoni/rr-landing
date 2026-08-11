'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { companySchema } from '@/lib/validation/companies'

export interface CompanyFormState {
  error: string | null
}

function parseCompanyForm(formData: FormData) {
  return companySchema.safeParse({
    company_name: formData.get('company_name'),
    website: formData.get('website'),
    industry: formData.get('industry'),
    company_size: formData.get('company_size'),
    city: formData.get('city'),
    state: formData.get('state'),
    country: formData.get('country'),
    estimated_revenue_range: formData.get('estimated_revenue_range'),
    acquisition_source_id: formData.get('acquisition_source_id'),
    icp_fit: formData.get('icp_fit'),
    notes: formData.get('notes'),
  })
}

export async function createCompany(
  _prevState: CompanyFormState,
  formData: FormData,
): Promise<CompanyFormState> {
  const parsed = parseCompanyForm(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.from('companies').insert(parsed.data).select('id').single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/companies')
  redirect(`/companies/${data.id}`)
}

export async function updateCompany(
  id: string,
  _prevState: CompanyFormState,
  formData: FormData,
): Promise<CompanyFormState> {
  const parsed = parseCompanyForm(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('companies').update(parsed.data).eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/companies')
  revalidatePath(`/companies/${id}`)
  return { error: null }
}

export async function deleteCompany(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('companies').delete().eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/companies')
  redirect('/companies')
}
