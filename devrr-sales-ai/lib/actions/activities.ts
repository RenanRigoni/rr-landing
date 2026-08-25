'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireOrgId } from '@/lib/queries/require-org'
import {
  createActivityCore,
  completeActivityCore,
  cancelActivityCore,
  rescheduleActivityCore,
} from '@/lib/actions/activities-core'
import type { StageActionResult } from '@/lib/actions/leads-core'

function revalidateActivityPaths(leadId: string | undefined): void {
  revalidatePath('/today')
  revalidatePath('/leads')
  if (leadId) {
    revalidatePath(`/leads/${leadId}`)
  }
}

export async function createActivity(input: unknown): Promise<StageActionResult & { id?: string }> {
  const orgId = await requireOrgId()
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const result = await createActivityCore(supabase, orgId, user?.id ?? null, input)

  if (!result.error) {
    revalidateActivityPaths(result.leadId)
  }

  return result
}

export async function completeActivity(activityId: string, input: unknown = {}): Promise<StageActionResult> {
  const orgId = await requireOrgId()
  const supabase = await createClient()

  const result = await completeActivityCore(supabase, orgId, activityId, input)

  if (!result.error) {
    revalidateActivityPaths(result.leadId)
  }

  return result
}

export async function cancelActivity(activityId: string): Promise<StageActionResult> {
  const orgId = await requireOrgId()
  const supabase = await createClient()

  const result = await cancelActivityCore(supabase, orgId, activityId)

  if (!result.error) {
    revalidateActivityPaths(result.leadId)
  }

  return result
}

export async function rescheduleActivity(activityId: string, input: unknown): Promise<StageActionResult> {
  const orgId = await requireOrgId()
  const supabase = await createClient()

  const result = await rescheduleActivityCore(supabase, orgId, activityId, input)

  if (!result.error) {
    revalidateActivityPaths(result.leadId)
  }

  return result
}
