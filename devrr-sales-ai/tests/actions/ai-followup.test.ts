import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'
import { TEST_USER_A, TEST_USER_B, ensureTestUser, signInTestClient, cleanupOrgsForUser } from '../helpers/rls-fixtures'
import { stubTableError } from '../helpers/stub-client'
import { createContactCore } from '@/lib/actions/contacts-core'
import { createLeadCore, moveStageCore } from '@/lib/actions/leads-core'

// generateText fala com o Vercel AI Gateway de verdade — mockado (mesmo
// motivo de tests/actions/ai-gateway.test.ts) para provar o CONTRATO da
// primeira action real de IA (5.4) sem rede nem tokens. Output.object só
// precisa devolver algo passável como `output`; a validação Zod real é do
// SDK, fora do escopo — o `-core` ainda faz `safeParse` por conta própria.
vi.mock('ai', () => ({
  generateText: vi.fn(),
  Output: { object: (x: unknown) => x },
}))

const { generateText } = await import('ai')
const { generateFollowupMessageCore, applyFollowupMessageCore, discardAiRunCore } = await import(
  '@/lib/actions/ai-followup-core'
)

const VALID_OUTPUT = {
  message: 'Oi! Passando pra saber se conseguiu ver a proposta que enviei. Qualquer dúvida, estou por aqui.',
  tone: 'direto' as const,
  reasoning: 'Passo 1 da cadência — lembrete leve, sem pressão, retomando a proposta enviada.',
}

function mockAiSuccess(output: unknown = VALID_OUTPUT): void {
  vi.mocked(generateText).mockResolvedValue({
    output,
    usage: { inputTokens: 120, outputTokens: 40 },
  } as never)
}

/**
 * Testa lib/actions/ai-followup-core.ts (tarefa 5.4) contra o Supabase real
 * — mesmo motivo de tests/actions/ai-gateway.test.ts: as funções `-core`
 * recebem o client como parâmetro (D-020/D-028/D-030), então dá pra provar
 * isolamento entre organizações, contexto/gateway/schema quebrados e o
 * estado gravado em ai_runs/activities/audit_logs sem cookies() nem sessão.
 */
