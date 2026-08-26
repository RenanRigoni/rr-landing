import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'
import { TEST_USER_A, TEST_USER_B, ensureTestUser, signInTestClient, cleanupOrgsForUser } from '../helpers/rls-fixtures'
import { createContactCore } from '@/lib/actions/contacts-core'
import { createLeadCore } from '@/lib/actions/leads-core'
import { completeActivityCore } from '@/lib/actions/activities-core'
import { computeFollowupSchedule } from '@/lib/domain/followup'

/**
 * Testa a "pergunta se quer agendar a próxima" da 4.5
 * (`lib/actions/activities-core.ts` → `completeActivityCore` →
 * `suggestNextFollowupDueAt`): só sugere data quando (a) não sobrou
 * nenhuma próxima ação pro lead depois de concluir e (b) a activity
 * concluída pertencia a uma sequência de follow-up com passo seguinte
 * ativo. Não usa `moveStageCore` pra montar o cenário — a activity com
 * `rule_id` é inserida direto (mesmo padrão de setup usado em
 * `tests/actions/leads-followup.test.ts` pra forçar "passo já feito"),
 * porque `moveStageCore` já gera todos os passos de uma vez (4.3) e isso
 * mascararia o caso que este teste precisa isolar: completar um passo sem
 * nenhum outro pendente no banco.
 */
