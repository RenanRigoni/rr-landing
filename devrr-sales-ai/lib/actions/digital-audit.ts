'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireOrgId } from '@/lib/queries/require-org'
import { saveDigitalAuditCore, type DigitalAuditResult } from '@/lib/actions/digital-audit-core'

/**
 * Server Action do dossiê digital (7.4). Resolve sessão/organização e delega
 * ao core (D-020). Sem `redirect`: salvar dossiê é preenchimento incremental,
 * o usuário fica na tela do lead — só revalida a página.
 */
export async function saveDigitalAudit(
  _prevState: DigitalAuditResult,
  formData: FormData,
): Promise<DigitalAuditResult> {
  const orgId = await requireOrgId()
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // `digital_opportunities` é multi-valor (checkboxes): `Object.fromEntries`
  // guarda só o último, `getAll` devolve todos. O resto do formulário é 1:1.
  const raw: Record<string, unknown> = {
    ...Object.fromEntries(formData),
    digital_opportunities: formData.getAll('digital_opportunities'),
  }

  const result = await saveDigitalAuditCore(supabase, orgId, user?.id ?? null, raw)

  if (result.error) {
    return result
  }

  revalidatePath('/leads/[leadId]', 'page')
  return result
}
