'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireOrgId } from '@/lib/queries/require-org'
import {
  createLeadCore,
  updateLeadCore,
  moveStageCore,
  markRespondedCore,
  type ActionResult,
  type StageActionResult,
} from '@/lib/actions/leads-core'

export async function createLead(input: unknown): Promise<ActionResult & { id?: string }> {
  const orgId = await requireOrgId()
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const result = await createLeadCore(supabase, orgId, user?.id ?? null, input)

  if (!result.error) {
    revalidatePath('/leads')
  }

  return result
}

export async function updateLead(leadId: string, input: unknown): Promise<ActionResult> {
  const orgId = await requireOrgId()
  const supabase = await createClient()

  const result = await updateLeadCore(supabase, orgId, leadId, input)

  if (!result.error) {
    revalidatePath('/leads')
    revalidatePath(`/leads/${leadId}`)
  }

  return result
}

export async function moveStage(leadId: string, stageId: string): Promise<StageActionResult> {
  const orgId = await requireOrgId()
  const supabase = await createClient()

  const result = await moveStageCore(supabase, orgId, leadId, stageId)

  if (!result.error) {
    revalidatePath('/leads')
    revalidatePath(`/leads/${leadId}`)
    revalidatePath('/today')
  }

  return result
}

export async function markResponded(leadId: string): Promise<StageActionResult> {
  const orgId = await requireOrgId()
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const result = await markRespondedCore(supabase, orgId, leadId, user?.id ?? null)

  if (!result.error) {
    revalidatePath('/leads')
    revalidatePath(`/leads/${leadId}`)
    revalidatePath('/today')
  }

  return result
}