describe('completeActivityCore — sugestão de follow-up (4.5)', () => {
  let userAId: string
  let userBId: string
  let clientA: SupabaseClient<Database, 'sales'>
  let clientB: SupabaseClient<Database, 'sales'>
  let orgAId: string
  let orgBId: string
  let stageNovoA: string
  let stagePropostaA: string
  let contactA: string
  let rulesA: Array<{ id: string; step_number: number; delay_days: number }>
  let orgTimezone: string

  beforeAll(async () => {
    userAId = await ensureTestUser(TEST_USER_A)
    userBId = await ensureTestUser(TEST_USER_B)
    await cleanupOrgsForUser(userAId)
    await cleanupOrgsForUser(userBId)

    clientA = await signInTestClient(TEST_USER_A)
    clientB = await signInTestClient(TEST_USER_B)

    const { data: orgA, error: orgAError } = await clientA.rpc('create_organization', { p_name: 'Followup Prompt Org A' })
    if (orgAError || !orgA) throw new Error(`Falha ao criar org A: ${orgAError?.message}`)
    orgAId = orgA

    const { data: orgB, error: orgBError } = await clientB.rpc('create_organization', { p_name: 'Followup Prompt Org B' })
    if (orgBError || !orgB) throw new Error(`Falha ao criar org B: ${orgBError?.message}`)
    orgBId = orgB

    const { data: stagesA } = await clientA.from('pipeline_stages').select('id, key').eq('org_id', orgAId)
    stageNovoA = stagesA!.find((s) => s.key === 'novo')!.id
    stagePropostaA = stagesA!.find((s) => s.key === 'proposta_enviada')!.id

    const { data: rules } = await clientA
      .from('followup_rules')
      .select('id, step_number, delay_days')
      .eq('org_id', orgAId)
      .eq('trigger_stage_id', stagePropostaA)
      .order('step_number', { ascending: true })
    rulesA = rules!

    const { data: org } = await clientA.from('organizations').select('timezone').eq('id', orgAId).single()
    orgTimezone = org!.timezone

    const contactResult = await createContactCore(clientA, orgAId, userAId, { full_name: 'Contato Prompt A' })
    contactA = contactResult.id!
  }, 30_000)

  afterAll(async () => {
    await cleanupOrgsForUser(userAId)
    await cleanupOrgsForUser(userBId)
  })

  async function newLeadWithAutoActivity(title: string, ruleId: string) {
    const lead = await createLeadCore(clientA, orgAId, userAId, { contact_id: contactA, title, stage_id: stageNovoA })
    const { data: activity } = await clientA
      .from('activities')
      .insert({
        org_id: orgAId,
        lead_id: lead.id!,
        type: 'whatsapp',
        title: 'Follow-up automático — passo isolado',
        status: 'pending',
        due_at: new Date().toISOString(),
        is_auto: true,
        rule_id: ruleId,
        step_number: rulesA.find((r) => r.id === ruleId)!.step_number,
      })
      .select('id')
      .single()
    return { leadId: lead.id!, activityId: activity!.id }
  }

  it('sugere a data do próximo passo ativo quando não sobra nenhuma pendência', async () => {
    const step1 = rulesA.find((r) => r.step_number === 1)!
    const step2 = rulesA.find((r) => r.step_number === 2)!
    const { activityId } = await newLeadWithAutoActivity('Sugere Proximo Passo', step1.id)

    const result = await completeActivityCore(clientA, orgAId, activityId)
    expect(result.error).toBeNull()
    expect(result.nextActionAt).toBeNull()
    expect(result.suggestedFollowupDueAt).not.toBeNull()

    const expected = computeFollowupSchedule({
      enteredStageAt: new Date(),
      rules: [{ stepNumber: step2.step_number, delayDays: step2.delay_days, isActive: true }],
      timezone: orgTimezone,
      businessHours: { start: '09:00', end: '18:00', days: [1, 2, 3, 4, 5] },
    })
    const diffMs = Math.abs(new Date(result.suggestedFollowupDueAt!).getTime() - expected[0]!.dueAt.getTime())
    expect(diffMs).toBeLessThan(10_000)
  })

  it('não sugere nada quando o passo concluído é o último da sequência', async () => {
    const step3 = rulesA.find((r) => r.step_number === 3)!
    const { activityId } = await newLeadWithAutoActivity('Ultimo Passo Sem Sugestao', step3.id)

    const result = await completeActivityCore(clientA, orgAId, activityId)
    expect(result.error).toBeNull()
    expect(result.nextActionAt).toBeNull()
    expect(result.suggestedFollowupDueAt).toBeNull()
  })

  it('pula passo desativado e sugere o próximo que ainda está ativo', async () => {
    const step1 = rulesA.find((r) => r.step_number === 1)!
    const step2 = rulesA.find((r) => r.step_number === 2)!
    const step3 = rulesA.find((r) => r.step_number === 3)!
    await clientA.from('followup_rules').update({ is_active: false }).eq('id', step2.id)

    const { activityId } = await newLeadWithAutoActivity('Proximo Passo Desativado', step1.id)
    const result = await completeActivityCore(clientA, orgAId, activityId)
    expect(result.error).toBeNull()
    expect(result.suggestedFollowupDueAt).not.toBeNull()

    const expected = computeFollowupSchedule({
      enteredStageAt: new Date(),
      rules: [{ stepNumber: step3.step_number, delayDays: step3.delay_days, isActive: true }],
      timezone: orgTimezone,
      businessHours: { start: '09:00', end: '18:00', days: [1, 2, 3, 4, 5] },
    })
    const diffMs = Math.abs(new Date(result.suggestedFollowupDueAt!).getTime() - expected[0]!.dueAt.getTime())
    expect(diffMs).toBeLessThan(10_000)

    await clientA.from('followup_rules').update({ is_active: true }).eq('id', step2.id)
  })

  it('não sugere nada quando todos os passos seguintes estão desativados', async () => {
    const step1 = rulesA.find((r) => r.step_number === 1)!
    const step2 = rulesA.find((r) => r.step_number === 2)!
    const step3 = rulesA.find((r) => r.step_number === 3)!
    await clientA.from('followup_rules').update({ is_active: false }).in('id', [step2.id, step3.id])

    const { activityId } = await newLeadWithAutoActivity('Todos Seguintes Desativados', step1.id)
    const result = await completeActivityCore(clientA, orgAId, activityId)
    expect(result.error).toBeNull()
    expect(result.suggestedFollowupDueAt).toBeNull()

    await clientA.from('followup_rules').update({ is_active: true }).in('id', [step2.id, step3.id])
  })

  it('não sugere nada pra activity manual (sem rule_id)', async () => {
    const lead = await createLeadCore(clientA, orgAId, userAId, { contact_id: contactA, title: 'Manual Sem Sugestao', stage_id: stageNovoA })
    const { data: activity } = await clientA
      .from('activities')
      .insert({ org_id: orgAId, lead_id: lead.id!, type: 'task', title: 'Ligar', status: 'pending', due_at: new Date().toISOString(), is_auto: false })
      .select('id')
      .single()

    const result = await completeActivityCore(clientA, orgAId, activity!.id)
    expect(result.error).toBeNull()
    expect(result.nextActionAt).toBeNull()
    expect(result.suggestedFollowupDueAt).toBeNull()
  })

  it('quando sobra outra pendência, next_action_at não é null e nenhuma pergunta é necessária', async () => {
    const step1 = rulesA.find((r) => r.step_number === 1)!
    const lead = await createLeadCore(clientA, orgAId, userAId, { contact_id: contactA, title: 'Sobra Pendencia', stage_id: stageNovoA })
    const { data: activities } = await clientA
      .from('activities')
      .insert([
        { org_id: orgAId, lead_id: lead.id!, type: 'whatsapp', title: 'Passo 1', status: 'pending', due_at: new Date().toISOString(), is_auto: true, rule_id: step1.id, step_number: 1 },
        { org_id: orgAId, lead_id: lead.id!, type: 'task', title: 'Tarefa manual futura', status: 'pending', due_at: new Date(Date.now() + 86_400_000).toISOString(), is_auto: false },
      ])
      .select('id')

    const result = await completeActivityCore(clientA, orgAId, activities![0]!.id)
    expect(result.error).toBeNull()
    expect(result.nextActionAt).not.toBeNull()
    expect(result.suggestedFollowupDueAt).toBeUndefined()
  })

  it('rule_id de outra organização nunca vaza pra sugestão — lookup filtrado por org_id falha seguro, sem sugestão', async () => {
    const { data: stagesB } = await clientB.from('pipeline_stages').select('id, key').eq('org_id', orgBId)
    const stagePropostaB = stagesB!.find((s) => s.key === 'proposta_enviada')!.id
    const { data: rulesB } = await clientB
      .from('followup_rules')
      .select('id')
      .eq('org_id', orgBId)
      .eq('trigger_stage_id', stagePropostaB)
      .eq('step_number', 1)
      .single()

    // Insert adversarial direto (não via moveStageCore) — simula um rule_id
    // de outro tenant chegando numa activity de A, o pior caso que
    // suggestNextFollowupDueAt precisa recusar com segurança.
    const lead = await createLeadCore(clientA, orgAId, userAId, { contact_id: contactA, title: 'Rule Id Cross Tenant', stage_id: stageNovoA })
    const { data: activity } = await clientA
      .from('activities')
      .insert({
        org_id: orgAId,
        lead_id: lead.id!,
        type: 'whatsapp',
        title: 'Passo com rule_id de outra org',
        status: 'pending',
        due_at: new Date().toISOString(),
        is_auto: true,
        rule_id: rulesB!.id,
        step_number: 1,
      })
      .select('id')
      .single()

    const result = await completeActivityCore(clientA, orgAId, activity!.id)
    expect(result.error).toBeNull()
    expect(result.suggestedFollowupDueAt).toBeNull()
  })
})
