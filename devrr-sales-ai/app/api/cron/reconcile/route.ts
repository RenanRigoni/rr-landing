import { NextResponse } from 'next/server'
import { serverEnv } from '@/lib/env.server'
import { isAuthorizedCronRequest } from '@/lib/api/cron-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { reconcileAllOrgs } from '@/lib/actions/reconcile-core'

/**
 * Rede de segurança do cache denormalizado `leads.next_action_at` /
 * `leads.last_contact_at` (D-006). Roda diário via Vercel Cron
 * (`vercel.json`), cross-tenant, corrige o que estiver divergente e registra
 * o que corrigiu em `audit_logs`.
 *
 * Contrato de segurança de D-034, na ordem exata:
 * 1. valida `CRON_SECRET` em tempo constante;
 * 2. falhou → `401`, **sem** ter construído o client privilegiado;
 * 3. passou → `createAdminClient()` (service_role) → `reconcileAllOrgs`.
 *
 * Sem `import 'server-only'` explícito: route handler já é server-only por
 * natureza no Next. Zero entrada do cliente influencia escopo/filtro/limite.
 * Resposta só com contadores — nunca `org_id`, nome de org, id ou título de
 * lead, nem no corpo de sucesso nem em erro.
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request): Promise<Response> {
  if (!isAuthorizedCronRequest(request.headers.get('authorization'), serverEnv.CRON_SECRET)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()
  const supabase = createAdminClient()
  const run = await reconcileAllOrgs(supabase)
  const durationMs = Date.now() - startedAt

  // Log do operador (Vercel), não é a resposta HTTP: aqui `errors` sai por
  // extenso para investigação. O segredo nunca é logado.
  console.log(
    JSON.stringify({
      job: 'reconcile',
      orgs: run.orgs,
      leadsChecked: run.leadsChecked,
      leadsFixed: run.leadsFixed,
      durationMs,
      errors: run.errors,
    }),
  )

  const body = {
    orgs: run.orgs,
    leadsChecked: run.leadsChecked,
    leadsFixed: run.leadsFixed,
    durationMs,
    errors: run.errors.length,
  }

  // `errors` não vazio → 500, para o run aparecer como falho no histórico de
  // Cron da Vercel em vez de passar batido.
  return NextResponse.json(body, { status: run.errors.length > 0 ? 500 : 200 })
}
