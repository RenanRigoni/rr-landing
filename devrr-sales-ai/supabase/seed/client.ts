import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../lib/types/database.types'

/**
 * Client de service role para os scripts de seed — ignora RLS.
 *
 * Não importa `lib/supabase/admin.ts` de propósito: aquele arquivo tem
 * `import 'server-only'`, que lança sempre que roda fora do bundler do Next
 * (inclusive em Node puro, como aqui) — o pacote só existe para barrar o
 * import no bundle do browser, não distingue "servidor real" de "script
 * standalone". Mesmo motivo pelo qual `tests/helpers/rls-fixtures.ts` também
 * monta o seu próprio client. A chave vem direto de `process.env`, populada
 * por `./load-env`.
 *
 * `service_role` aqui é uso legítimo: script server-only de dados de
 * demonstração (`ARCHITECTURE.md` → Segurança; `admin.ts` doc). Nunca é
 * chamado por request de usuário.
 */
export function createSeedClient(): SupabaseClient<Database, 'sales'> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL ausente — confira o .env.local.')
  }
  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY ausente — necessária só para os scripts de seed, nunca no app. Confira o .env.local.',
    )
  }

  return createClient<Database, 'sales'>(url, serviceRoleKey, {
    db: { schema: 'sales' },
    auth: { persistSession: false },
  })
}
