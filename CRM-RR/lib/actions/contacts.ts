'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { contactSchema } from '@/lib/validation/contacts'
import { logAudit } from '@/lib/actions/audit'

export interface ContactFormState {
  error: string | null
}

function parseContactForm(formData: FormData) {
  return contactSchema.safeParse({
    full_name: formData.get('full_name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    role_title: formData.get('role_title'),
    company_id: formData.get('company_id'),
    linkedin_url: formData.get('linkedin_url'),
    notes: formData.get('notes'),
  })
}

export async function createContact(
  _prevState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const parsed = parseContactForm(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.from('contacts').insert(parsed.data).select('id').single()

  if (error) {
    return { error: error.message }
  }

  await logAudit(supabase, 'contact', data.id, 'contact_created')

  revalidatePath('/contacts')
  redirect(`/contacts/${data.id}`)
}

export async function updateContact(
  id: string,
  _prevState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const parsed = parseContactForm(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('contacts').update(parsed.data).eq('id', id)

  if (error) {
    return { error: error.message }
  }

  await logAudit(supabase, 'contact', id, 'contact_updated')

  revalidatePath('/contacts')
  revalidatePath(`/contacts/${id}`)
  redirect('/contacts')
}

export async function deleteContact(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('contacts').delete().eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  await logAudit(supabase, 'contact', id, 'contact_deleted')

  revalidatePath('/contacts')
  redirect('/contacts')
}
