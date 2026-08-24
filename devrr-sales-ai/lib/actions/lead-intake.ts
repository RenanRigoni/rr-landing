'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireOrgId } from '@/lib/queries/require-org'
import { createLeadIntakeCore, type LeadIntakeResult } from '@/lib/actions/lead-intake-core'

export async function createLeadIntake(_prevState: LeadIntakeResult, formData: FormData): Promise<LeadIntakeResult> {
  const orgId = await requireOrgId()
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const result = await createLeadIntakeCore(supabase, orgId, user?.id ?? null, Object.fromEntries(formData))

  if (result.status !== 'success') {
    return result
  }

  revalidatePath('/leads')
  redirect(`/leads/${result.leadId}`)
}
