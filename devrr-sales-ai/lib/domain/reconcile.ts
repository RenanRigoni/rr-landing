import { resolveNextAction, resolveLastContact, type ActivityLike } from '@/lib/domain/followup'

/**
 * Núcleo puro da reconciliação de caches (docs/IMPLEMENTATION_PLAN.md → 6.3,
 * D-006, D-034). Recebe as linhas de `leads` (`status = 'open'`) e as
 * `activities` de cada lead, e devolve **só** os leads cujo cache
 * (`next_action_at` / `last_contact_at`) diverge do que as próprias activities
 * dizem. Zero import de supabase/next — `lib/actions/reconcile-core.ts` é quem
 * lê e grava.
 *
 * A regra de "qual é a próxima ação" / "qual foi o último contato" é a mesma
 * de `lib/domain/followup.ts` (`resolveNextAction` / `resolveLastContact`),
 * usada também por `lib/actions/leads-core.ts` — uma definição só, nunca uma
 * segunda em SQL (é o mesmo motivo de o cache não ser trigger).
 */

/** Linha mínima de `sales.leads` que a reconciliação precisa. */
export interface ReconcileLeadRow {
  id: string
  org_id: string
  next_action_at: string | null
  last_contact_at: string | null
}

/** Valores de cache (ISO 8601 ou `null`) antes e depois da correção — vira o `diff` da auditoria. */
export interface LeadCacheSnapshot {
  next_action_at: string | null
  last_contact_at: string | null
}

export interface LeadCacheFix {
  leadId: string
  orgId: string
  before: LeadCacheSnapshot
  after: LeadCacheSnapshot
}

/**
 * Igualdade **por epoch**, nunca por string: a aplicação grava
 * `toISOString()` (`...Z`), o PostgREST devolve timestamptz como `...+00:00`.
 * Comparar as strings cruas marcaria todo lead como divergente em toda
 * execução e reescreveria a tabela inteira todo dia. `null` × `null` é igual;
 * `null` × valor é divergência.
 */
function sameInstant(a: string | null, b: string | null): boolean {
  if (a === null && b === null) {
    return true
  }
  if (a === null || b === null) {
    return false
  }
  return new Date(a).getTime() === new Date(b).getTime()
}

export function computeLeadCacheFixes(
  leads: ReconcileLeadRow[],
  activitiesByLead: Map<string, ActivityLike[]>,
): LeadCacheFix[] {
  const fixes: LeadCacheFix[] = []

  for (const lead of leads) {
    const activities = activitiesByLead.get(lead.id) ?? []
    const expectedNext = resolveNextAction(activities)?.toISOString() ?? null
    const expectedLast = resolveLastContact(activities)?.toISOString() ?? null

    if (sameInstant(lead.next_action_at, expectedNext) && sameInstant(lead.last_contact_at, expectedLast)) {
      continue
    }

    fixes.push({
      leadId: lead.id,
      orgId: lead.org_id,
      before: { next_action_at: lead.next_action_at, last_contact_at: lead.last_contact_at },
      after: { next_action_at: expectedNext, last_contact_at: expectedLast },
    })
  }

  return fixes
}
