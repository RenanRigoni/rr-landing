import { describe, it, expect } from 'vitest'
import { followupPropostaOutputSchema } from '@/lib/ai/schemas'

describe('followupPropostaOutputSchema (tarefa 5.2)', () => {
  it('aceita um output válido', () => {
    const parsed = followupPropostaOutputSchema.parse({
      message: 'Oi Ana, passando pra saber se conseguiu ver a proposta. Qualquer dúvida é só chamar.',
      tone: 'leve',
      reasoning: 'Passo 1: lembrete leve, sem pressão.',
    })

    expect(parsed.tone).toBe('leve')
  })

  it('rejeita tone fora do enum', () => {
    const result = followupPropostaOutputSchema.safeParse({
      message: 'x',
      tone: 'agressivo',
      reasoning: 'y',
    })

    expect(result.success).toBe(false)
  })

  it('rejeita quando falta um campo obrigatório', () => {
    const result = followupPropostaOutputSchema.safeParse({
      message: 'x',
      tone: 'direto',
    })

    expect(result.success).toBe(false)
  })

  it('rejeita tipo errado em message', () => {
    const result = followupPropostaOutputSchema.safeParse({
      message: 42,
      tone: 'consultivo',
      reasoning: 'y',
    })

    expect(result.success).toBe(false)
  })
})
