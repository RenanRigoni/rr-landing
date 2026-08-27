import { describe, it, expect } from 'vitest'
import { computeLeadCacheFixes, type ReconcileLeadRow } from '@/lib/domain/reconcile'
import type { ActivityLike } from '@/lib/domain/followup'

// Reconciliação pura (docs/IMPLEMENTATION_PLAN.md → 6.3). Comparação por
// epoch, nunca por string — a app grava `...Z`, o PostgREST devolve
// `...+00:00`.

function lead(overrides: Partial<ReconcileLeadRow> = {}): ReconcileLeadRow {
  return {
    id: 'lead-1',
    org_id: 'org-1',
    next_action_at: null,
    last_contact_at: null,
    ...overrides,
  }
}

describe('computeLeadCacheFixes', () => {
  it('cache já consistente (os dois null, lead sem activity) → nenhuma correção', () => {
    const fixes = computeLeadCacheFixes([lead()], new Map())
    expect(fixes).toEqual([])
  })

  it('cache já consistente com valores não-nulos → nenhuma correção', () => {
    const due = '2026-09-01T12:00:00.000Z'
    const done = '2026-08-20T09:30:00.000Z'
    const activities: ActivityLike[] = [
      { status: 'pending', due_at: due, done_at: null },
      { status: 'done', due_at: null, done_at: done },
    ]
    const fixes = computeLeadCacheFixes(
      [lead({ next_action_at: due, last_contact_at: done })],
      new Map([['lead-1', activities]]),
    )
    expect(fixes).toEqual([])
  })

  it('next_action_at obsoleto e não-nulo, sem nenhuma pendente → corrige para null (o caso que esconde lead da tela)', () => {
    const activities: ActivityLike[] = [{ status: 'done', due_at: null, done_at: '2026-08-01T00:00:00.000Z' }]
    const fixes = computeLeadCacheFixes(
      [lead({ next_action_at: '2026-07-15T00:00:00.000Z', last_contact_at: '2026-08-01T00:00:00.000Z' })],
      new Map([['lead-1', activities]]),
    )
    expect(fixes).toHaveLength(1)
    expect(fixes[0]?.after).toEqual({ next_action_at: null, last_contact_at: '2026-08-01T00:00:00.000Z' })
    expect(fixes[0]?.before.next_action_at).toBe('2026-07-15T00:00:00.000Z')
  })

  it('cache null com pendente existente → corrige para o menor due_at', () => {
    const activities: ActivityLike[] = [
      { status: 'pending', due_at: '2026-09-10T00:00:00.000Z', done_at: null },
      { status: 'pending', due_at: '2026-09-03T00:00:00.000Z', done_at: null },
    ]
    const fixes = computeLeadCacheFixes([lead()], new Map([['lead-1', activities]]))
    expect(fixes).toHaveLength(1)
    expect(fixes[0]?.after.next_action_at).toBe('2026-09-03T00:00:00.000Z')
  })

  it('last_contact_at = maior done_at; null sem nenhum done_at', () => {
    const comContato: ActivityLike[] = [
      { status: 'done', due_at: null, done_at: '2026-08-10T00:00:00.000Z' },
      { status: 'done', due_at: null, done_at: '2026-08-25T00:00:00.000Z' },
    ]
    const [fix] = computeLeadCacheFixes([lead()], new Map([['lead-1', comContato]]))
    expect(fix?.after.last_contact_at).toBe('2026-08-25T00:00:00.000Z')

    const semContato: ActivityLike[] = [{ status: 'pending', due_at: '2026-09-01T00:00:00.000Z', done_at: null }]
    const [fix2] = computeLeadCacheFixes(
      [lead({ last_contact_at: '2026-01-01T00:00:00.000Z', next_action_at: '2026-09-01T00:00:00.000Z' })],
      new Map([['lead-1', semContato]]),
    )
    expect(fix2?.after.last_contact_at).toBeNull()
  })

  it('mesmo instante em `...Z` e `+00:00` NÃO é divergência', () => {
    const activities: ActivityLike[] = [
      { status: 'pending', due_at: '2026-09-01T12:00:00+00:00', done_at: null },
      { status: 'done', due_at: null, done_at: '2026-08-20T09:30:00+00:00' },
    ]
    const fixes = computeLeadCacheFixes(
      [lead({ next_action_at: '2026-09-01T12:00:00.000Z', last_contact_at: '2026-08-20T09:30:00.000Z' })],
      new Map([['lead-1', activities]]),
    )
    expect(fixes).toEqual([])
  })

  it('só o lead divergente entra no resultado; consistente é ignorado', () => {
    const leads: ReconcileLeadRow[] = [
      lead({ id: 'ok', next_action_at: '2026-09-01T00:00:00.000Z' }),
      lead({ id: 'bad', next_action_at: '2026-01-01T00:00:00.000Z' }),
    ]
    const activitiesByLead = new Map<string, ActivityLike[]>([
      ['ok', [{ status: 'pending', due_at: '2026-09-01T00:00:00.000Z', done_at: null }]],
      ['bad', [{ status: 'pending', due_at: '2026-09-01T00:00:00.000Z', done_at: null }]],
    ])
    const fixes = computeLeadCacheFixes(leads, activitiesByLead)
    expect(fixes.map((f) => f.leadId)).toEqual(['bad'])
    expect(fixes[0]?.after.next_action_at).toBe('2026-09-01T00:00:00.000Z')
  })
})
