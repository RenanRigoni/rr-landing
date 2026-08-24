import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'
import { TEST_USER_A, TEST_USER_B, ensureTestUser, signInTestClient, cleanupOrgsForUser } from '../helpers/rls-fixtures'
import { createContactCore, updateContactCore } from '@/lib/actions/contacts-core'

/**
 * Testa lib/actions/contacts-core.ts contra o Supabase real, com um client
 * autenticado de verdade (não a action `'use server'` em si — essa depende
 * de `cookies()`, que só existe dentro de uma request real do Next e lança
 * fora dela; ver comentário em lib/actions/contacts-core.ts). Prova o
 * comportamento de create/update com o mesmo rigor de tests/rls.test.ts:
 * dois usuários reais, duas organizações reais, tentativas reais de
 * cross-tenant.
 */
describe('lib/actions/contacts-core', () => {
  let userAId: string
  let userBId: string
  let clientA: SupabaseClient<Database, 'sales'>
  let clientB: SupabaseClient<Database, 'sales'>
  let orgAId: string
  let orgBId: string

  beforeAll(async () => {
    userAId = await ensureTestUser(TEST_USER_A)
    userBId = await ensureTestUser(TEST_USER_B)
    await cleanupOrgsForUser(userAId)
    await cleanupOrgsForUser(userBId)

    clientA = await signInTestClient(TEST_USER_A)
    clientB = await signInTestClient(TEST_USER_B)

    const { data: orgA, error: orgAError } = await clientA.rpc('create_organization', { p_name: 'Actions Contacts Org A' })
    if (orgAError || !orgA) throw new Error(`Falha ao criar org A: ${orgAError?.message}`)
    orgAId = orgA

    const { data: orgB, error: orgBError } = await clientB.rpc('create_organization', { p_name: 'Actions Contacts Org B' })
    if (orgBError || !orgB) throw new Error(`Falha ao criar org B: ${orgBError?.message}`)
    orgBId = orgB
  }, 30_000)

  afterAll(async () => {
    await cleanupOrgsForUser(userAId)
    await cleanupOrgsForUser(userBId)
  })

  describe('createContactCore', () => {
    it('cria contato válido, normaliza telefone e grava org_id/created_by do parâmetro', async () => {
      const result = await createContactCore(clientA, orgAId, userAId, {
        full_name: 'Cliente Válido',
        phone: '(11) 98888-7777',
      })

      expect(result.error).toBeNull()
      expect(result.id).toBeDefined()

      const { data } = await clientA
        .from('contacts')
        .select('full_name, phone, org_id, created_by')
        .eq('id', result.id!)
        .single()

      expect(data?.full_name).toBe('Cliente Válido')
      expect(data?.phone).toBe('+5511988887777')
      expect(data?.org_id).toBe(orgAId)
      expect(data?.created_by).toBe(userAId)
    })

    it('rejeita payload inválido — nome vazio', async () => {
      const result = await createContactCore(clientA, orgAId, userAId, { full_name: '' })
      expect(result.error).not.toBeNull()
    })

    it('rejeita telefone que não normaliza para um número BR válido', async () => {
      const result = await createContactCore(clientA, orgAId, userAId, { full_name: 'Telefone Ruim', phone: '123' })
      expect(result.error).not.toBeNull()
    })

    it('ignora org_id enviado no payload — usa sempre o orgId resolvido pelo servidor', async () => {
      const result = await createContactCore(clientA, orgAId, userAId, {
        full_name: 'Tentativa Org Id',
        org_id: orgBId,
      })

      expect(result.error).toBeNull()

      const { data } = await clientA.from('contacts').select('org_id').eq('id', result.id!).single()
      expect(data?.org_id).toBe(orgAId)
    })
  })

  describe('updateContactCore', () => {
    it('atualiza contato existente na própria organização', async () => {
      const created = await createContactCore(clientA, orgAId, userAId, { full_name: 'Original' })
      const result = await updateContactCore(clientA, orgAId, created.id!, { full_name: 'Atualizado' })

      expect(result.error).toBeNull()

      const { data } = await clientA.from('contacts').select('full_name').eq('id', created.id!).single()
      expect(data?.full_name).toBe('Atualizado')
    })

    it('normaliza telefone ao atualizar', async () => {
      const created = await createContactCore(clientA, orgAId, userAId, { full_name: 'Telefone' })
      const result = await updateContactCore(clientA, orgAId, created.id!, { phone: '11 3333-4444' })

      expect(result.error).toBeNull()

      const { data } = await clientA.from('contacts').select('phone').eq('id', created.id!).single()
      expect(data?.phone).toBe('+551133334444')
    })

    it('rejeita payload inválido — telefone não normaliza', async () => {
      const created = await createContactCore(clientA, orgAId, userAId, { full_name: 'Telefone Inválido' })
      const result = await updateContactCore(clientA, orgAId, created.id!, { phone: 'abc' })
      expect(result.error).not.toBeNull()
    })

    it('rejeita id mal formado', async () => {
      const result = await updateContactCore(clientA, orgAId, 'nao-e-uuid', { full_name: 'X' })
      expect(result.error).not.toBeNull()
    })

    it('retorna erro e não altera nada ao tentar atualizar contato de outra organização', async () => {
      const createdInB = await createContactCore(clientB, orgBId, userBId, { full_name: 'Contato de B' })

      const result = await updateContactCore(clientA, orgAId, createdInB.id!, { full_name: 'Invasão' })
      expect(result.error).not.toBeNull()

      const { data } = await clientB.from('contacts').select('full_name').eq('id', createdInB.id!).single()
      expect(data?.full_name).toBe('Contato de B')
    })

    it('retorna erro para contato inexistente', async () => {
      const result = await updateContactCore(clientA, orgAId, crypto.randomUUID(), { full_name: 'X' })
      expect(result.error).not.toBeNull()
    })
  })
})
