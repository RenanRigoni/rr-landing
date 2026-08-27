import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'
import { TEST_USER_A, TEST_USER_B, ensureTestUser, signInTestClient, cleanupOrgsForUser } from '../helpers/rls-fixtures'

// generateText fala com o Vercel AI Gateway de verdade — mockado pra este
// teste provar o CONTRATO de lib/ai/gateway.ts (o que é gravado em ai_runs
// em sucesso e em falha) sem depender de rede nem gastar tokens reais.
// Output.object só precisa devolver algo passável como `output` do
// generateText; a validação Zod de verdade é responsabilidade do SDK, fora
// do escopo desta função.
vi.mock('ai', () => ({
  generateText: vi.fn(),
  Output: { object: (x: unknown) => x },
}))

const { generateText } = await import('ai')
const { runAiPrompt } = await import('@/lib/ai/gateway')

const outputSchema = z.object({ message: z.string() })

/**
 * Testa lib/ai/gateway.ts (tarefa 5.1) contra o Supabase real — mesmo motivo
 * de tests/actions/activities.test.ts: runAiPrompt recebe o client como
 * parâmetro (D-020), então dá pra provar isolamento entre organizações e
 * erro de banco sem cookies() nem sessão de servidor.
 */
describe('lib/ai/gateway — runAiPrompt', () => {
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

    const { data: orgA, error: orgAError } = await clientA.rpc('create_organization', { p_name: 'AI Gateway Org A' })
    if (orgAError || !orgA) throw new Error(`Falha ao criar org A: ${orgAError?.message}`)
    orgAId = orgA

    const { data: orgB, error: orgBError } = await clientB.rpc('create_organization', { p_name: 'AI Gateway Org B' })
    if (orgBError || !orgB) throw new Error(`Falha ao criar org B: ${orgBError?.message}`)
    orgBId = orgB

    await clientA.from('ai_prompts').insert({
      org_id: orgAId,
      slug: 'test_prompt',
      system_prompt: 'Você é um assistente de teste.',
      user_prompt_template: 'Oi {{nome}}, sua empresa é {{empresa}}.',
      model: 'anthropic/claude-sonnet-5',
      temperature: 0.5,
    })

    await clientB.from('ai_prompts').insert({
      org_id: orgBId,
      slug: 'test_prompt',
      system_prompt: 'Prompt da organização B — nunca deveria ser usado pela A.',
      user_prompt_template: 'Template B {{nome}}.',
    })
  }, 30_000)

  afterAll(async () => {
    await cleanupOrgsForUser(userAId)
    await cleanupOrgsForUser(userBId)
  })

  beforeEach(() => {
    vi.mocked(generateText).mockReset()
  })

  it('busca o prompt ativo da própria organização, renderiza o template e grava ai_runs pending_review', async () => {
    vi.mocked(generateText).mockResolvedValue({
      output: { message: 'Mensagem gerada' },
      usage: { inputTokens: 42, outputTokens: 7 },
    } as never)

    const result = await runAiPrompt(clientA, orgAId, {
      slug: 'test_prompt',
      vars: { nome: 'Fulano', empresa: 'Acme' },
      schema: outputSchema,
    })

    expect(result.output).toEqual({ message: 'Mensagem gerada' })
    expect(result.runId).toBeTruthy()

    const callArgs = vi.mocked(generateText).mock.calls[0]![0] as { system: string; prompt: string; model: string }
    expect(callArgs.system).toBe('Você é um assistente de teste.')
    expect(callArgs.prompt).toBe('Oi Fulano, sua empresa é Acme.')

    const { data: run } = await clientA
      .from('ai_runs')
      .select('org_id, status, model, input_tokens, output_tokens, latency_ms, parsed_output, raw_response')
      .eq('id', result.runId)
      .single()

    expect(run?.org_id).toBe(orgAId)
    expect(run?.status).toBe('pending_review')
    expect(run?.model).toBe('anthropic/claude-sonnet-5')
    expect(run?.input_tokens).toBe(42)
    expect(run?.output_tokens).toBe(7)
    expect(run?.latency_ms).not.toBeNull()
    expect(run?.parsed_output).toEqual({ message: 'Mensagem gerada' })
  })

  it('isolamento entre organizações: mesma slug, prompt de B nunca é usado por A', async () => {
    vi.mocked(generateText).mockResolvedValue({
      output: { message: 'ok' },
      usage: { inputTokens: 1, outputTokens: 1 },
    } as never)

    await runAiPrompt(clientA, orgAId, { slug: 'test_prompt', vars: { nome: 'X', empresa: 'Y' }, schema: outputSchema })

    const callArgs = vi.mocked(generateText).mock.calls[0]![0] as { system: string }
    expect(callArgs.system).not.toContain('organização B')
  })

  it('slug sem prompt ativo: lança erro claro e não chama o gateway nem grava ai_runs', async () => {
    const { count: before } = await clientA.from('ai_runs').select('id', { count: 'exact', head: true }).eq('org_id', orgAId)

    await expect(
      runAiPrompt(clientA, orgAId, { slug: 'slug_inexistente', vars: {}, schema: outputSchema }),
    ).rejects.toThrow('slug_inexistente')

    expect(generateText).not.toHaveBeenCalled()

    const { count: after } = await clientA.from('ai_runs').select('id', { count: 'exact', head: true }).eq('org_id', orgAId)
    expect(after).toBe(before)
  })

  it('gateway cai (generateText rejeita): grava ai_runs status=error com a mensagem, e relança — nunca falha em silêncio', async () => {
    vi.mocked(generateText).mockRejectedValue(new Error('AI_GATEWAY_API_KEY ausente ou gateway indisponível'))

    await expect(
      runAiPrompt(clientA, orgAId, { slug: 'test_prompt', vars: { nome: 'Z', empresa: 'W' }, schema: outputSchema }),
    ).rejects.toThrow('AI_GATEWAY_API_KEY ausente ou gateway indisponível')

    const { data: runs } = await clientA
      .from('ai_runs')
      .select('status, error_message, org_id')
      .eq('org_id', orgAId)
      .eq('status', 'error')
      .order('created_at', { ascending: false })
      .limit(1)

    expect(runs?.[0]?.status).toBe('error')
    expect(runs?.[0]?.error_message).toBe('AI_GATEWAY_API_KEY ausente ou gateway indisponível')
  })

  it('lead_id/contact_id informados são gravados em ai_runs para auditoria', async () => {
    vi.mocked(generateText).mockResolvedValue({
      output: { message: 'com contexto' },
      usage: { inputTokens: 5, outputTokens: 5 },
    } as never)

    const contact = await clientA.from('contacts').insert({ org_id: orgAId, full_name: 'Contato Gateway' }).select('id').single()
    const { data: stages } = await clientA.from('pipeline_stages').select('id, key').eq('org_id', orgAId)
    const stageNovo = stages!.find((s) => s.key === 'novo')!.id
    const lead = await clientA
      .from('leads')
      .insert({ org_id: orgAId, contact_id: contact.data!.id, title: 'Lead Gateway', stage_id: stageNovo })
      .select('id')
      .single()

    const result = await runAiPrompt(clientA, orgAId, {
      slug: 'test_prompt',
      vars: { nome: 'A', empresa: 'B' },
      schema: outputSchema,
      leadId: lead.data!.id,
      contactId: contact.data!.id,
    })

    const { data: run } = await clientA.from('ai_runs').select('lead_id, contact_id').eq('id', result.runId).single()
    expect(run?.lead_id).toBe(lead.data!.id)
    expect(run?.contact_id).toBe(contact.data!.id)
  })
})
