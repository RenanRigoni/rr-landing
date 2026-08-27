'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireOrgId } from '@/lib/queries/require-org'
import {
  generateFollowupMessageCore,
  applyFollowupMessageCore,
  discardAiRunCore,
  type GenerateFollowupResult,
  type ApplyFollowupMessageInput,
} from '@/lib/actions/ai-followup-core'
import type { ActionResult, StageActionResult } from '@/lib/actions/leads-core'

/**
 * Wrappers `'use server'` da 5.4 — resolvem sessão/organização
 * (`requireOrgId()` sempre server-side, nunca do cliente) e delegam para o
 * núcleo testável (`ai-followup-core.ts`). Nenhuma regra de negócio aqui.
 */

function revalidateFollowupPaths(leadId: string | undefined): void {
  revalidatePath('/today')
  revalidatePath('/leads')
  if (leadId) {
    revalidatePath(`/leads/${leadId}`)
  }
}

export async function generateFollowupMessage(leadId: string): Promise<GenerateFollowupResult> {
  const orgId = await requireOrgId()
  const supabase = await createClient()

  return generateFollowupMessageCore(supabase, orgId, leadId)
}

export async function applyFollowupMessage(input: ApplyFollowupMessageInput): Promise<StageActionResult> {
  const orgId = await requireOrgId()
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const result = await applyFollowupMessageCore(supabase, orgId, user?.id ?? null, input)

  if (!result.error) {
    revalidateFollowupPaths(result.leadId)
  }

  return result
}

export async function discardAiRun(runId: string): Promise<ActionResult> {
  const orgId = await requireOrgId()
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return discardAiRunCore(supabase, orgId, user?.id ?? null, runId)
}