describe('lib/actions/ai-followup-core (5.4)', () => {
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
  let activityBId: string

  async function proposalLeadWithFollowup(title: string): Promise<{ leadId: string; activityId: string }> {
    const lead = await createLeadCore(clientA, orgAId, userAId, {
      contact_id: contactA,
      title,
      stage_id: stageNovoA,
      value_cents: 500_000,
    })
    const moved = await moveStageCore(clientA, orgAId, lead.id!, stagePropostaA)
    expect(moved.error).toBeNull()

    const { data: pending } = await clientA
      .from('activities')
      .select('id')
      .eq('org_id', orgAId)
      .eq('lead_id', lead.id!)
      .eq('status', 'pending')
      .eq('is_auto', true)
      .order('step_number', { ascending: true })
      .limit(1)
      .maybeSingle()

    return { leadId: lead.id!, activityId: pending!.id }
  }

  async function freshRunId(leadId: string): Promise<string> {
    mockAiSuccess()
    const result = await generateFollowupMessageCore(clientA, orgAId, leadId)
    if (!result.ok) throw new Error(`esperava sucesso ao gerar, veio: ${result.error}`)
    return result.runId
  }

  beforeAll(async () => {
    userAId = await ensureTestUser(TEST_USER_A)
    userBId = await ensureTestUser(TEST_USER_B)
    await cleanupOrgsForUser(userAId)
    await cleanupOrgsForUser(userBId)

    clientA = await signInTestClient(TEST_USER_A)
    clientB = await signInTestClient(TEST_USER_B)

    const { data: orgA, error: orgAError } = await clientA.rpc('create_organization', { p_name: 'AI Followup Org A' })
    if (orgAError || !orgA) throw new Error(`Falha ao criar org A: ${orgAError?.message}`)
    orgAId = orgA

    const { data: orgB, error: orgBError } = await clientB.rpc('create_organization', { p_name: 'AI Followup Org B' })
    if (orgBError || !orgB) throw new Error(`Falha ao criar org B: ${orgBError?.message}`)
    orgBId = orgB

    const { data: stagesA } = await clientA.from('pipeline_stages').select('id, key').eq('org_id', orgAId)
    stageNovoA = stagesA!.find((s) => s.key === 'novo')!.id
    stagePropostaA = stagesA!.find((s) => s.key === 'proposta_enviada')!.id

    const contactResult = await createContactCore(clientA, orgAId, userAId, { full_name: 'Contato Followup A' })
    contactA = contactResult.id!

    const { data: stagesB } = await clientB.from('pipeline_stages').select('id, key').eq('org_id', orgBId)
    const stageNovoB = stagesB!.find((s) => s.key === 'novo')!.id
    const stagePropostaB = stagesB!.find((s) => s.key === 'proposta_enviada')!.id
    const contactB = await createContactCore(clientB, orgBId, userBId, { full_name: 'Contato Followup B' })
    const leadB = await createLeadCore(clientB, orgBId, userBId, {
      contact_id: contactB.id!,
      title: 'Lead da Org B',
      stage_id: stageNovoB,
    })
    leadBId = leadB.id!
    await moveStageCore(clientB, orgBId, leadBId, stagePropostaB)
    const { data: pendingB } = await clientB
      .from('activities')
      .select('id')
      .eq('org_id', orgBId)
      .eq('lead_id', leadBId)
      .eq('status', 'pending')
      .eq('is_auto', true)
      .order('step_number', { ascending: true })
      .limit(1)
      .maybeSingle()
    activityBId = pendingB!.id
  }, 40_000)

  afterAll(async () => {
    await cleanupOrgsForUser(userAId)
    await cleanupOrgsForUser(userBId)
  })

  beforeEach(() => {
    vi.mocked(generateText).mockReset()
  })

  describe('generateFollowupMessageCore', () => {
    it('gera a mensagem, devolve message/tone/reasoning e grava ai_runs pending_review com tokens/latência/contexto', async () => {
      const { leadId } = await proposalLeadWithFollowup('Lead gerar sucesso')
      mockAiSuccess()

      const result = await generateFollowupMessageCore(clientA, orgAId, leadId)

      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.message).toBe(VALID_OUTPUT.message)
      expect(result.tone).toBe('direto')
      expect(result.reasoning).toBe(VALID_OUTPUT.reasoning)
      expect(result.runId).toBeTruthy()

      const { data: run } = await clientA
        .from('ai_runs')
        .select('org_id, status, model, input_tokens, output_tokens, latency_ms, lead_id, contact_id, parsed_output')
        .eq('id', result.runId)
        .single()

      expect(run?.org_id).toBe(orgAId)
      expect(run?.status).toBe('pending_review')
      expect(run?.model).toBe('anthropic/claude-sonnet-5')
      expect(run?.input_tokens).toBe(120)
      expect(run?.output_tokens).toBe(40)
      expect(run?.latency_ms).not.toBeNull()
      expect(run?.lead_id).toBe(leadId)
      expect(run?.contact_id).toBe(contactA)
    })

    it('cross-tenant: usuário B não gera mensagem para lead da org A e não cria ai_run em B', async () => {
      const { leadId } = await proposalLeadWithFollowup('Lead privado de A para gerar')
      mockAiSuccess()

      const { count: before } = await clientB.from('ai_runs').select('id', { count: 'exact', head: true }).eq('org_id', orgBId)

      const result = await generateFollowupMessageCore(clientB, orgBId, leadId)
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.error).toContain('não encontrado')
      expect(generateText).not.toHaveBeenCalled()

      const { count: after } = await clientB.from('ai_runs').select('id', { count: 'exact', head: true }).eq('org_id', orgBId)
      expect(after).toBe(before)
    })

    it('cross-tenant: usuário A com orgId da org B não alcança o próprio lead', async () => {
      const { leadId } = await proposalLeadWithFollowup('Lead de A com orgId trocado')
      mockAiSuccess()

      const result = await generateFollowupMessageCore(clientA, orgBId, leadId)
      expect(result.ok).toBe(false)
    })

    it('gateway cai: resultado é ok:false com a mensagem do erro e ai_runs grava status=error — nunca vira sucesso', async () => {
      const { leadId } = await proposalLeadWithFollowup('Lead gateway cai')
      vi.mocked(generateText).mockRejectedValue(new Error('gateway fora do ar'))

      const result = await generateFollowupMessageCore(clientA, orgAId, leadId)
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.error).toContain('gateway fora do ar')

      const { data: errored } = await clientA
        .from('ai_runs')
        .select('status, error_message, lead_id')
        .eq('org_id', orgAId)
        .eq('lead_id', leadId)
        .eq('status', 'error')
        .order('created_at', { ascending: false })
        .limit(1)
      expect(errored?.[0]?.status).toBe('error')
      expect(errored?.[0]?.error_message).toContain('gateway fora do ar')
    })

    it('saída da IA em formato inesperado (tone inválido): ok:false, nunca sucesso', async () => {
      const { leadId } = await proposalLeadWithFollowup('Lead schema quebrado')
      mockAiSuccess({ message: 'oi', tone: 'agressivo', reasoning: 'x' })

      const result = await generateFollowupMessageCore(clientA, orgAId, leadId)
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.error).toContain('formato inesperado')
    })

    it('erro de banco ao montar o contexto: ok:false, nunca contexto vazio virando sucesso', async () => {
      const { leadId } = await proposalLeadWithFollowup('Lead erro de banco no contexto')
      mockAiSuccess()
      const broken = stubTableError(clientA, 'leads')

      const result = await generateFollowupMessageCore(broken, orgAId, leadId)
      expect(result.ok).toBe(false)
      expect(generateText).not.toHaveBeenCalled()
    })

    it('leadId malformado: ok:false antes de qualquer consulta', async () => {
      const result = await generateFollowupMessageCore(clientA, orgAId, 'nao-e-uuid')
      expect(result.ok).toBe(false)
    })
  })

  describe('applyFollowupMessageCore', () => {
    it('grava body + ai_run_id na atividade, marca o run como reviewed e registra audit_logs ai_used', async () => {
      const { leadId, activityId } = await proposalLeadWithFollowup('Lead usar esta')
      const runId = await freshRunId(leadId)
      const edited = 'Mensagem editada pelo usuário antes de usar.'

      const result = await applyFollowupMessageCore(clientA, orgAId, userAId, { runId, activityId, leadId, message: edited })
      expect(result.error).toBeNull()

      const { data: activity } = await clientA.from('activities').select('body, ai_run_id').eq('id', activityId).single()
      expect(activity?.body).toBe(edited)
      expect(activity?.ai_run_id).toBe(runId)

      const { data: run } = await clientA.from('ai_runs').select('status, reviewed_by, reviewed_at').eq('id', runId).single()
      expect(run?.status).toBe('reviewed')
      expect(run?.reviewed_by).toBe(userAId)
      expect(run?.reviewed_at).not.toBeNull()

      const { data: audit } = await clientA
        .from('audit_logs')
        .select('org_id, user_id, entity, entity_id, action, diff')
        .eq('entity_id', activityId)
        .eq('action', 'ai_used')
        .maybeSingle()
      expect(audit?.org_id).toBe(orgAId)
      expect(audit?.user_id).toBe(userAId)
      expect(audit?.entity).toBe('activity')
      expect(audit?.diff).toEqual({ ai_run_id: runId })
    })

    it('rejeita mensagem vazia e não toca a atividade', async () => {
      const { leadId, activityId } = await proposalLeadWithFollowup('Lead mensagem vazia')
      const runId = await freshRunId(leadId)

      const result = await applyFollowupMessageCore(clientA, orgAId, userAId, { runId, activityId, leadId, message: '   ' })
      expect(result.error).not.toBeNull()

      const { data: activity } = await clientA.from('activities').select('body, ai_run_id').eq('id', activityId).single()
      expect(activity?.body).toBeNull()
      expect(activity?.ai_run_id).toBeNull()
    })

    it('rejeita quando a atividade não pertence ao lead informado', async () => {
      const first = await proposalLeadWithFollowup('Lead A dono do run')
      const other = await proposalLeadWithFollowup('Lead A outra atividade')
      const runId = await freshRunId(first.leadId)

      const result = await applyFollowupMessageCore(clientA, orgAId, userAId, {
        runId,
        activityId: other.activityId,
        leadId: first.leadId,
        message: 'não deveria gravar',
      })
      expect(result.error).not.toBeNull()
    })

    it('cross-tenant: run da org A não pode ser usado por B, e a atividade de B fica intacta', async () => {
      const { leadId } = await proposalLeadWithFollowup('Lead A run cross-tenant')
      const runId = await freshRunId(leadId)

      const result = await applyFollowupMessageCore(clientB, orgBId, userBId, {
        runId,
        activityId: activityBId,
        leadId: leadBId,
        message: 'invasão cross-tenant',
      })
      expect(result.error).not.toBeNull()

      const { data: activityB } = await clientB.from('activities').select('body, ai_run_id').eq('id', activityBId).single()
      expect(activityB?.body).toBeNull()
      expect(activityB?.ai_run_id).toBeNull()
    })

    it('cross-tenant: atividade da org B não é alcançável com run/lead da org A', async () => {
      const { leadId } = await proposalLeadWithFollowup('Lead A com activity de B')
      const runId = await freshRunId(leadId)

      const result = await applyFollowupMessageCore(clientA, orgAId, userAId, {
        runId,
        activityId: activityBId,
        leadId,
        message: 'não deveria alcançar B',
      })
      expect(result.error).not.toBeNull()
    })

    it('erro de banco ao verificar o run é reportado, não vira sucesso', async () => {
      const { leadId, activityId } = await proposalLeadWithFollowup('Lead erro de banco no run')
      const runId = await freshRunId(leadId)
      const broken = stubTableError(clientA, 'ai_runs')

      const result = await applyFollowupMessageCore(broken, orgAId, userAId, { runId, activityId, leadId, message: 'texto' })
      expect(result.error).not.toBeNull()
    })
  })

  describe('discardAiRunCore', () => {
    it('marca o run como discarded e é idempotente', async () => {
      const { leadId } = await proposalLeadWithFollowup('Lead descartar')
      const runId = await freshRunId(leadId)

      const first = await discardAiRunCore(clientA, orgAId, userAId, runId)
      expect(first.error).toBeNull()

      const { data: run } = await clientA.from('ai_runs').select('status, reviewed_by').eq('id', runId).single()
      expect(run?.status).toBe('discarded')
      expect(run?.reviewed_by).toBe(userAId)

      const second = await discardAiRunCore(clientA, orgAId, userAId, runId)
      expect(second.error).toBeNull()
    })

    it('cross-tenant: B não descarta run da org A', async () => {
      const { leadId } = await proposalLeadWithFollowup('Lead A run não descartável por B')
      const runId = await freshRunId(leadId)

      const result = await discardAiRunCore(clientB, orgBId, userBId, runId)
      expect(result.error).not.toBeNull()

      const { data: run } = await clientA.from('ai_runs').select('status').eq('id', runId).single()
      expect(run?.status).toBe('pending_review')
    })
  })
})
