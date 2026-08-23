import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'
import { publicEnv } from '@/lib/env'
import { serverEnv } from '@/lib/env.server'

/**
 * Client com service role — ignora RLS. Só para scripts server-only
 * (seed/purge de dados demo). Nunca importar a partir de código que roda
 * no browser ou de Server Actions acionadas por request de usuário.
 */
export function createAdminClient() {
  return createSupabaseClient<Database, 'sales'>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    { db: { schema: 'sales' }, auth: { persistSession: false } },
  )
}
