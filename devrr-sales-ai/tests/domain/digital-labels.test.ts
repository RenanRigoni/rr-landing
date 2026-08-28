import { describe, it, expect } from 'vitest'
import {
  ENUM_LABELS,
  DIGITAL_OPPORTUNITY_OPTIONS,
  FIELD_LABELS,
  NOT_ANALYZED_LABEL,
  PAGESPEED_RATING_LABELS,
} from '@/lib/domain/digital-labels'
import { digitalAuditSchema } from '@/lib/validation/digital-audit'

const LEAD_ID = '11111111-1111-1111-1111-111111111111'

// Vocabulários do Postgres (migration 0012 / database.types.ts → sales.Enums).
// Esta lista é a referência: se um enum ganhar valor no banco, o rótulo tem
// que aparecer aqui e em ENUM_LABELS ao mesmo tempo.
const EXPECTED_ENUM_VALUES: Record<keyof typeof ENUM_LABELS, string[]> = {
  tri_state: ['sim', 'nao', 'parcialmente', 'nao_identificado', 'nao_analisado', 'nao_se_aplica'],
  quality_level: ['excelente', 'boa', 'regular', 'ruim', 'nao_analisado'],
  frequency_level: ['frequentemente', 'algumas', 'raramente', 'nao', 'nao_analisado'],
  speed_level: ['rapido', 'aceitavel', 'lento', 'muito_lento', 'nao_analisado'],
  activity_level: ['ativo', 'pouco_ativo', 'inativo', 'nao_analisado'],
  cwv_status: ['aprovado', 'reprovado', 'dados_insuficientes', 'nao_analisado'],
  google_result_type: ['organico', 'patrocinado', 'maps', 'outro', 'nao_identificado'],
  sales_priority: ['muito_alta', 'alta', 'media', 'baixa', 'nao_avaliada'],
}

function schemaShapeKeys(): string[] {
  return Object.keys(digitalAuditSchema.innerType().shape)
}

describe('ENUM_LABELS', () => {
  it('cobre exatamente os 8 vocabulários compartilhados (D-036)', () => {
    expect(Object.keys(ENUM_LABELS).sort()).toEqual(Object.keys(EXPECTED_ENUM_VALUES).sort())
  })

  for (const [group, expectedValues] of Object.entries(EXPECTED_ENUM_VALUES)) {
    it(`${group}: chaves = valores do enum, todos com rótulo não vazio`, () => {
      const map = ENUM_LABELS[group as keyof typeof ENUM_LABELS] as Record<string, string>
      expect(Object.keys(map).sort()).toEqual([...expectedValues].sort())
      for (const value of expectedValues) {
        const label = map[value]
        expect(typeof label, value).toBe('string')
        expect((label ?? '').trim().length, value).toBeGreaterThan(0)
      }
    })
  }
})

describe('DIGITAL_OPPORTUNITY_OPTIONS', () => {
  it('tem as 16 opções do vocabulário fechado, sem duplicar valor', () => {
    expect(DIGITAL_OPPORTUNITY_OPTIONS).toHaveLength(16)
    const values = DIGITAL_OPPORTUNITY_OPTIONS.map((option) => option.value)
    expect(new Set(values).size).toBe(16)
  })

  it('todo label é não vazio', () => {
    for (const option of DIGITAL_OPPORTUNITY_OPTIONS) {
      expect(option.label.trim().length).toBeGreaterThan(0)
    }
  })

  it('todo value é aceito por digitalAuditSchema (é o valor canônico do banco)', () => {
    for (const option of DIGITAL_OPPORTUNITY_OPTIONS) {
      const result = digitalAuditSchema.safeParse({
        lead_id: LEAD_ID,
        digital_opportunities: [option.value],
      })
      expect(result.success, option.value).toBe(true)
    }
  })

  it('um valor fora do vocabulário é rejeitado', () => {
    const result = digitalAuditSchema.safeParse({
      lead_id: LEAD_ID,
      digital_opportunities: ['valor_inexistente'],
    })
    expect(result.success).toBe(false)
  })
})

describe('FIELD_LABELS', () => {
  it('tem rótulo não vazio para todo campo de entrada do dossiê, menos lead_id', () => {
    const rendered = new Set(schemaShapeKeys())
    rendered.delete('lead_id')

    for (const key of rendered) {
      const label = FIELD_LABELS[key]
      expect(typeof label, key).toBe('string')
      expect((label ?? '').trim().length, key).toBeGreaterThan(0)
    }
  })

  it('não tem chave que não seja campo real do schema (sem rótulo órfão)', () => {
    const valid = new Set(schemaShapeKeys())
    for (const key of Object.keys(FIELD_LABELS)) {
      expect(valid.has(key), key).toBe(true)
    }
  })

  it('não expõe digital_score nem digital_score_completeness (D-038, server-only)', () => {
    expect(FIELD_LABELS.digital_score).toBeUndefined()
    expect(FIELD_LABELS.digital_score_completeness).toBeUndefined()
  })
})

describe('rótulos auxiliares', () => {
  it('NOT_ANALYZED_LABEL é "Não analisado"', () => {
    expect(NOT_ANALYZED_LABEL).toBe('Não analisado')
  })

  it('PAGESPEED_RATING_LABELS cobre os 3 níveis', () => {
    expect(Object.keys(PAGESPEED_RATING_LABELS).sort()).toEqual(['bom', 'precisa_melhorar', 'ruim'])
  })
})
