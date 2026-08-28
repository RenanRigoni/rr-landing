import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { requireOrgId } from '@/lib/queries/require-org'
import {
  getLatestAuditForLeadCore,
  getAuditByIdCore,
  listAuditsForLeadCore,
  listLatestAuditsByLeadCore,
  type DigitalAudit,
} from '@/lib/queries/digital-audits-core'

export type { DigitalAudit }

/**
 * Leitura do dossiê digital para Server Components (7.5). Assinaturas exatas
 * de `docs/IMPLEMENTATION_PLAN.md` → 7.5: cada função resolve `org_id`
 * (sempre de `requireOrgId()`, nunca do cliente) e o client de sessão, e
 * delega a query para `lib/queries/digital-audits-core.ts` — mesma divisão
 * de `lib/actions/*-core.ts` (D-020) e de `buildFollowupContext` (D-030),
 * aqui necessária porque `import 'server-only'` (linha acima) lança se este
 * módulo for importado fora do bundler do Next, inclusive em teste vitest —
 * o núcleo testável vive no `-core`, sem essa guarda.
 */

export async function getLatestAuditForLead(leadId: string): Promise<DigitalAudit | null> {
  const orgId = await requireOrgId()
  const supabase = await createClient()
  return getLatestAuditForLeadCore(supabase, orgId, leadId)
}

export async function getAuditById(auditId: string): Promise<DigitalAudit | null> {
  const orgId = await requireOrgId()
  const supabase = await createClient()
  return getAuditByIdCore(supabase, orgId, auditId)
}

export async function listAuditsForLead(leadId: string): Promise<DigitalAudit[]> {
  const orgId = await requireOrgId()
  const supabase = await createClient()
  return listAuditsForLeadCore(supabase, orgId, leadId)
}

export async function listLatestAuditsByLead(leadIds: string[]): Promise<Map<string, DigitalAudit>> {
  const orgId = await requireOrgId()
  const supabase = await createClient()
  return listLatestAuditsByLeadCore(supabase, orgId, leadIds)
}
