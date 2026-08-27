import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/lib/types/database.types'
import type { ActivityLike } from '@/lib/domain/followup'
import { computeLeadCacheFixes, type LeadCacheFix, type ReconcileLeadRow } from '@/lib/domain/reconcile'

/**
 * O lote da reconciliação de caches (docs/IMPLEMENTATION_PLAN.md → 6.3,
 * D-034). Padrão `*-core` (D-020): **recebe o client como parâmetro**, não
 * constrói nenhum — em produção é o `createAdminClient()` (service_role) do
 * route handler, já autenticado por `CRON_SECRET`; em teste é o
 * `testAdminClient` das fixtures. Não importa `lib/supabase/admin.ts` (tem
 * `import 'server-only'`, que lança sob vitest — mesma razão de
 * `tests/helpers/rls-fixtures.ts` e de `lib/actions/audit.ts`).
 *
 * Write set fechado (D-034): só `leads.next_action_at` / `leads.last_contact_at`
 * (por lead divergente, com `org_id` no filtro como declaração do escopo) e
 * `insert` em `audit_logs`. Nunca `delete`, nunca outra tabela.
 */

type SalesClient = SupabaseClient<Database, 'sales'>

/** PostgREST corta em 1000 linhas por default, em silêncio — paginação obrigatória. */
const PAGE_SIZE = 500

export interface ReconcileOrgResult {
  leadsChecked: number
  leadsFixed: number
}

export interface ReconcileRunResult {
  orgs: number
  leadsChecked: number
  leadsFixed: number
  /** Mensagens genéricas, sem identificador de tenant. */
  errors: string[]
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'erro desconhecido'
}

/**
 * Lê todas as páginas de uma query paginável (`.range(from, to)`), parando
 * quando uma página vem com menos que `PAGE_SIZE` linhas. Erro de qualquer
 * página lança — o chamador decide se derruba o lote inteiro ou só a org.
 */
async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>,
): Promise<T[]> {
  const all: T[] = []

  for (let page = 0; ; page += 1) {
    const from = page * PAGE_SIZE
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1)
    if (error) {
      throw new Error(error.message)
    }

    const batch = data ?? []
    all.push(...batch)

    if (batch.length < PAGE_SIZE) {
      break
    }
  }

  return all
}

type ActivityRow = {
  lead_id: string
  status: ActivityLike['status']
  due_at: string | null
  done_at: string | null
}

/**
 * Reconcilia o cache de todos os leads `open` de **uma** organização. Lança
 * em erro de banco — quem chama (`reconcileAllOrgs`) captura por org e segue.
 */
export async function reconcileOrg(supabase: SalesClient, orgId: string): Promise<ReconcileOrgResult> {
  const leads = await fetchAllPages<ReconcileLeadRow>((from, to) =>
    supabase
      .from('leads')
      .select('id, org_id, next_action_at, last_contact_at')
      .eq('org_id', orgId)
      .eq('status', 'open')
      .order('id')
      .range(from, to),
  )

  if (leads.length === 0) {
    return { leadsChecked: 0, leadsFixed: 0 }
  }

  const activityRows = await fetchAllPages<ActivityRow>((from, to) =>
    supabase
      .from('activities')
      .select('lead_id, status, due_at, done_at')
      .eq('org_id', orgId)
      .in('status', ['pending', 'done'])
      .order('id')
      .range(from, to),
  )

  const activitiesByLead = new Map<string, ActivityLike[]>()
  for (const row of activityRows) {
    const list = activitiesByLead.get(row.lead_id) ?? []
    list.push({ status: row.status, due_at: row.due_at, done_at: row.done_at })
    activitiesByLead.set(row.lead_id, list)
  }

  const fixes = computeLeadCacheFixes(leads, activitiesByLead)

  // Só grava lead divergente: `leads` tem trigger `leads_set_updated_at`
  // (0005) — um `update` incondicional carimbaria `updated_at` de toda a base
  // todo dia. `org_id` fica no filtro mesmo sob service_role, como declaração
  // do write set.
  for (const fix of fixes) {
    const { error } = await supabase
      .from('leads')
      .update({ next_action_at: fix.after.next_action_at, last_contact_at: fix.after.last_contact_at })
      .eq('id', fix.leadId)
      .eq('org_id', orgId)

    if (error) {
      throw new Error(`falha ao gravar cache de lead: ${error.message}`)
    }
  }

  if (fixes.length > 0) {
    await writeReconcileAudit(supabase, orgId, fixes, leads.length)
  }

  return { leadsChecked: leads.length, leadsFixed: fixes.length }
}

/**
 * Auditoria da org, em **um único `insert` de array** (não uma chamada por
 * lead — isso seria N+1). Best-effort, como `lib/actions/audit.ts`: falha ao
 * gravar auditoria não derruba a reconciliação nem invalida a correção já
 * feita. Org sem divergência (`fixes` vazio) nunca chega aqui — não gera
 * linha.
 */
async function writeReconcileAudit(
  supabase: SalesClient,
  orgId: string,
  fixes: LeadCacheFix[],
  leadsChecked: number,
): Promise<void> {
  const rows: Database['sales']['Tables']['audit_logs']['Insert'][] = fixes.map((fix) => ({
    org_id: orgId,
    user_id: null,
    entity: 'lead',
    entity_id: fix.leadId,
    action: 'cache_reconciled',
    diff: {
      before: { next_action_at: fix.before.next_action_at, last_contact_at: fix.before.last_contact_at },
      after: { next_action_at: fix.after.next_action_at, last_contact_at: fix.after.last_contact_at },
    } satisfies Json,
  }))

  rows.push({
    org_id: orgId,
    user_id: null,
    entity: 'organization',
    entity_id: orgId,
    action: 'cache_reconcile_run',
    diff: { leads_checked: leadsChecked, leads_fixed: fixes.length } satisfies Json,
  })

  await supabase.from('audit_logs').insert(rows)
}

/**
 * Reconcilia **todas** as organizações. Uma org que falha não derruba o lote:
 * o erro é capturado, acumulado em `errors` (mensagem genérica, sem
 * identificador de tenant) e o laço segue. Falha ao **listar** as orgs
 * derruba o run inteiro (nenhuma reconciliação aconteceu).
 */
export async function reconcileAllOrgs(supabase: SalesClient): Promise<ReconcileRunResult> {
  const result: ReconcileRunResult = { orgs: 0, leadsChecked: 0, leadsFixed: 0, errors: [] }

  let orgIds: string[]
  try {
    const orgRows = await fetchAllPages<{ id: string }>((from, to) =>
      supabase.from('organizations').select('id').order('id').range(from, to),
    )
    orgIds = orgRows.map((row) => row.id)
  } catch (error) {
    result.errors.push(`falha ao listar organizações: ${messageOf(error)}`)
    return result
  }

  result.orgs = orgIds.length

  for (const orgId of orgIds) {
    try {
      const orgResult = await reconcileOrg(supabase, orgId)
      result.leadsChecked += orgResult.leadsChecked
      result.leadsFixed += orgResult.leadsFixed
    } catch (error) {
      result.errors.push(`falha ao reconciliar uma organização: ${messageOf(error)}`)
    }
  }

  return result
}
