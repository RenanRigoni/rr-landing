import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/lib/types/database.types'

type SalesClient = SupabaseClient<Database, 'sales'>

/**
 * Trilha de auditoria de operações comerciais (`sales.audit_logs`, migration
 * 0011). Portado de `../CRM-RR/lib/actions/audit.ts` com a assinatura
 * adaptada ao padrão multi-tenant deste projeto:
 *
 * - recebe `client` + `orgId` + `userId` explícitos, no mesmo formato de
 *   todo `*-core` (D-020) e de `lib/ai/gateway.ts` (D-028) — quem resolve
 *   sessão/organização é a action `'use server'`, nunca esta camada;
 * - sem `import 'server-only'` (o do CRM-RR foi removido): o pacote lança
 *   fora do bundler do Next, inclusive em vitest, e isso impediria os
 *   testes `test:rls` de exercitarem o log direto contra o Supabase real
 *   (mesma exceção de `gateway.ts`/`ai-context.ts`).
 *
 * Best-effort, como no CRM-RR: uma falha ao gravar o log **não** derruba a
 * operação de negócio que já foi concluída — o registro de auditoria é
 * complementar, não é o efeito principal. O erro do `insert` é engolido de
 * propósito (não há `throw` nem retorno de erro).
 */
export async function logAudit(
  supabase: SalesClient,
  orgId: string,
  userId: string | null,
  entity: string,
  entityId: string | null,
  action: string,
  diff: Json | null = null,
): Promise<void> {
  await supabase.from('audit_logs').insert({
    org_id: orgId,
    user_id: userId,
    entity,
    entity_id: entityId,
    action,
    diff,
  })
}
