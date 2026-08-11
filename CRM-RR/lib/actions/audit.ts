import 'server-only'
import type { createClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/types/database.types'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

/**
 * Regra 10: registros comerciais devem ser rastreáveis. Helper compartilhado
 * para todo Server Action que muta uma entidade de negócio gravar em
 * crm.audit_log como parte da mesma operação.
 */
export async function logAudit(
  supabase: SupabaseServerClient,
  entityType: string,
  entityId: string,
  action: string,
  diff: Json | null = null,
): Promise<void> {
  await supabase.from('audit_log').insert({ entity_type: entityType, entity_id: entityId, action, diff })
}
