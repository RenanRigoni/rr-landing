import { describe, it, expect } from 'vitest'
import { differenceInCalendarDays, subDays, addDays } from 'date-fns'
import {
  buildFollowupVars,
  resolveFollowupStep,
  FOLLOWUP_VAR_KEYS,
  MISSING,
  EMPTY_HISTORY,
  MAX_HISTORY_ITEMS,
  type BuildFollowupVarsInput,
  type FollowupContextActivity,
} from '@/lib/domain/ai-context'
import { formatBRL } from '@/lib/domain/money'
import { renderTemplate } from '@/lib/ai/render-template'

const NOW = new Date('2026-06-15T12:00:00Z')

// As 9 chaves que o user_prompt_template do seed 0010 referencia — fonte
// única em lib/domain/ai-context.ts. Se divergir do template, o contrato
// quebrou.
const EXPECTED_KEYS = [...FOLLOWUP_VAR_KEYS].sort()

function activity(overrides: Partial<FollowupContextActivity> = {}): FollowupContextActivity {
  return {
    title: 'Atividade',
    status: 'done',
    due_at: null,
    done_at: NOW.toISOString(),
    created_at: NOW.toISOString(),
    is_auto: false,
    step_number: null,
    ...overrides,
  }
}

function baseInput(overrides: Partial<BuildFollowupVarsInput> = {}): BuildFollowupVarsInput {
  return {
    empresa: 'Marcenaria Silva',
    contatoNome: 'Joana Prado',
    leadTitulo: 'Cozinha planejada',
    interesse: 'Cozinha sob medida',
    valueCents: 850_000,
    lastContactAt: subDays(NOW, 3).toISOString(),
    estagio: 'Proposta enviada',
    activities: [],
    now: NOW,
    ...overrides,
  }
}

describe('buildFollowupVars — mapeamento feliz', () => {
  it('mapeia todos os campos presentes 1:1 e formata o valor em BRL', () => {
    const vars = buildFollowupVars(baseInput({ valueCents: 250_000 }))

    expect(vars.empresa).toBe('Marcenaria Silva')
    expect(vars.contato_nome).toBe('Joana Prado')
    expect(vars.lead_titulo).toBe('Cozinha planejada')
    expect(vars.interesse).toBe('Cozinha sob medida')
    expect(vars.valor).toBe(formatBRL(250_000))
    expect(vars.estagio).toBe('Proposta enviada')
  })

  it('o contrato de saída é exatamente as 9 chaves do template — nem mais, nem menos', () => {
    const vars = buildFollowupVars(baseInput())
    expect(Object.keys(vars).sort()).toEqual(EXPECTED_KEYS)
  })

  it('nenhuma variável sai como string vazia, mesmo com tudo ausente', () => {
    const vars = buildFollowupVars(
      baseInput({ interesse: null, valueCents: 0, lastContactAt: null, activities: [] }),
    )
    for (const value of Object.values(vars)) {
      expect(value.length).toBeGreaterThan(0)
    }
  })
})

describe('buildFollowupVars — valor (regra da PRODUCT_SPEC #1)', () => {
  it('value_cents > 0 → BRL formatado', () => {
    expect(buildFollowupVars(baseInput({ valueCents: 12_345 })).valor).toBe(formatBRL(12_345))
  })

  it('value_cents = 0 → "não informado", nunca "R$ 0,00"', () => {
    const valor = buildFollowupVars(baseInput({ valueCents: 0 })).valor
    expect(valor).toBe(MISSING)
    expect(valor).not.toContain('0,00')
  })

  it('value_cents negativo (dado corrompido) → "não informado"', () => {
    expect(buildFollowupVars(baseInput({ valueCents: -100 })).valor).toBe(MISSING)
  })

  it('a linha fixa "Valor: {{valor}}" do template nunca renderiza vazia', () => {
    const semValor = buildFollowupVars(baseInput({ valueCents: 0 }))
    expect(renderTemplate('Valor: {{valor}}', semValor)).toBe('Valor: não informado')

    const comValor = buildFollowupVars(baseInput({ valueCents: 500_000 }))
    expect(renderTemplate('Valor: {{valor}}', comValor)).toBe(`Valor: ${formatBRL(500_000)}`)
  })
})

describe('buildFollowupVars — interesse opcional', () => {
  it('null → "não informado"', () => {
    expect(buildFollowupVars(baseInput({ interesse: null })).interesse).toBe(MISSING)
  })

  it('só espaços em branco → "não informado" (não repassa lixo)', () => {
    expect(buildFollowupVars(baseInput({ interesse: '   ' })).interesse).toBe(MISSING)
  })

  it('texto real → repassado com trim', () => {
    expect(buildFollowupVars(baseInput({ interesse: '  Reforma de banheiro ' })).interesse).toBe('Reforma de banheiro')
  })
})

