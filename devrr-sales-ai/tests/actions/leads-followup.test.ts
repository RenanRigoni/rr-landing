import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'
import { TEST_USER_A, TEST_USER_B, ensureTestUser, signInTestClient, cleanupOrgsForUser } from '../helpers/rls-fixtures'
import { stubTableError } from '../helpers/stub-client'
import { createContactCore } from '@/lib/actions/contacts-core'
import { createLeadCore, moveStageCore, markRespondedCore } from '@/lib/actions/leads-core'
import { computeFollowupSchedule, type BusinessHours } from '@/lib/domain/followup'

/**
 * Testa a integração de lib/domain/followup.ts (4.2) com o banco, via
 * lib/actions/leads-core.ts → moveStageCore/markRespondedCore (4.3). Mesmo
 * motivo de tests/actions/leads.test.ts (3.4): as *Core não usam cookies(),
 * só a action 'use server' de verdade usa — dá pra testar contra o Supabase
 * real com os dois usuários de teste.
 */
describe('lib/actions/leads-core — follow-up (4.3)', () => {
  let userAId: string
  let userBId: string
  let clientA: SupabaseClient<Database, 'sales'>
  let clientB: SupabaseClient<Database, 'sales'>
  let orgAId: string
  let orgBId: string
  let stageNovoA: string
  let stagePropostaA: string
  let stageGanhoA: string
  let stagePerdidoA: string
  let stagePropostaB: string
  let contactA: string
  let orgTimezone: string
  let orgBusinessHours: BusinessHours

  beforeAll(async () => {
    userAId = await ensureTestUser(TEST_USER_A)
    userBId = await ensureTestUser(TEST_USER_B)
    await cleanupOrgsForUser(userAId)
    await cleanupOrgsForUser(userBId)

    clientA = await signInTestClient(TEST_USER_A)
    clientB = await signInTestClient(TEST_USER_B)

    const { data: orgA, error: orgAError } = await clientA.rpc('create_organization', { p_name: 'Followup Org A' })
    if (orgAError || !orgA) throw new Error(`Falha ao criar org A: ${orgAError?.message}`)
    orgAId = orgA

    const { data: orgB, error: orgBError } = await clientB.rpc('create_organization', { p_name: 'Followup Org B' })
    if (orgBError || !orgB) throw new Error(`Falha ao criar org B: ${orgBError?.message}`)
    orgBId = orgB

    const { data: stagesA } = await clientA.from('pipeline_stages').select('id, key').eq('org_id', orgAId)
    stageNovoA = stagesA!.find((s) => s.key === 'novo')!.id
    stagePropostaA = stagesA!.find((s) => s.key === 'proposta_enviada')!.id
    stageGanhoA = stagesA!.find((s) => s.key === 'ganho')!.id
    stagePerdidoA = stagesA!.find((s) => s.key === 'perdido')!.id

    const { data: stagesB } = await clientB.from('pipeline_stages').select('id, key').eq('org_id', orgBId)
    stagePropostaB = stagesB!.find((s) => s.key === 'proposta_enviada')!.id

    const { data: org } = await clientA.from('organizations').select('timezone, business_hours').eq('id', orgAId).single()
    orgTimezone = org!.timezone
    orgBusinessHours = org!.business_hours as unknown as BusinessHours

    const contactResult = await createContactCore(clientA, orgAId, userAId, { full_name: 'Contato Followup A' })
    contactA = contactResult.id!
  }, 30_000)

  afterAll(async () => {
    await cleanupOrgsForUser(userAId)
    await cleanupOrgsForUser(userBId)
  })

  async function newLead(title: string) {
    const created = await createLeadCore(clientA, orgAId, userAId, { contact_id: contactA, title, stage_id: stageNovoA })
    if (created.error || !created.id) throw new Error(`Falha ao criar lead de apoio: ${created.error}`)
    return created.id
  }

  async function pendingAutoActivities(leadId: string) {
    const { data } = await clientA
      .from('activities')
      .select('id, rule_id, step_number, due_at, type')
      .eq('lead_id', leadId)
      .eq('status', 'pending')
      .eq('is_auto', true)
      .order('step_number', { ascending: true })
    return data ?? []
  }

  describe('moveStageCore — fluxo positivo', () => {
    it('entrar num estágio com regras ativas gera um follow-up pendente por passo, respeitando fuso/horário comercial', async () => {
      const leadId = await newLead('Fluxo Positivo')
      const before = new Date()

      const result = await moveStageCore(clientA, orgAId, leadId, stagePropostaA)
      expect(result.error).toBeNull()

      const pending = await pendingAutoActivities(leadId)
      expect(pending).toHaveLength(3)
      expect(pending.map((a) => a.step_number)).toEqual([1, 2, 3])
      expect(pending.every((a) => a.type === 'whatsapp')).toBe(true)

      const { data: rules } = await clientA
        .from('followup_rules')
        .select('step_number, delay_days')
        .eq('org_id', orgAId)
        .eq('trigger_stage_id', stagePropostaA)
        .order('step_number', { ascending: true })

      const expected = computeFollowupSchedule({
        enteredStageAt: before,
        rules: rules!.map((r) => ({ stepNumber: r.step_number, delayDays: r.delay_days, isActive: true })),
        timezone: orgTimezone,
        businessHours: orgBusinessHours,
      })

      // Comparação por tolerância, não igualdade exata: `before` é capturado
      // aqui no teste, mas moveStageCore só chega a `new Date()` depois de
      // várias idas ao banco (estágio, update do lead, cancelamentos,
      // passos já executados, config da org) — a mesma janela de negócio
      // (dentro do horário comercial) preserva o instante exato sem
      // arredondar pra um limite fixo, então a diferença real de rede entre
      // os dois `new Date()` aparece direto no resultado. Um bug de fuso
      // horário erraria por horas (3600000ms+); atraso de rede erra por
      // milissegundos — a tolerância aqui separa um do outro.
      for (const item of expected) {
        const activity = pending.find((a) => a.step_number === item.stepNumber)!
        const diffMs = Math.abs(new Date(activity.due_at!).getTime() - item.dueAt.getTime())
        expect(diffMs).toBeLessThan(10_000)
      }

      const { data: lead } = await clientA.from('leads').select('next_action_at, status').eq('id', leadId).single()
      expect(lead?.status).toBe('open')
      expect(lead?.next_action_at).not.toBeNull()
    })

    it('regra desativada não gera follow-up para aquele passo', async () => {
      const leadId = await newLead('Regra Desativada')

      const { data: rule } = await clientA
        .from('followup_rules')
        .select('id')
        .eq('org_id', orgAId)
        .eq('trigger_stage_id', stagePropostaA)
        .eq('step_number', 2)
        .single()
      await clientA.from('followup_rules').update({ is_active: false }).eq('id', rule!.id)

      const result = await moveStageCore(clientA, orgAId, leadId, stagePropostaA)
      expect(result.error).toBeNull()

      const pending = await pendingAutoActivities(leadId)
      expect(pending.map((a) => a.step_number)).toEqual([1, 3])

      await clientA.from('followup_rules').update({ is_active: true }).eq('id', rule!.id)
    })
  })

  describe('moveStageCore — idempotência e passo já executado', () => {
    it('mover A→B→A não duplica: pendentes do primeiro passe são cancelados, não somados', async () => {
      const leadId = await newLead('Idempotencia AB A')

      const first = await moveStageCore(clientA, orgAId, leadId, stagePropostaA)
      expect(first.error).toBeNull()
      expect(await pendingAutoActivities(leadId)).toHaveLength(3)

      const backToNovo = await moveStageCore(clientA, orgAId, leadId, stageNovoA)
      expect(backToNovo.error).toBeNull()

      const second = await moveStageCore(clientA, orgAId, leadId, stagePropostaA)
      expect(second.error).toBeNull()

      const pending = await pendingAutoActivities(leadId)
      expect(pending).toHaveLength(3)

      const { data: all } = await clientA
        .from('activities')
        .select('status')
        .eq('lead_id', leadId)
        .eq('is_auto', true)
      const cancelled = all!.filter((a) => a.status === 'cancelled')
      expect(cancelled).toHaveLength(3)
      expect(all).toHaveLength(6)
    })

    it('passo com activity done não é regenerado ao reentrar no estágio (alreadyExecuted)', async () => {
      const leadId = await newLead('Passo Ja Executado')

      await moveStageCore(clientA, orgAId, leadId, stagePropostaA)
      const [step1] = await pendingAutoActivities(leadId)
      await clientA.from('activities').update({ status: 'done', done_at: new Date().toISOString() }).eq('id', step1!.id)

      await moveStageCore(clientA, orgAId, leadId, stageNovoA)
      const result = await moveStageCore(clientA, orgAId, leadId, stagePropostaA)
      expect(result.error).toBeNull()

      const pending = await pendingAutoActivities(leadId)
      expect(pending.map((a) => a.step_number)).toEqual([2, 3])
    })
  })

  describe('moveStageCore — estágio ganho/perdido cancela tudo, inclusive de outros estágios', () => {
    it('mover para estágio is_won cancela todos os pendentes automáticos e fecha o lead', async () => {
      const leadId = await newLead('Vai Pra Ganho')
      await moveStageCore(clientA, orgAId, leadId, stagePropostaA)
      expect(await pendingAutoActivities(leadId)).toHaveLength(3)

      const result = await moveStageCore(clientA, orgAId, leadId, stageGanhoA)
      expect(result.error).toBeNull()

      expect(await pendingAutoActivities(leadId)).toHaveLength(0)

      const { data: lead } = await clientA.from('leads').select('status, closed_at, stage_id').eq('id', leadId).single()
      expect(lead?.status).toBe('won')
      expect(lead?.closed_at).not.toBeNull()
      expect(lead?.stage_id).toBe(stageGanhoA)
    })

    it('mover para estágio is_lost cancela todos os pendentes automáticos e fecha o lead', async () => {
      const leadId = await newLead('Vai Pra Perdido')
      await moveStageCore(clientA, orgAId, leadId, stagePropostaA)

      const result = await moveStageCore(clientA, orgAId, leadId, stagePerdidoA)
      expect(result.error).toBeNull()

      expect(await pendingAutoActivities(leadId)).toHaveLength(0)

      const { data: lead } = await clientA.from('leads').select('status, closed_at').eq('id', leadId).single()
      expect(lead?.status).toBe('lost')
      expect(lead?.closed_at).not.toBeNull()
    })

    it('follow-up manual (is_auto=false) nunca é cancelado automaticamente', async () => {
      const leadId = await newLead('Preserva Manual')
      await moveStageCore(clientA, orgAId, leadId, stagePropostaA)

      const { data: manual } = await clientA
        .from('activities')
        .insert({
          org_id: orgAId,
          lead_id: leadId,
          type: 'task',
          title: 'Ligar amanhã de qualquer jeito',
          status: 'pending',
          due_at: new Date(Date.now() + 86_400_000).toISOString(),
          is_auto: false,
        })
        .select('id')
        .single()

      await moveStageCore(clientA, orgAId, leadId, stageGanhoA)

      const { data: manualAfter } = await clientA.from('activities').select('status').eq('id', manual!.id).single()
      expect(manualAfter?.status).toBe('pending')
    })
  })

  describe('moveStageCore — isolamento cross-tenant', () => {
    it('rejeita lead de outra organização e não gera nem cancela nada', async () => {
      const contactB = await createContactCore(clientB, orgBId, userBId, { full_name: 'Contato B Followup' })
      const leadB = await createLeadCore(clientB, orgBId, userBId, {
        contact_id: contactB.id!,
        title: 'Lead de B',
        stage_id: stagePropostaB,
      })

      const result = await moveStageCore(clientA, orgAId, leadB.id!, stagePropostaA)
      expect(result.error).not.toBeNull()

      const { data } = await clientB.from('activities').select('id').eq('lead_id', leadB.id!)
      expect(data).toEqual([])
    })

    it('regras de outra organização nunca entram na geração de A, mesmo com a mesma chave de estágio', async () => {
      const contactB = await createContactCore(clientB, orgBId, userBId, { full_name: 'Contato B Isolamento' })
      const leadB = await createLeadCore(clientB, orgBId, userBId, {
        contact_id: contactB.id!,
        title: 'Lead B Isolado',
        stage_id: stagePropostaB,
      })

      const leadId = await newLead('Nao Vaza Regra De B')
      const result = await moveStageCore(clientA, orgAId, leadId, stagePropostaA)
      expect(result.error).toBeNull()

      const { data: ruleIdsA } = await clientA.from('followup_rules').select('id').eq('org_id', orgAId).eq('trigger_stage_id', stagePropostaA)
      const pending = await pendingAutoActivities(leadId)
      const ruleIdsASet = new Set(ruleIdsA!.map((r) => r.id))
      expect(pending.every((a) => ruleIdsASet.has(a.rule_id!))).toBe(true)

      const { data: bTouched } = await clientB.from('activities').select('id').eq('lead_id', leadB.id!)
      expect(bTouched).toEqual([])
    })
  })

  describe('moveStageCore — erro de banco não vira sucesso', () => {
    it('erro ao carregar regras de follow-up é reportado, não ignorado como "sem regras"', async () => {
      const leadId = await newLead('Erro De Banco Regras')
      const stubbed = stubTableError(clientA, 'followup_rules')

      const result = await moveStageCore(stubbed, orgAId, leadId, stagePropostaA)
      expect(result.error).not.toBeNull()
    })
  })

  describe('markRespondedCore — D-027, reentrada de cadência (Achado A do checkpoint da Fase 4)', () => {
    it('sequência completa: reentrar no estágio depois de responder zera responded_at, e o 2º "Cliente respondeu" cancela os automáticos regerados', async () => {
      const leadId = await newLead('Reentrada De Cadencia')

      // 1. Entra em proposta_enviada — 3 automáticos pendentes. Tarefa
      // manual (is_auto=false) plantada aqui pra provar que sobrevive às
      // duas rodadas de cancelamento em massa desta sequência (D-005: só
      // automático é cancelado, manual é decisão do usuário).
      await moveStageCore(clientA, orgAId, leadId, stagePropostaA)
      expect(await pendingAutoActivities(leadId)).toHaveLength(3)

      const { data: manualTask } = await clientA
        .from('activities')
        .insert({
          org_id: orgAId,
          lead_id: leadId,
          type: 'task',
          title: 'Ligar de qualquer jeito',
          status: 'pending',
          due_at: new Date(Date.now() + 86_400_000).toISOString(),
          is_auto: false,
        })
        .select('id')
        .single()

      // 2. markResponded (1ª vez): cancela os 3, grava responded_at.
      const first = await markRespondedCore(clientA, orgAId, leadId, userAId)
      expect(first.error).toBeNull()
      expect(await pendingAutoActivities(leadId)).toHaveLength(0)

      const { data: leadAfterFirst } = await clientA.from('leads').select('responded_at').eq('id', leadId).single()
      expect(leadAfterFirst?.responded_at).not.toBeNull()

      // 3. Sai e volta pro estágio (proposta revisada) — cadência nova gerada.
      await moveStageCore(clientA, orgAId, leadId, stageNovoA)
      await moveStageCore(clientA, orgAId, leadId, stagePropostaA)
      expect(await pendingAutoActivities(leadId)).toHaveLength(3)

      // A reentrada por si só já zera responded_at — a cadência nova é uma
      // pergunta nova, o cliente ainda não respondeu a ela.
      const { data: leadAfterReentry } = await clientA.from('leads').select('responded_at').eq('id', leadId).single()
      expect(leadAfterReentry?.responded_at).toBeNull()

      // 4. markResponded (2ª vez): tem que cancelar os 3 automáticos
      // regerados. Antes da correção, a guarda de idempotência via
      // responded_at já preenchido (achado do checkpoint) e devolvia sucesso
      // sem cancelar nada — este é o teste que prova o achado fechado.
      const second = await markRespondedCore(clientA, orgAId, leadId, userAId)
      expect(second.error).toBeNull()
      expect(await pendingAutoActivities(leadId)).toHaveLength(0)

      // next_action_at NÃO fica nulo aqui: a tarefa manual plantada no passo
      // 1 nunca é cancelada (D-005), então o cache continua apontando pra
      // ela mesmo depois dos dois cancelamentos em massa dos automáticos.
      const { data: leadFinal } = await clientA.from('leads').select('next_action_at').eq('id', leadId).single()
      expect(leadFinal?.next_action_at).not.toBeNull()

      // Duas respostas reais, duas activities de histórico — não é a mesma
      // idempotência de "clicar duas vezes na mesma cadência" (isso continua
      // coberto pelo describe abaixo).
      const { data: history } = await clientA
        .from('activities')
        .select('id')
        .eq('lead_id', leadId)
        .eq('title', 'Cliente respondeu')
      expect(history).toHaveLength(2)

      // Tarefa manual sobrevive às duas rodadas de cancelamento em massa.
      const { data: manualAfter } = await clientA.from('activities').select('status').eq('id', manualTask!.id).single()
      expect(manualAfter?.status).toBe('pending')
    })

    it('mover para estágio sem regras de follow-up (negociação) não zera responded_at', async () => {
      const leadId = await newLead('Estagio Sem Regras Preserva Responded')
      const { data: stagesA } = await clientA.from('pipeline_stages').select('id, key').eq('org_id', orgAId)
      const stageNegociacaoA = stagesA!.find((s) => s.key === 'negociacao')!.id

      await moveStageCore(clientA, orgAId, leadId, stagePropostaA)
      await markRespondedCore(clientA, orgAId, leadId, userAId)

      const { data: before } = await clientA.from('leads').select('responded_at').eq('id', leadId).single()
      expect(before?.responded_at).not.toBeNull()

      const result = await moveStageCore(clientA, orgAId, leadId, stageNegociacaoA)
      expect(result.error).toBeNull()

      const { data: after } = await clientA.from('leads').select('responded_at').eq('id', leadId).single()
      expect(after?.responded_at).toBe(before?.responded_at)
    })
  })

  describe('markRespondedCore', () => {
    it('cancela automáticos pendentes, preserva manual, registra histórico e é idempotente', async () => {
      const leadId = await newLead('Cliente Respondeu')
      await moveStageCore(clientA, orgAId, leadId, stagePropostaA)
      expect(await pendingAutoActivities(leadId)).toHaveLength(3)

      const first = await markRespondedCore(clientA, orgAId, leadId, userAId)
      expect(first.error).toBeNull()
      expect(await pendingAutoActivities(leadId)).toHaveLength(0)

      const { data: history } = await clientA.from('activities').select('id, title, status').eq('lead_id', leadId).eq('title', 'Cliente respondeu')
      expect(history).toHaveLength(1)
      expect(history![0]!.status).toBe('done')

      const { data: leadAfterFirst } = await clientA.from('leads').select('responded_at').eq('id', leadId).single()
      const respondedAtFirst = leadAfterFirst!.responded_at

      const second = await markRespondedCore(clientA, orgAId, leadId, userAId)
      expect(second.error).toBeNull()

      const { data: historyAfterSecond } = await clientA.from('activities').select('id').eq('lead_id', leadId).eq('title', 'Cliente respondeu')
      expect(historyAfterSecond).toHaveLength(1)

      const { data: leadAfterSecond } = await clientA.from('leads').select('responded_at').eq('id', leadId).single()
      expect(leadAfterSecond!.responded_at).toBe(respondedAtFirst)
    })

    it('fluxo 6.2 ponta a ponta: criar lead → proposta_enviada (3 follow-ups nas datas certas) → markResponded → 3 cancelados → next_action_at vira null', async () => {
      const leadId = await newLead('Fluxo 6.2 Completo')

      const before = new Date()
      const moved = await moveStageCore(clientA, orgAId, leadId, stagePropostaA)
      expect(moved.error).toBeNull()

      const pending = await pendingAutoActivities(leadId)
      expect(pending.map((a) => a.step_number)).toEqual([1, 2, 3])

      const { data: rules } = await clientA
        .from('followup_rules')
        .select('step_number, delay_days')
        .eq('org_id', orgAId)
        .eq('trigger_stage_id', stagePropostaA)
        .order('step_number', { ascending: true })
      const expected = computeFollowupSchedule({
        enteredStageAt: before,
        rules: rules!.map((r) => ({ stepNumber: r.step_number, delayDays: r.delay_days, isActive: true })),
        timezone: orgTimezone,
        businessHours: orgBusinessHours,
      })
      for (const item of expected) {
        const activity = pending.find((a) => a.step_number === item.stepNumber)!
        expect(Math.abs(new Date(activity.due_at!).getTime() - item.dueAt.getTime())).toBeLessThan(10_000)
      }

      const { data: leadMid } = await clientA.from('leads').select('next_action_at').eq('id', leadId).single()
      expect(leadMid?.next_action_at).not.toBeNull()

      const responded = await markRespondedCore(clientA, orgAId, leadId, userAId)
      expect(responded.error).toBeNull()

      const { data: autos } = await clientA
        .from('activities')
        .select('status')
        .eq('lead_id', leadId)
        .eq('is_auto', true)
      expect(autos).toHaveLength(3)
      expect(autos!.every((a) => a.status === 'cancelled')).toBe(true)

      // Nenhuma pendência sobra (não foi plantada tarefa manual) → o cache zera.
      const { data: leadEnd } = await clientA.from('leads').select('next_action_at').eq('id', leadId).single()
      expect(leadEnd?.next_action_at).toBeNull()
    })

    it('rejeita lead de outra organização', async () => {
      const contactB = await createContactCore(clientB, orgBId, userBId, { full_name: 'Contato B Responded' })
      const leadB = await createLeadCore(clientB, orgBId, userBId, {
        contact_id: contactB.id!,
        title: 'Lead B Responded',
        stage_id: stagePropostaB,
      })

      const result = await markRespondedCore(clientA, orgAId, leadB.id!, userAId)
      expect(result.error).not.toBeNull()

      const { data } = await clientB.from('leads').select('responded_at').eq('id', leadB.id!).single()
      expect(data?.responded_at).toBeNull()
    })

    it('erro de banco ao gravar responded_at é reportado, não vira sucesso', async () => {
      const leadId = await newLead('Erro De Banco Responded')
      const stubbed = stubTableError(clientA, 'leads')

      const result = await markRespondedCore(stubbed, orgAId, leadId, userAId)
      expect(result.error).not.toBeNull()
    })
  })
})
