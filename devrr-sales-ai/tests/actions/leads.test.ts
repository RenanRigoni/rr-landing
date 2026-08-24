import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'
import { TEST_USER_A, TEST_USER_B, ensureTestUser, signInTestClient, cleanupOrgsForUser } from '../helpers/rls-fixtures'
import { createContactCore } from '@/lib/actions/contacts-core'
import { createLeadCore, updateLeadCore, moveStageCore } from '@/lib/actions/leads-core'

/**
 * Testa lib/actions/leads-core.ts contra o Supabase real (mesmo motivo do
 * tests/actions/contacts.test.ts: as *Core não usam cookies(), só a action
 * `'use server'` de verdade usa). Cobre especificamente o que a RLS de
 * `leads` sozinha NÃO garante: `leads.org_id` é isolado por RLS, mas
 * `contact_id`/`source_id`/`stage_id` são só FK — nada no banco impede um
 * lead da org A referenciar um estágio da org B (ver comentário em
 * lib/actions/leads-core.ts → belongsToOrg). É essa checagem em código que
 * estes testes provam existir de verdade, não só no papel.
 */
describe('lib/actions/leads-core', () => {
  let userAId: string
  let userBId: string
  let clientA: SupabaseClient<Database, 'sales'>
  let clientB: SupabaseClient<Database, 'sales'>
  let orgAId: string
  let orgBId: string
  let stageNovoA: string
  let stageContatadoA: string
  let stageNovoB: string
  let sourceA: string
  let contactA: string

  beforeAll(async () => {
    userAId = await ensureTestUser(TEST_USER_A)
    userBId = await ensureTestUser(TEST_USER_B)
    await cleanupOrgsForUser(userAId)
    await cleanupOrgsForUser(userBId)

    clientA = await signInTestClient(TEST_USER_A)
    clientB = await signInTestClient(TEST_USER_B)

    const { data: orgA, error: orgAError } = await clientA.rpc('create_organization', { p_name: 'Actions Leads Org A' })
    if (orgAError || !orgA) throw new Error(`Falha ao criar org A: ${orgAError?.message}`)
    orgAId = orgA

    const { data: orgB, error: orgBError } = await clientB.rpc('create_organization', { p_name: 'Actions Leads Org B' })
    if (orgBError || !orgB) throw new Error(`Falha ao criar org B: ${orgBError?.message}`)
    orgBId = orgB

    const { data: stagesA } = await clientA.from('pipeline_stages').select('id, key').eq('org_id', orgAId)
    stageNovoA = stagesA!.find((s) => s.key === 'novo')!.id
    stageContatadoA = stagesA!.find((s) => s.key === 'contatado')!.id

    const { data: stagesB } = await clientB.from('pipeline_stages').select('id, key').eq('org_id', orgBId)
    stageNovoB = stagesB!.find((s) => s.key === 'novo')!.id

    const { data: sourcesA } = await clientA.from('lead_sources').select('id').eq('org_id', orgAId).limit(1)
    sourceA = sourcesA![0]!.id

    const contactResult = await createContactCore(clientA, orgAId, userAId, { full_name: 'Contato Base A' })
    contactA = contactResult.id!
  }, 30_000)

  afterAll(async () => {
    await cleanupOrgsForUser(userAId)
    await cleanupOrgsForUser(userBId)
  })

  describe('createLeadCore', () => {
    it('cria lead válido com contato, estágio e fonte da própria organização', async () => {
      const result = await createLeadCore(clientA, orgAId, userAId, {
        contact_id: contactA,
        title: 'Lead Válido',
        stage_id: stageNovoA,
        source_id: sourceA,
        value_cents: 250000,
      })

      expect(result.error).toBeNull()
      expect(result.id).toBeDefined()

      const { data } = await clientA
        .from('leads')
        .select('org_id, title, value_cents, currency, status, stage_id, source_id')
        .eq('id', result.id!)
        .single()

      expect(data?.org_id).toBe(orgAId)
      expect(data?.title).toBe('Lead Válido')
      expect(data?.value_cents).toBe(250000)
      expect(data?.currency).toBe('BRL')
      expect(data?.status).toBe('open')
      expect(data?.stage_id).toBe(stageNovoA)
      expect(data?.source_id).toBe(sourceA)
    })

    it('rejeita payload inválido — título vazio', async () => {
      const result = await createLeadCore(clientA, orgAId, userAId, {
        contact_id: contactA,
        title: '',
        stage_id: stageNovoA,
      })
      expect(result.error).not.toBeNull()
    })

    it('rejeita value_cents negativo', async () => {
      const result = await createLeadCore(clientA, orgAId, userAId, {
        contact_id: contactA,
        title: 'Valor Negativo',
        stage_id: stageNovoA,
        value_cents: -100,
      })
      expect(result.error).not.toBeNull()
    })

    it('rejeita contact_id de outra organização e não cria o lead', async () => {
      const contactB = await createContactCore(clientB, orgBId, userBId, { full_name: 'Contato de B' })

      const result = await createLeadCore(clientA, orgAId, userAId, {
        contact_id: contactB.id!,
        title: 'Lead Cross-Tenant Contato',
        stage_id: stageNovoA,
      })
      expect(result.error).not.toBeNull()

      const { data } = await clientA.from('leads').select('id').eq('title', 'Lead Cross-Tenant Contato')
      expect(data).toEqual([])
    })

    it('rejeita stage_id de outra organização e não cria o lead', async () => {
      const result = await createLeadCore(clientA, orgAId, userAId, {
        contact_id: contactA,
        title: 'Lead Cross-Tenant Estagio',
        stage_id: stageNovoB,
      })
      expect(result.error).not.toBeNull()

      const { data } = await clientA.from('leads').select('id').eq('title', 'Lead Cross-Tenant Estagio')
      expect(data).toEqual([])
    })

    it('rejeita source_id de outra organização e não cria o lead', async () => {
      const { data: sourcesB } = await clientB.from('lead_sources').select('id').eq('org_id', orgBId).limit(1)
      const sourceB = sourcesB![0]!.id

      const result = await createLeadCore(clientA, orgAId, userAId, {
        contact_id: contactA,
        title: 'Lead Cross-Tenant Fonte',
        stage_id: stageNovoA,
        source_id: sourceB,
      })
      expect(result.error).not.toBeNull()

      const { data } = await clientA.from('leads').select('id').eq('title', 'Lead Cross-Tenant Fonte')
      expect(data).toEqual([])
    })

    it('ignora org_id enviado no payload — usa sempre o orgId resolvido pelo servidor', async () => {
      const result = await createLeadCore(clientA, orgAId, userAId, {
        contact_id: contactA,
        title: 'Tentativa Org Id',
        stage_id: stageNovoA,
        org_id: orgBId,
      })

      expect(result.error).toBeNull()

      const { data } = await clientA.from('leads').select('org_id').eq('id', result.id!).single()
      expect(data?.org_id).toBe(orgAId)
    })
  })

  describe('updateLeadCore', () => {
    it('atualiza campos permitidos sem alterar o estágio', async () => {
      const created = await createLeadCore(clientA, orgAId, userAId, {
        contact_id: contactA,
        title: 'Original',
        stage_id: stageNovoA,
      })

      const result = await updateLeadCore(clientA, orgAId, created.id!, { title: 'Atualizado', value_cents: 500000 })
      expect(result.error).toBeNull()

      const { data } = await clientA.from('leads').select('title, value_cents, stage_id').eq('id', created.id!).single()
      expect(data?.title).toBe('Atualizado')
      expect(data?.value_cents).toBe(500000)
      expect(data?.stage_id).toBe(stageNovoA)
    })

    it('ignora stage_id enviado no payload — updateLead nunca muda estágio', async () => {
      const created = await createLeadCore(clientA, orgAId, userAId, {
        contact_id: contactA,
        title: 'Sem Mudar Estágio',
        stage_id: stageNovoA,
      })

      const result = await updateLeadCore(clientA, orgAId, created.id!, {
        title: 'Sem Mudar Estágio (editado)',
        stage_id: stageContatadoA,
      })
      expect(result.error).toBeNull()

      const { data } = await clientA.from('leads').select('stage_id, title').eq('id', created.id!).single()
      expect(data?.stage_id).toBe(stageNovoA)
      expect(data?.title).toBe('Sem Mudar Estágio (editado)')
    })

    it('rejeita novo source_id de outra organização', async () => {
      const created = await createLeadCore(clientA, orgAId, userAId, {
        contact_id: contactA,
        title: 'Fonte Cross-Tenant no Update',
        stage_id: stageNovoA,
      })
      const { data: sourcesB } = await clientB.from('lead_sources').select('id').eq('org_id', orgBId).limit(1)

      const result = await updateLeadCore(clientA, orgAId, created.id!, { source_id: sourcesB![0]!.id })
      expect(result.error).not.toBeNull()

      const { data } = await clientA.from('leads').select('source_id').eq('id', created.id!).single()
      expect(data?.source_id).toBeNull()
    })

    it('rejeita id mal formado', async () => {
      const result = await updateLeadCore(clientA, orgAId, 'nao-e-uuid', { title: 'X' })
      expect(result.error).not.toBeNull()
    })

    it('retorna erro e não altera nada ao tentar atualizar lead de outra organização', async () => {
      const contactB = await createContactCore(clientB, orgBId, userBId, { full_name: 'Contato B2' })
      const leadB = await createLeadCore(clientB, orgBId, userBId, {
        contact_id: contactB.id!,
        title: 'Lead de B',
        stage_id: stageNovoB,
      })

      const result = await updateLeadCore(clientA, orgAId, leadB.id!, { title: 'Invasão' })
      expect(result.error).not.toBeNull()

      const { data } = await clientB.from('leads').select('title').eq('id', leadB.id!).single()
      expect(data?.title).toBe('Lead de B')
    })

    it('retorna erro para lead inexistente', async () => {
      const result = await updateLeadCore(clientA, orgAId, crypto.randomUUID(), { title: 'X' })
      expect(result.error).not.toBeNull()
    })
  })

  describe('moveStageCore', () => {
    it('move lead para estágio válido da própria organização', async () => {
      const created = await createLeadCore(clientA, orgAId, userAId, {
        contact_id: contactA,
        title: 'Para Mover',
        stage_id: stageNovoA,
      })

      const result = await moveStageCore(clientA, orgAId, created.id!, stageContatadoA)
      expect(result.error).toBeNull()

      const { data } = await clientA.from('leads').select('stage_id').eq('id', created.id!).single()
      expect(data?.stage_id).toBe(stageContatadoA)
    })

    it('rejeita mover para estágio de outra organização e não altera o lead', async () => {
      const created = await createLeadCore(clientA, orgAId, userAId, {
        contact_id: contactA,
        title: 'Não Move Cross-Tenant',
        stage_id: stageNovoA,
      })

      const result = await moveStageCore(clientA, orgAId, created.id!, stageNovoB)
      expect(result.error).not.toBeNull()

      const { data } = await clientA.from('leads').select('stage_id').eq('id', created.id!).single()
      expect(data?.stage_id).toBe(stageNovoA)
    })

    it('rejeita mover lead de outra organização e não altera o lead', async () => {
      const contactB = await createContactCore(clientB, orgBId, userBId, { full_name: 'Contato B3' })
      const leadB = await createLeadCore(clientB, orgBId, userBId, {
        contact_id: contactB.id!,
        title: 'Lead B Move',
        stage_id: stageNovoB,
      })

      const result = await moveStageCore(clientA, orgAId, leadB.id!, stageNovoA)
      expect(result.error).not.toBeNull()

      const { data } = await clientB.from('leads').select('stage_id').eq('id', leadB.id!).single()
      expect(data?.stage_id).toBe(stageNovoB)
    })

    it('rejeita lead inexistente', async () => {
      const result = await moveStageCore(clientA, orgAId, crypto.randomUUID(), stageNovoA)
      expect(result.error).not.toBeNull()
    })

    it('rejeita ids mal formados', async () => {
      const result = await moveStageCore(clientA, orgAId, 'nao-e-uuid', stageNovoA)
      expect(result.error).not.toBeNull()
    })
  })
})
