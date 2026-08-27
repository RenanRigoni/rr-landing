import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { publicEnv } from '@/lib/env'
import type { Database } from '@/lib/types/database.types'

/**
 * Fixtures para tests/rls.test.ts. Roda contra o Supabase real (não há mock
 * que prove RLS) — ver docs/IMPLEMENTATION_PLAN.md → 2.4 e README.md → Testes
 * de RLS.
 *
 * Contas reais e persistentes no projeto Supabase compartilhado, domínio
 * `.test` (reservado pela IANA para este fim, nunca resolve de verdade —
 * nenhum e-mail é enviado, `email_confirm: true` na criação já pula a
 * confirmação). Isoladas por natureza: tudo que criam vive em
 * `sales.organizations`/`sales.org_members`, sem tocar `crm` nem os dados
 * reais de outros projetos no mesmo banco.
 *
 * Não importa `lib/supabase/admin.ts`: esse arquivo tem `import 'server-only'`,
 * que lança sempre que executado fora do bundler do Next (mesmo em Node puro,
 * como aqui) — o pacote não distingue "servidor real" de "teste standalone",
 * só existe pra barrar import no bundle do browser. O client de service role
 * abaixo é próprio deste arquivo de teste, lendo a chave direto de
 * `process.env` (populada via `loadEnv` nos vitest.*.config.ts).
 */
export function testAdminClient(): SupabaseClient<Database, 'sales'> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente — necessária só para fixtures de teste, nunca no app.')
  }

  return createClient<Database, 'sales'>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey, {
    db: { schema: 'sales' },
    auth: { persistSession: false },
  })
}

export const TEST_USER_A = {
  email: 'rls-test-a@devrr-sales-ai.test',
  password: 'Rls-Test-A-2026!x',
}

export const TEST_USER_B = {
  email: 'rls-test-b@devrr-sales-ai.test',
  password: 'Rls-Test-B-2026!x',
}

function anonAuthClient(): SupabaseClient<Database, 'sales'> {
  return createClient<Database, 'sales'>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { db: { schema: 'sales' } },
  )
}

/** Alias claro para uso nos testes de "usuário anônimo não lê nada". */
export const anonClient = anonAuthClient

/**
 * Garante que o usuário de teste existe, com a senha esperada, e devolve seu
 * `user_id`. Idempotente: tenta logar primeiro (rápido, sem tocar admin API);
 * só usa `service_role` para criar a conta se o login falhar. `service_role`
 * aqui é provisionamento de fixture — não faz parte de nenhuma asserção de
 * RLS, só existe fora do que está sendo testado.
 */
export async function ensureTestUser(fixture: { email: string; password: string }): Promise<string> {
  const probe = anonAuthClient()
  const { data: signInData, error: signInError } = await probe.auth.signInWithPassword(fixture)

  if (!signInError && signInData.user) {
    await probe.auth.signOut()
    return signInData.user.id
  }

  const admin = testAdminClient()
  const { data, error } = await admin.auth.admin.createUser({
    email: fixture.email,
    password: fixture.password,
    email_confirm: true,
  })

  if (error || !data.user) {
    throw new Error(
      `Não foi possível provisionar o usuário de teste ${fixture.email}: ${error?.message ?? 'erro desconhecido'}. ` +
        'Se ele já existe com senha diferente, apague-o em Authentication → Users no dashboard e rode de novo.',
    )
  }

  return data.user.id
}

/** Cliente autenticado de verdade (chave anon + sessão real) — é isto que a RLS enxerga como `authenticated`. */
export async function signInTestClient(
  fixture: { email: string; password: string },
): Promise<SupabaseClient<Database, 'sales'>> {
  const client = anonAuthClient()
  const { error } = await client.auth.signInWithPassword(fixture)

  if (error) {
    throw new Error(`Falha ao autenticar ${fixture.email}: ${error.message}`)
  }

  return client
}

/**
 * Remove toda organização da qual o usuário é membro. Só roda antes/depois
 * da suíte (baseline limpa + arrumação), nunca dentro de uma asserção —
 * `service_role` de limpeza, não de teste.
 */
export async function cleanupOrgsForUser(userId: string): Promise<void> {
  const admin = testAdminClient()

  const { data: memberships } = await admin.from('org_members').select('org_id').eq('user_id', userId)
  const orgIds = [...new Set((memberships ?? []).map((m) => m.org_id))]

  if (orgIds.length > 0) {
    await admin.from('organizations').delete().in('id', orgIds)
  }
}
