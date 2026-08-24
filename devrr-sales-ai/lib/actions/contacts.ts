'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireOrgId } from '@/lib/queries/require-org'
import { createContactCore, updateContactCore, type ActionResult } from '@/lib/actions/contacts-core'

export async function createContact(input: unknown): Promise<ActionResult & { id?: string }> {
  const orgId = await requireOrgId()
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const result = await createContactCore(supabase, orgId, user?.id ?? null, input)

  if (!result.error) {
    revalidatePath('/contacts')
  }

  return result
}

export async function updateContact(contactId: string, input: unknown): Promise<ActionResult> {
  const orgId = await requireOrgId()
  const supabase = await createClient()

  const result = await updateContactCore(supabase, orgId, contactId, input)

  if (!result.error) {
    revalidatePath('/contacts')
    revalidatePath(`/contacts/${contactId}`)
  }

  return result
}
