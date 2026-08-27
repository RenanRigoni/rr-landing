import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { differenceInCalendarDays, subDays } from 'date-fns'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'
import { TEST_USER_A, TEST_USER_B, ensureTestUser, signInTestClient, cleanupOrgsForUser } from '../helpers/rls-fixtures'
import { stubTableError } from '../helpers/stub-client'
import { createContactCore } from '@/lib/actions/contacts-core'
import { createLeadCore, moveStageCore, recalculateLeadCache } from '@/lib/actions/leads-core'
import { buildFollowupContext } from '@/lib/queries/ai-context'
import { renderTemplate } from '@/lib/ai/render-template'
import { formatBRL } from '@/lib/domain/money'
import { EMPTY_HISTORY, MISSING } from '@/lib/domain/ai-context'

/**
 * Testa lib/queries/ai-context.ts (tarefa 5.3) contra o Supabase real — mesmo
 * motivo de tests/actions/ai-gateway.test.ts: `buildFollowupContext` recebe o
 * client como parâmetro (D-030, na linha de D-020/D-028), então dá pra provar
 * isolamento entre organizações e erro de banco sem `cookies()` nem sessão de
 * servidor. Entra na suíte `test:rls` (rede real), não no `npm run test`.
 */
describe('lib/queries/ai-context — buildFollowupContext (5.3)', () => {
  let userAId: string
  let userBId: string
  let clientA: SupabaseClient<Database, 'sales'>
  let clientB: SupabaseClient<Database, 'sales'>
  let orgAId: string
  let orgBId: string
  let stageNovoA: string
  let stagePropostaA: string
  let contactA: string
  let leadBId: string

  beforeAll(async () => {
    userAId = await ensureTestUser(TEST_USER_A)
    userBId = await ensureTestUser(TEST_USER_B)
    await cleanupOrgsForUser(userAId)
    await cleanupOrgsForUser(userBId)

    clientA = await signInTestClient(TEST_USER_A)
    clientB = await signInTestClient(TEST_USER_B)

    const { data: orgA, error: orgAError } = await clientA.rpc('create_organization', { p_name: 'AI Context Org A' })
    if (orgAError || !orgA) throw new Error(`Falha ao criar org A: ${orgAError?.message}`)
    orgAId = orgA

    const { data: orgB, error: orgBError } = await clientB.rpc('create_organization', { p_name: 'AI Context Org B' })
    if (orgBError || !orgB) throw new Error(`Falha ao criar org B: ${orgBError?.message}`)
    orgBId = orgB

    const { data: stagesA } = await clientA.from('pipeline_stages').select('id, key').eq('org_id', orgAId)
    stageNovoA = stagesA!.find((s) => s.key === 'novo')!.id
    stagePropostaA = stagesA!.find((s) => s.key === 'proposta_enviada')!.id

    const contactResult = await createContactCore(clientA, orgAId, userAId, { full_name: 'Contato Contexto A' })
    contactA = contactResult.id!

    // Lead na org B, usado nos casos cross-tenant.
    const { data: stagesB } = await clientB.from('pipeline_stages').select('id, key').eq('org_id', orgBId)
    const stageNovoB = stagesB!.find((s) => s.key === 'novo')!.id
    const contactB = await createContactCore(clientB, orgBId, userBId, { full_name: 'Contato Contexto B' })
    const leadB = await createLeadCore(clientB, orgBId, userBId, { contact_id: contactB.id!, title: 'Lead da Org B', stage_id: stageNovoB })
    leadBId = leadB.id!
  }, 30_000)

  afterAll(async () => {
    await cleanupOrgsForUser(userAId)
    await cleanupOrgsForUser(userBId)
  })

  async function newProposalLead(
    title: string,
    fields: { interest?: string; value_cents?: number } = {},
  ): Promise<string> {
    const lead = await createLeadCore(clientA, orgAId, userAId, {
      contact_id: contactA,
      title,
      stage_id: stageNovoA,
      interest: fields.interest,
      value_cents: fields.value_cents ?? 0,
    })
    const moved = await moveStageCore(clientA, orgAId, lead.id!, stagePropostaA)
    expect(moved.error).toBeNull()
    return lead.id!
  }

  it('monta o contexto completo do lead: empresa, contato, título, estágio, interesse, valor, passo e histórico', async () => {
    const leadId = await newProposalLead('Cozinha planejada', { interest: 'Cozinha sob medida', value_cents: 850_000 })

    const { vars, leadId: outLeadId, contactId } = await buildFollowupContext(clientA, orgAId, leadId)

    expect(vars.empresa).toBe('AI Context Org A')
    expect(vars.contato_nome).toBe('Contato Contexto A')
    expect(vars.lead_titulo).toBe('Cozinha planejada')
    expect(vars.estagio).toBe('Proposta enviada')
    expect(vars.interesse).toBe('Cozinha sob medida')
    expect(vars.valor).toBe(formatBRL(850_000))
    expect(vars.passo_followup).toBe('1')
    expect(vars.historico_resumido).not.toBe(EMPTY_HISTORY)
    expect(vars.historico_resumido).toContain('[pendente]')
    expect(Object.keys(vars)).toHaveLength(9)

    expect(outLeadId).toBe(leadId)
    expect(contactId).toBe(contactA)
  })

  it('o prompt real do seed renderiza sem placeholder pendente e sem "Valor:" vazio', async () => {
    const comValor = await newProposalLead('Lead com valor', { interest: 'Serviço X', value_cents: 300_000 })
    const semValor = await newProposalLead('Lead sem valor')

    const { data: prompt } = await clientA
      .from('ai_prompts')
      .select('user_prompt_template')
      .eq('org_id', orgAId)
      .eq('slug', 'followup_proposta')
      .eq('is_active', true)
      .single()
    const template = prompt!.user_prompt_template

    const renderedComValor = renderTemplate(template, (await buildFollowupContext(clientA, orgAId, comValor)).vars)
    expect(renderedComValor).not.toContain('{{')
    expect(renderedComValor).toContain('Lead com valor')
    expect(renderedComValor).toContain('Serviço X')
    expect(renderedComValor).toContain(formatBRL(300_000))

    const renderedSemValor = renderTemplate(template, (await buildFollowupContext(clientA, orgAId, semValor)).vars)
    expect(renderedSemValor).not.toContain('{{')
    expect(renderedSemValor).toContain('Valor: não informado')
    expect(renderedSemValor).not.toMatch(/Valor:\s*\n/)
    expect(renderedSemValor).not.toMatch(/Valor:\s*$/)
  })

  it('campos opcionais ausentes têm comportamento explícito: valor e interesse viram "não informado"', async () => {
    const leadId = await newProposalLead('Lead minimalista')

    const { vars } = await buildFollowupContext(clientA, orgAId, leadId)

    expect(vars.valor).toBe(MISSING)
    expect(vars.interesse).toBe(MISSING)
  })

  it('lead sem último contato e sem histórico: sentinels explícitos, passo 1', async () => {
    const lead = await createLeadCore(clientA, orgAId, userAId, { contact_id: contactA, title: 'Lead novinho', stage_id: stageNovoA })

    const { vars } = await buildFollowupContext(clientA, orgAId, lead.id!)

    expect(vars.dias_desde_ultimo_contato).toBe(MISSING)
    expect(vars.historico_resumido).toBe(EMPTY_HISTORY)
    expect(vars.passo_followup).toBe('1')
  })

  it('dias desde o último contato reflete last_contact_at (cache de max(done_at))', async () => {
    const lead = await createLeadCore(clientA, orgAId, userAId, { contact_id: contactA, title: 'Lead com contato antigo', stage_id: stageNovoA })
    const past = subDays(new Date(), 4).toISOString()

    const { error: insertError } = await clientA.from('activities').insert({
      org_id: orgAId,
      lead_id: lead.id!,
      type: 'call',
      title: 'Liguei há alguns dias',
      status: 'done',
      done_at: past,
      is_auto: false,
    })
    expect(insertError).toBeNull()

    const cache = await recalculateLeadCache(clientA, orgAId, lead.id!)
    expect(cache.error).toBeNull()

    const { vars } = await buildFollowupContext(clientA, orgAId, lead.id!)
    const expectedDias = String(differenceInCalendarDays(new Date(), new Date(past)))
    expect(vars.dias_desde_ultimo_contato).toBe(expectedDias)
  })

  it('cross-tenant: usuário B não monta contexto do lead da org A', async () => {
    const leadId = await newProposalLead('Lead privado de A', { value_cents: 100_000 })

    await expect(buildFollowupContext(clientB, orgBId, leadId)).rejects.toThrow('Lead não encontrado.')
  })

  it('cross-tenant: usuário A com orgId da org B não alcança o próprio lead — orgId é sempre do usuário', async () => {
    const leadId = await newProposalLead('Lead de A com orgId trocado', { value_cents: 100_000 })

    await expect(buildFollowupContext(clientA, orgBId, leadId)).rejects.toThrow('Lead não encontrado.')
  })

  it('cross-tenant: usuário A não monta contexto de um lead da org B', async () => {
    await expect(buildFollowupContext(clientA, orgAId, leadBId)).rejects.toThrow('Lead não encontrado.')
  })

  it('lead inexistente → "Lead não encontrado."', async () => {
    await expect(
      buildFollowupContext(clientA, orgAId, '00000000-0000-0000-0000-000000000000'),
    ).rejects.toThrow('Lead não encontrado.')
  })

  it('leadId malformado → "Lead inválido." antes de qualquer consulta', async () => {
    await expect(buildFollowupContext(clientA, orgAId, 'nao-e-uuid')).rejects.toThrow('Lead inválido.')
  })

  it('erro de banco ao carregar o lead: lança, nunca devolve contexto vazio', async () => {
    const leadId = await newProposalLead('Lead para erro de banco')
    const brokenClient = stubTableError(clientA, 'leads')

    await expect(buildFollowupContext(brokenClient, orgAId, leadId)).rejects.toThrow(/contexto de IA/)
  })

  it('erro de banco em tabela relacionada (activities): lança "Falha ao carregar dados relacionados"', async () => {
    const leadId = await newProposalLead('Lead para erro em relacionada')
    const brokenClient = stubTableError(clientA, 'activities')

    await expect(buildFollowupContext(brokenClient, orgAId, leadId)).rejects.toThrow('Falha ao carregar dados relacionados para o contexto de IA.')
  })
})
