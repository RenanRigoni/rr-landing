import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'
import { TEST_USER_A, TEST_USER_B, ensureTestUser, signInTestClient, cleanupOrgsForUser } from '../helpers/rls-fixtures'
import { stubTableError } from '../helpers/stub-client'
import { createContactCore } from '@/lib/actions/contacts-core'
import { createLeadCore } from '@/lib/actions/leads-core'
import { createActivityCore, completeActivityCore, cancelActivityCore, rescheduleActivityCore } from '@/lib/actions/activities-core'

/**
 * Testa lib/actions/activities-core.ts (tarefa 4.3) contra o Supabase real —
 * mesmo motivo de tests/actions/leads.test.ts (3.4): as *Core não usam
 * cookies(), só a action 'use server' de verdade usa.
 */
describe('lib/actions/activities-core', () => {
  let userAId: string
  let userBId: string
  let clientA: SupabaseClient<Database, 'sales'>
  let clientB: SupabaseClient<Database, 'sales'>
  let orgAId: string
  let orgBId: string
  let leadA: string

  beforeAll(async () => {
    userAId = await ensureTestUser(TEST_USER_A)
    userBId = await ensureTestUser(TEST_USER_B)
    await cleanupOrgsForUser(userAId)
    await cleanupOrgsForUser(userBId)

    clientA = await signInTestClient(TEST_USER_A)
    clientB = await signInTestClient(TEST_USER_B)

    const { data: orgA, error: orgAError } = await clientA.rpc('create_organization', { p_name: 'Activities Org A' })
    if (orgAError || !orgA) throw new Error(`Falha ao criar org A: ${orgAError?.message}`)
    orgAId = orgA

    const { data: orgB, error: orgBError } = await clientB.rpc('create_organization', { p_name: 'Activities Org B' })
    if (orgBError || !orgB) throw new Error(`Falha ao criar org B: ${orgBError?.message}`)
    orgBId = orgB

    const { data: stagesA } = await clientA.from('pipeline_stages').select('id, key').eq('org_id', orgAId)
    const stageNovoA = stagesA!.find((s) => s.key === 'novo')!.id

    const contactA = await createContactCore(clientA, orgAId, userAId, { full_name: 'Contato Activities A' })
    const lead = await createLeadCore(clientA, orgAId, userAId, { contact_id: contactA.id!, title: 'Lead Activities A', stage_id: stageNovoA })
    leadA = lead.id!
  }, 30_000)

  afterAll(async () => {
    await cleanupOrgsForUser(userAId)
    await cleanupOrgsForUser(userBId)
  })

  describe('createActivityCore', () => {
    it('sem due_at nasce histórico: status done, done_at preenchido', async () => {
      const result = await createActivityCore(clientA, orgAId, userAId, { lead_id: leadA, type: 'note', title: 'Ligação rápida' })
      expect(result.error).toBeNull()

      const { data } = await clientA.from('activities').select('status, due_at, done_at').eq('id', result.id!).single()
      expect(data?.status).toBe('done')
      expect(data?.due_at).toBeNull()
      expect(data?.done_at).not.toBeNull()
    })

    it('com due_at nasce agendada: status pending, due_at preenchido, done_at nulo', async () => {
      const dueAt = new Date(Date.now() + 86_400_000).toISOString()
      const result = await createActivityCore(clientA, orgAId, userAId, { lead_id: leadA, type: 'task', title: 'Ligar amanhã', due_at: dueAt })
      expect(result.error).toBeNull()

      const { data } = await clientA.from('activities').select('status, due_at, done_at').eq('id', result.id!).single()
      expect(data?.status).toBe('pending')
      expect(data?.due_at).not.toBeNull()
      expect(data?.done_at).toBeNull()
    })

    it('recalcula next_action_at do lead ao criar activity agendada', async () => {
      const dueAt = new Date(Date.now() + 3 * 86_400_000).toISOString()
      const result = await createActivityCore(clientA, orgAId, userAId, { lead_id: leadA, type: 'task', title: 'Follow manual', due_at: dueAt })
      expect(result.error).toBeNull()

      const { data: lead } = await clientA.from('leads').select('next_action_at').eq('id', leadA).single()
      expect(lead?.next_action_at).not.toBeNull()
    })

    it('rejeita lead de outra organização e não cria a activity', async () => {
      const contactB = await createContactCore(clientB, orgBId, userBId, { full_name: 'Contato B Activities' })
      const { data: stagesB } = await clientB.from('pipeline_stages').select('id, key').eq('org_id', orgBId)
      const stageNovoB = stagesB!.find((s) => s.key === 'novo')!.id
      const leadB = await createLeadCore(clientB, orgBId, userBId, { contact_id: contactB.id!, title: 'Lead B', stage_id: stageNovoB })

      const result = await createActivityCore(clientA, orgAId, userAId, { lead_id: leadB.id!, type: 'note', title: 'Invasão' })
      expect(result.error).not.toBeNull()

      const { data } = await clientA.from('activities').select('id').eq('title', 'Invasão')
      expect(data).toEqual([])
    })

    it('rejeita contact_id de outra organização', async () => {
      const contactB = await createContactCore(clientB, orgBId, userBId, { full_name: 'Contato B Solo' })

      const result = await createActivityCore(clientA, orgAId, userAId, {
        lead_id: leadA,
        contact_id: contactB.id!,
        type: 'note',
        title: 'Contato Cross-Tenant',
      })
      expect(result.error).not.toBeNull()
    })

    it('ignora is_auto/rule_id/step_number/org_id enviados no payload — mass assignment fechado', async () => {
      const result = await createActivityCore(clientA, orgAId, userAId, {
        lead_id: leadA,
        type: 'note',
        title: 'Tentativa Mass Assignment',
        is_auto: true,
        rule_id: crypto.randomUUID(),
        step_number: 99,
        org_id: orgBId,
        status: 'cancelled',
      })
      expect(result.error).toBeNull()

      const { data } = await clientA
        .from('activities')
        .select('org_id, is_auto, rule_id, step_number, status')
        .eq('id', result.id!)
        .single()
      expect(data?.org_id).toBe(orgAId)
      expect(data?.is_auto).toBe(false)
      expect(data?.rule_id).toBeNull()
      expect(data?.step_number).toBeNull()
      expect(data?.status).toBe('done')
    })

    it('rejeita título vazio', async () => {
      const result = await createActivityCore(clientA, orgAId, userAId, { lead_id: leadA, type: 'note', title: '' })
      expect(result.error).not.toBeNull()
    })

    it('erro de banco ao gravar a atividade é reportado, não vira sucesso', async () => {
      const stubbed = stubTableError(clientA, 'activities')
      const result = await createActivityCore(stubbed, orgAId, userAId, { lead_id: leadA, type: 'note', title: 'Erro De Banco' })
      expect(result.error).not.toBeNull()
    })

    it('erro de banco ao verificar o lead relacionado é distinguível de "não encontrado" (Q-005)', async () => {
      // stubTableError em 'leads' faz o belongsToOrg() do lead_id falhar por
      // erro de banco, não por ausência — checkBelongsToOrg() precisa
      // reportar a mensagem genérica de erro, nunca "Lead não encontrado.",
      // que é reservada pro caso em que a consulta respondeu e não achou a
      // linha. Antes de Q-005 ser corrigido, os dois caminhos produziam a
      // mesma mensagem — este teste falha se a distinção regredir.
      const stubbed = stubTableError(clientA, 'leads')
      const result = await createActivityCore(stubbed, orgAId, userAId, { lead_id: leadA, type: 'note', title: 'Erro De Banco No Lead' })
      expect(result.error).not.toBeNull()
      expect(result.error).not.toBe('Lead não encontrado.')
    })
  })

  describe('completeActivityCore / cancelActivityCore', () => {
    async function pendingActivity(title: string) {
      const dueAt = new Date(Date.now() + 86_400_000).toISOString()
      const created = await createActivityCore(clientA, orgAId, userAId, { lead_id: leadA, type: 'task', title, due_at: dueAt })
      return created.id!
    }

    it('conclui atividade pendente e recalcula o cache do lead', async () => {
      const id = await pendingActivity('Concluir')
      const result = await completeActivityCore(clientA, orgAId, id)
      expect(result.error).toBeNull()

      const { data } = await clientA.from('activities').select('status, done_at').eq('id', id).single()
      expect(data?.status).toBe('done')
      expect(data?.done_at).not.toBeNull()
    })

    it('concluir duas vezes é idempotente — segunda chamada não falha nem reescreve done_at', async () => {
      const id = await pendingActivity('Concluir Duas Vezes')
      const first = await completeActivityCore(clientA, orgAId, id)
      expect(first.error).toBeNull()

      const { data: afterFirst } = await clientA.from('activities').select('done_at').eq('id', id).single()

      const second = await completeActivityCore(clientA, orgAId, id)
      expect(second.error).toBeNull()

      const { data: afterSecond } = await clientA.from('activities').select('done_at').eq('id', id).single()
      expect(afterSecond?.done_at).toBe(afterFirst?.done_at)
    })

    it('cancela atividade pendente', async () => {
      const id = await pendingActivity('Cancelar')
      const result = await cancelActivityCore(clientA, orgAId, id)
      expect(result.error).toBeNull()

      const { data } = await clientA.from('activities').select('status').eq('id', id).single()
      expect(data?.status).toBe('cancelled')
    })

    it('cancelar duas vezes é idempotente', async () => {
      const id = await pendingActivity('Cancelar Duas Vezes')
      const first = await cancelActivityCore(clientA, orgAId, id)
      expect(first.error).toBeNull()
      const second = await cancelActivityCore(clientA, orgAId, id)
      expect(second.error).toBeNull()

      const { data } = await clientA.from('activities').select('status').eq('id', id).single()
      expect(data?.status).toBe('cancelled')
    })

    it('rejeita concluir/cancelar atividade de outra organização', async () => {
      const contactB = await createContactCore(clientB, orgBId, userBId, { full_name: 'Contato B Complete' })
      const { data: stagesB } = await clientB.from('pipeline_stages').select('id, key').eq('org_id', orgBId)
      const stageNovoB = stagesB!.find((s) => s.key === 'novo')!.id
      const leadB = await createLeadCore(clientB, orgBId, userBId, { contact_id: contactB.id!, title: 'Lead B Complete', stage_id: stageNovoB })
      const activityB = await createActivityCore(clientB, orgBId, userBId, { lead_id: leadB.id!, type: 'note', title: 'Nota de B' })

      const completeResult = await completeActivityCore(clientA, orgAId, activityB.id!)
      expect(completeResult.error).not.toBeNull()

      const cancelResult = await cancelActivityCore(clientA, orgAId, activityB.id!)
      expect(cancelResult.error).not.toBeNull()

      const { data } = await clientB.from('activities').select('status').eq('id', activityB.id!).single()
      expect(data?.status).toBe('done')
    })

    it('erro de banco ao concluir é reportado, não vira sucesso', async () => {
      const id = await pendingActivity('Erro De Banco Concluir')
      const stubbed = stubTableError(clientA, 'activities')
      const result = await completeActivityCore(stubbed, orgAId, id)
      expect(result.error).not.toBeNull()
    })
  })

  describe('rescheduleActivityCore', () => {
    it('reagenda atividade pendente para nova data', async () => {
      const dueAt = new Date(Date.now() + 86_400_000).toISOString()
      const created = await createActivityCore(clientA, orgAId, userAId, { lead_id: leadA, type: 'task', title: 'Reagendar', due_at: dueAt })
      const newDueAt = new Date(Date.now() + 5 * 86_400_000)

      const result = await rescheduleActivityCore(clientA, orgAId, created.id!, { due_at: newDueAt.toISOString() })
      expect(result.error).toBeNull()

      const { data } = await clientA.from('activities').select('due_at').eq('id', created.id!).single()
      expect(new Date(data!.due_at!).toISOString()).toBe(newDueAt.toISOString())
    })

    it('rejeita reagendar atividade já concluída', async () => {
      const dueAt = new Date(Date.now() + 86_400_000).toISOString()
      const created = await createActivityCore(clientA, orgAId, userAId, { lead_id: leadA, type: 'task', title: 'Reagendar Concluída', due_at: dueAt })
      await completeActivityCore(clientA, orgAId, created.id!)

      const result = await rescheduleActivityCore(clientA, orgAId, created.id!, { due_at: new Date(Date.now() + 2 * 86_400_000).toISOString() })
      expect(result.error).not.toBeNull()
    })

    it('rejeita data inválida', async () => {
      const dueAt = new Date(Date.now() + 86_400_000).toISOString()
      const created = await createActivityCore(clientA, orgAId, userAId, { lead_id: leadA, type: 'task', title: 'Data Invalida', due_at: dueAt })

      const result = await rescheduleActivityCore(clientA, orgAId, created.id!, { due_at: 'não é uma data' })
      expect(result.error).not.toBeNull()
    })
  })
})
