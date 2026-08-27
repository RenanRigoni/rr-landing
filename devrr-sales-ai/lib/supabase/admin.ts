import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'
import { publicEnv } from '@/lib/env'
import { serverEnv } from '@/lib/env.server'

/**
 * Client com service role — ignora RLS. `server-only` é condição necessária,
 * não suficiente: o critério real é "a identidade do chamador decide o que a
 * query alcança?" — se decide, `service_role` destrói a RLS (D-034).
 *
 * Lista fechada de usos permitidos, e só estes:
 * 1. scripts de seed/purge de dados demo (`supabase/seed/*`);
 * 2. fixtures de teste de RLS (`tests/helpers/rls-fixtures.ts`);
 * 3. jobs administrativos internos cross-tenant em `app/api/cron/*`, que não
 *    têm sessão por natureza e são autenticados por `CRON_SECRET` comparado
 *    em tempo constante **antes** de este client ser construído.
 *
 * Proibido em qualquer outro lugar — em especial em Server Action acionada
 * por request de usuário e em rota cujo escopo dependa de entrada do cliente.
 * Nunca importar a partir de código que roda no browser.
 */
export function createAdminClient() {
  return createSupabaseClient<Database, 'sales'>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    { db: { schema: 'sales' }, auth: { persistSession: false } },
  )
}
