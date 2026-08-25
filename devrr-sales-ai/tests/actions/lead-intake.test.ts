import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'
import { TEST_USER_A, TEST_USER_B, ensureTestUser, signInTestClient, cleanupOrgsForUser } from '../helpers/rls-fixtures'
import { createContactCore } from '@/lib/actions/contacts-core'
import { createLeadIntakeCore } from '@/lib/actions/lead-intake-core'
import { normalizePhoneBR } from '@/lib/domain/phone'

/**
 * Testa lib/actions/lead-intake-core.ts (tarefa 3.6) contra o Supabase real,
 * mesmo padrão de tests/actions/leads.test.ts (D-020): a core não usa
 * cookies(), só a action `'use server'` de verdade usa. Cobre
 * especificamente o que é próprio deste fluxo — deduplicação por telefone,
 * confirmação de vínculo/criação, resolução do estágio inicial — e reusa os
 * mesmos casos de proteção cross-tenant já provados em leads-core.ts
 * (belongsToOrg é a mesma função, importada, não reimplementada).
 */
describe('lib/actions/lead-intake-core', () => {
  let userAId: string
  let userBId: string
  let clientA: SupabaseClient<Database, 'sales'>
  let clientB: SupabaseClient<Database, 'sales'>
  let orgAId: string
  let orgBId: string
  let stageNovoA: string
  let sourceA: string

  beforeAll(async () => {
    userAId = await ensureTestUser(TEST_USER_A)
    userBId = await ensureTestUser(TEST_USER_B)
    await cleanupOrgsForUser(userAId)
    await cleanupOrgsForUser(userBId)

    clientA = await signInTestClient(TEST_USER_A)
    clientB = await signInTestClient(TEST_USER_B)

    const { data: orgA, error: orgAError } = await clientA.rpc('create_organization', { p_name: 'Intake Org A' })
    if (orgAError || !orgA) throw new Error(`Falha ao criar org A: ${orgAError?.message}`)
    orgAId = orgA

    const { data: orgB, error: orgBError } = await clientB.rpc('create_organization', { p_name: 'Intake Org B' })
    if (orgBError || !orgB) throw new Error(`Falha ao criar org B: ${orgBError?.message}`)
    orgBId = orgB

    const { data: stagesA } = await clientA.from('pipeline_stages').select('id, key').eq('org_id', orgAId)
    stageNovoA = stagesA!.find((s) => s.key === 'novo')!.id

    const { data: sourcesA } = await clientA.from('lead_sources').select('id').eq('org_id', orgAId).limit(1)
    sourceA = sourcesA![0]!.id
  }, 30_000)

  afterAll(async () => {
    await cleanupOrgsForUser(userAId)
    await cleanupOrgsForUser(userBId)
  })

  it('cria contato e lead juntos quando não há telefone informado', async () => {
    const result = await createLeadIntakeCore(clientA, orgAId, userAId, {
      full_name: 'Maria Sem Telefone',
      title: 'Orçamento site institucional',
    })

    expect(result.status).toBe('success')
    expect(result.leadId).toBeDefined()

    const { data: lead } = await clientA
      .from('leads')
      .select('org_id, title, stage_id, value_cents, currency')
      .eq('id', result.leadId!)
      .single()

    expect(lead?.org_id).toBe(orgAId)
    expect(lead?.stage_id).toBe(stageNovoA)
    expect(lead?.value_cents).toBe(0)
    expect(lead?.currency).toBe('BRL')
  })

  it('cria contato e lead juntos quando o telefone é novo na organização', async () => {
    const result = await createLeadIntakeCore(clientA, orgAId, userAId, {
      full_name: 'Carlos Telefone Novo',
      phone: '11988887777',
      title: 'Landing page',
      source_id: sourceA,
      value_reais: '2500.50',
    })

    expect(result.status).toBe('success')

    const { data: lead } = await clientA.from('leads').select('value_cents, source_id').eq('id', result.leadId!).single()
    expect(lead?.value_cents).toBe(250050)
    expect(lead?.source_id).toBe(sourceA)
  })

  it('devolve duplicate sem gravar nada quando o telefone já existe na organização', async () => {
    const existing = await createContactCore(clientA, orgAId, userAId, {
      full_name: 'Contato Existente',
      phone: '11999998888',
    })

    const result = await createLeadIntakeCore(clientA, orgAId, userAId, {
      full_name: 'Nome Diferente',
      phone: '11999998888',
      title: 'Lead Duplicado',
    })

    expect(result.status).toBe('duplicate')
    expect(result.duplicateContact?.id).toBe(existing.id)
    expect(result.leadId).toBeUndefined()

    const { data: leads } = await clientA.from('leads').select('id').eq('title', 'Lead Duplicado')
    expect(leads).toEqual([])
  })

  it('vincula ao contato existente quando contact_id é reenviado (confirmação de vínculo)', async () => {
    const existing = await createContactCore(clientA, orgAId, userAId, {
      full_name: 'Contato Para Vincular',
      phone: '11977776666',
    })

    const result = await createLeadIntakeCore(clientA, orgAId, userAId, {
      full_name: 'Ignorado',
      phone: '11977776666',
      title: 'Lead Vinculado',
      contact_id: existing.id,
    })

    expect(result.status).toBe('success')

    const { data: lead } = await clientA.from('leads').select('contact_id').eq('id', result.leadId!).single()
    expect(lead?.contact_id).toBe(existing.id)

    const { data: contacts } = await clientA.from('contacts').select('id').eq('phone', normalizePhoneBR('11977776666')!)
    expect(contacts).toHaveLength(1)
  })

  it('cria contato novo mesmo com telefone repetido quando force_new_contact é enviado', async () => {
    await createContactCore(clientA, orgAId, userAId, {
      full_name: 'Original Força Nova',
      phone: '11966665555',
    })

    const result = await createLeadIntakeCore(clientA, orgAId, userAId, {
      full_name: 'Segundo Contato Mesmo Telefone',
      phone: '11966665555',
      title: 'Lead Forçado',
      force_new_contact: 'true',
    })

    expect(result.status).toBe('success')

    const { data: contacts } = await clientA
      .from('contacts')
      .select('id, full_name')
      .eq('phone', normalizePhoneBR('11966665555')!)
    expect(contacts).toHaveLength(2)
  })

  it('continua devolvendo duplicate depois que "criar mesmo assim" já produziu 2 contatos no mesmo telefone (achado A do checkpoint da Fase 3)', async () => {
    const phoneRaw = '11955554444'
    const phoneNormalized = normalizePhoneBR(phoneRaw)!

    // 1) telefone novo — cria o primeiro contato
    const first = await createLeadIntakeCore(clientA, orgAId, userAId, {
      full_name: 'Primeiro',
      phone: phoneRaw,
      title: 'Lead 1',
    })
    expect(first.status).toBe('success')

    // 2) mesmo telefone, usuário escolhe "criar contato novo mesmo assim" —
    // estado legítimo por D-022/D-023, e é ele que expunha o bug: antes da
    // correção, .maybeSingle() sem .limit(1) contra 2+ linhas devolvia
    // erro, o error era descartado, e todo cadastro seguinte no mesmo
    // telefone virava 'success' em silêncio, sem nunca mais avisar.
    const second = await createLeadIntakeCore(clientA, orgAId, userAId, {
      full_name: 'Segundo',
      phone: phoneRaw,
      title: 'Lead 2',
      force_new_contact: 'true',
    })
    expect(second.status).toBe('success')

    const { data: contactsAfterTwo } = await clientA.from('contacts').select('id').eq('phone', phoneNormalized)
    expect(contactsAfterTwo).toHaveLength(2)

    // 3) terceiro cadastro no mesmo telefone, SEM force — precisa continuar
    // avisando duplicata, não criar um terceiro contato em silêncio.
    const third = await createLeadIntakeCore(clientA, orgAId, userAId, {
      full_name: 'Terceiro',
      phone: phoneRaw,
      title: 'Lead 3',
    })
    expect(third.status).toBe('duplicate')
    expect(third.leadId).toBeUndefined()

    const { data: contactsAfterThree } = await clientA.from('contacts').select('id').eq('phone', phoneNormalized)
    expect(contactsAfterThree).toHaveLength(2)

    const { data: leadsWithTitle3 } = await clientA.from('leads').select('id').eq('title', 'Lead 3')
    expect(leadsWithTitle3).toEqual([])
  })

  it('rejeita payload inválido — título vazio', async () => {
    const result = await createLeadIntakeCore(clientA, orgAId, userAId, {
      full_name: 'Nome Válido',
      title: '',
    })
    expect(result.status).toBe('error')
  })

  it('rejeita value_reais negativo', async () => {
    const result = await createLeadIntakeCore(clientA, orgAId, userAId, {
      full_name: 'Nome Válido',
      title: 'Lead Valor Negativo',
      value_reais: '-10',
    })
    expect(result.status).toBe('error')
  })

  it('rejeita source_id de outra organização e não cria nada', async () => {
    const { data: sourcesB } = await clientB.from('lead_sources').select('id').eq('org_id', orgBId).limit(1)

    const result = await createLeadIntakeCore(clientA, orgAId, userAId, {
      full_name: 'Nome Válido',
      title: 'Lead Fonte Cross-Tenant',
      source_id: sourcesB![0]!.id,
    })

    expect(result.status).toBe('error')

    const { data: leads } = await clientA.from('leads').select('id').eq('title', 'Lead Fonte Cross-Tenant')
    expect(leads).toEqual([])
  })

  it('rejeita contact_id de outra organização enviado direto (tentativa de mass assignment) e não cria nada', async () => {
    const contactB = await createContactCore(clientB, orgBId, userBId, { full_name: 'Contato de B' })

    const result = await createLeadIntakeCore(clientA, orgAId, userAId, {
      full_name: 'Ignorado',
      title: 'Lead Contato Cross-Tenant',
      contact_id: contactB.id!,
    })

    expect(result.status).toBe('error')

    const { data: leads } = await clientA.from('leads').select('id').eq('title', 'Lead Contato Cross-Tenant')
    expect(leads).toEqual([])
  })

  it('ignora org_id enviado no payload — usa sempre o orgId resolvido pelo servidor', async () => {
    const result = await createLeadIntakeCore(clientA, orgAId, userAId, {
      full_name: 'Nome Válido',
      title: 'Tentativa Org Id Intake',
      org_id: orgBId,
    })

    expect(result.status).toBe('success')

    const { data: lead } = await clientA.from('leads').select('org_id').eq('id', result.leadId!).single()
    expect(lead?.org_id).toBe(orgAId)
  })
})
