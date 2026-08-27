import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'
import {
  TEST_USER_A,
  TEST_USER_B,
  ensureTestUser,
  signInTestClient,
  cleanupOrgsForUser,
  testAdminClient,
} from '../helpers/rls-fixtures'
import { createContactCore } from '@/lib/actions/contacts-core'
import { createLeadCore } from '@/lib/actions/leads-core'
import { createActivityCore } from '@/lib/actions/activities-core'
import { reconcileAllOrgs } from '@/lib/actions/reconcile-core'

/**
 * `lib/actions/reconcile-core.ts` (tarefa 6.3) contra o Supabase real, com
 * `service_role` (D-034 — job administrativo cross-tenant sem sessão). Duas
 * orgs: planta divergência em cada uma, roda `reconcileAllOrgs`, confirma que
 * **as duas** foram corrigidas (prova o cross-tenant), que um lead já
 * consistente não é tocado, que `audit_logs` ganha as linhas na org certa, e
 * que uma segunda execução corrige 0 (idempotência).
 */
describe('lib/actions/reconcile-core', () => {
  const admin: SupabaseClient<Database, 'sales'> = testAdminClient()
  const DUE_A = new Date('2027-03-01T14:00:00.000Z').toISOString()
  const DUE_B = new Date('2027-04-10T13:00:00.000Z').toISOString()
  const DUE_C = new Date('2027-05-20T12:00:00.000Z').toISOString()
  const BOGUS = '2020-01-01T00:00:00.000Z'

  let userAId: string
  let userBId: string
  let clientA: SupabaseClient<Database, 'sales'>
  let clientB: SupabaseClient<Database, 'sales'>
  let orgAId: string
  let orgBId: string
  let leadA: string
  let leadB: string
  let leadC: string
  let leadCUpdatedAt: string

  beforeAll(async () => {
    userAId = await ensureTestUser(TEST_USER_A)
    userBId = await ensureTestUser(TEST_USER_B)
    await cleanupOrgsForUser(userAId)
    await cleanupOrgsForUser(userBId)

    clientA = await signInTestClient(TEST_USER_A)
    clientB = await signInTestClient(TEST_USER_B)

    const { data: orgA, error: orgAError } = await clientA.rpc('create_organization', { p_name: 'Reconcile Org A' })
    if (orgAError || !orgA) throw new Error(`Falha ao criar org A: ${orgAError?.message}`)
    orgAId = orgA

    const { data: orgB, error: orgBError } = await clientB.rpc('create_organization', { p_name: 'Reconcile Org B' })
    if (orgBError || !orgB) throw new Error(`Falha ao criar org B: ${orgBError?.message}`)
    orgBId = orgB

    const { data: stagesA } = await clientA.from('pipeline_stages').select('id, key').eq('org_id', orgAId)
    const stageA = stagesA!.find((s) => s.key === 'novo')!.id
    const { data: stagesB } = await clientB.from('pipeline_stages').select('id, key').eq('org_id', orgBId)
    const stageB = stagesB!.find((s) => s.key === 'novo')!.id

    const contactA = await createContactCore(clientA, orgAId, userAId, { full_name: 'Contato Reconcile A' })
    const contactB = await createContactCore(clientB, orgBId, userBId, { full_name: 'Contato Reconcile B' })

    leadA = (await createLeadCore(clientA, orgAId, userAId, { contact_id: contactA.id!, title: 'Lead A', stage_id: stageA })).id!
    leadB = (await createLeadCore(clientB, orgBId, userBId, { contact_id: contactB.id!, title: 'Lead B', stage_id: stageB })).id!
    leadC = (await createLeadCore(clientA, orgAId, userAId, { contact_id: contactA.id!, title: 'Lead C', stage_id: stageA })).id!

    // Uma pendente por lead → cache correto é due_at da pendente; last_contact_at null.
    await createActivityCore(clientA, orgAId, userAId, { lead_id: leadA, type: 'task', title: 'Ligar A', due_at: DUE_A })
    await createActivityCore(clientB, orgBId, userBId, { lead_id: leadB, type: 'task', title: 'Ligar B', due_at: DUE_B })
    await createActivityCore(clientA, orgAId, userAId, { lead_id: leadC, type: 'task', title: 'Ligar C', due_at: DUE_C })

    // leadC fica com o cache já consistente — captura o updated_at pós-setup.
    const { data: cBefore } = await clientA.from('leads').select('updated_at').eq('id', leadC).single()
    leadCUpdatedAt = cBefore!.updated_at

    // Corrompe o cache de A e B direto pelo client admin (bypass de RLS).
    for (const [id, org] of [
      [leadA, orgAId],
      [leadB, orgBId],
    ] as const) {
      const { error } = await admin
        .from('leads')
        .update({ next_action_at: BOGUS, last_contact_at: BOGUS })
        .eq('id', id)
        .eq('org_id', org)
      if (error) throw new Error(`Falha ao corromper cache: ${error.message}`)
    }
  }, 45_000)

  afterAll(async () => {
    await cleanupOrgsForUser(userAId)
    await cleanupOrgsForUser(userBId)
  })

  it('corrige o cache divergente nas duas organizações (cross-tenant)', async () => {
    const result = await reconcileAllOrgs(admin)
    expect(result.errors).toEqual([])
    expect(result.leadsFixed).toBeGreaterThanOrEqual(2)

    const { data: rowA } = await admin.from('leads').select('next_action_at, last_contact_at').eq('id', leadA).single()
    expect(new Date(rowA!.next_action_at!).getTime()).toBe(new Date(DUE_A).getTime())
    expect(rowA!.last_contact_at).toBeNull()

    const { data: rowB } = await admin.from('leads').select('next_action_at, last_contact_at').eq('id', leadB).single()
    expect(new Date(rowB!.next_action_at!).getTime()).toBe(new Date(DUE_B).getTime())
    expect(rowB!.last_contact_at).toBeNull()
  })

  it('não toca em lead já consistente — updated_at inalterado', async () => {
    const { data: rowC } = await admin.from('leads').select('updated_at, next_action_at').eq('id', leadC).single()
    expect(new Date(rowC!.next_action_at!).getTime()).toBe(new Date(DUE_C).getTime())
    expect(rowC!.updated_at).toBe(leadCUpdatedAt)
  })

  it('registra audit_logs na org certa: linha por lead corrigido + linha do run', async () => {
    const { data: logs } = await admin
      .from('audit_logs')
      .select('entity, entity_id, action, user_id')
      .eq('org_id', orgAId)
      .in('action', ['cache_reconciled', 'cache_reconcile_run'])

    const perLead = logs!.find((l) => l.action === 'cache_reconciled' && l.entity_id === leadA)
    expect(perLead).toBeDefined()
    expect(perLead!.entity).toBe('lead')
    expect(perLead!.user_id).toBeNull()

    const runLine = logs!.find((l) => l.action === 'cache_reconcile_run' && l.entity_id === orgAId)
    expect(runLine).toBeDefined()
    expect(runLine!.entity).toBe('organization')

    // leadC consistente não gera linha de auditoria.
    expect(logs!.some((l) => l.entity_id === leadC)).toBe(false)
  })

  it('segunda execução corrige 0 (idempotência)', async () => {
    const result = await reconcileAllOrgs(admin)
    expect(result.errors).toEqual([])
    expect(result.leadsFixed).toBe(0)
  })
})