describe('buildFollowupVars — dias desde o último contato', () => {
  it('last_contact_at ausente → "não informado" (não inventa 0)', () => {
    expect(buildFollowupVars(baseInput({ lastContactAt: null })).dias_desde_ultimo_contato).toBe(MISSING)
  })

  it('N dias no passado → "N" (mesmo cálculo do date-fns)', () => {
    const past = subDays(NOW, 5).toISOString()
    const expected = String(differenceInCalendarDays(NOW, new Date(past)))
    expect(buildFollowupVars(baseInput({ lastContactAt: past })).dias_desde_ultimo_contato).toBe(expected)
  })

  it('done_at no futuro → trava em "0", nunca negativo', () => {
    const future = addDays(NOW, 4).toISOString()
    expect(buildFollowupVars(baseInput({ lastContactAt: future })).dias_desde_ultimo_contato).toBe('0')
  })
})

describe('buildFollowupVars — histórico resumido', () => {
  it('sem atividades → "sem histórico registrado"', () => {
    expect(buildFollowupVars(baseInput({ activities: [] })).historico_resumido).toBe(EMPTY_HISTORY)
  })

  it('resume no máximo 5 itens, mesmo recebendo mais, preservando a ordem recebida', () => {
    const activities = Array.from({ length: 8 }, (_, i) =>
      activity({ title: `Evento ${i + 1}`, done_at: subDays(NOW, i).toISOString() }),
    )
    const resumo = buildFollowupVars(baseInput({ activities })).historico_resumido ?? ''
    const linhas = resumo.split('\n')

    expect(linhas).toHaveLength(MAX_HISTORY_ITEMS)
    expect(linhas[0]).toContain('Evento 1')
    expect(linhas[4]).toContain('Evento 5')
    expect(resumo).not.toContain('Evento 6')
  })

  it('marca status não concluído: [pendente] e [cancelada]; done fica sem sufixo', () => {
    const resumo = buildFollowupVars(
      baseInput({
        activities: [
          activity({ title: 'Follow-up passo 1', status: 'pending', is_auto: true, step_number: 1, done_at: null, due_at: NOW.toISOString() }),
          activity({ title: 'Follow-up antigo', status: 'cancelled', done_at: null, due_at: subDays(NOW, 2).toISOString() }),
          activity({ title: 'Proposta enviada', status: 'done' }),
        ],
      }),
    ).historico_resumido

    expect(resumo).toContain('Follow-up passo 1 [pendente]')
    expect(resumo).toContain('Follow-up antigo [cancelada]')
    expect(resumo).toContain('Proposta enviada')
    expect(resumo).not.toContain('Proposta enviada [')
  })
})

describe('resolveFollowupStep', () => {
  it('menor step_number entre as pendentes automáticas', () => {
    const activities = [
      activity({ status: 'pending', is_auto: true, step_number: 3, done_at: null }),
      activity({ status: 'pending', is_auto: true, step_number: 2, done_at: null }),
    ]
    expect(resolveFollowupStep(activities)).toBe(2)
  })

  it('sem nenhuma pendente automática → 1 (passo de menor pressão)', () => {
    const activities = [
      activity({ status: 'done', is_auto: true, step_number: 1 }),
      activity({ status: 'cancelled', is_auto: true, step_number: 2, done_at: null }),
    ]
    expect(resolveFollowupStep(activities)).toBe(1)
  })

  it('pendente mas manual (is_auto=false) não conta → 1', () => {
    expect(resolveFollowupStep([activity({ status: 'pending', is_auto: false, step_number: null, done_at: null })])).toBe(1)
  })

  it('pendente automática sem step_number é ignorada', () => {
    const activities = [
      activity({ status: 'pending', is_auto: true, step_number: null, done_at: null }),
      activity({ status: 'pending', is_auto: true, step_number: 2, done_at: null }),
    ]
    expect(resolveFollowupStep(activities)).toBe(2)
  })

  it('lista vazia → 1', () => {
    expect(resolveFollowupStep([])).toBe(1)
  })

  it('buildFollowupVars usa resolveFollowupStep para passo_followup', () => {
    const vars = buildFollowupVars(
      baseInput({
        activities: [activity({ status: 'pending', is_auto: true, step_number: 2, done_at: null, due_at: NOW.toISOString() })],
      }),
    )
    expect(vars.passo_followup).toBe('2')
  })
})
