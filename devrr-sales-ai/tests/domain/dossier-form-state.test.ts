import { describe, it, expect } from 'vitest'
import { digitalAuditSchema } from '@/lib/validation/digital-audit'
import { buildInitialValues, initialOpportunities } from '@/components/leads/dossier/form-state'
import type { DossierFieldName } from '@/components/leads/dossier/sections'
import { isoToDatetimeLocal } from '@/lib/domain/dossier-datetime'

const LEAD_ID = '11111111-1111-1111-1111-111111111111'
const UTC_MINUS_3 = 180

function initFrom(row: Partial<Record<DossierFieldName, unknown>>): Record<string, string> {
  return buildInitialValues(row, UTC_MINUS_3, '2026-01-01')
}

// Cada valor "especial" de enum, num campo cujo vocabulário curado NÃO o
// oferece. Se `buildInitialValues` o preservar E `digitalAuditSchema` o
// aceitar, o round-trip (abrir → não mexer → salvar) é seguro: o `SelectField`
// injeta a opção, então o `<select>` consegue reenviar exatamente o valor.
const ROUND_TRIP_CASES: Array<{ field: DossierFieldName; value: string }> = [
  { field: 'google_has_hours', value: 'nao_analisado' },
  { field: 'google_has_phone', value: 'nao_identificado' },
  { field: 'website_has_team', value: 'nao_se_aplica' },
  { field: 'conversion_cta_above_fold', value: 'parcialmente' },
  { field: 'website_visual_quality', value: 'nao_analisado' },
  { field: 'website_perceived_speed', value: 'nao_analisado' },
  { field: 'instagram_active', value: 'nao_analisado' },
  { field: 'google_replies_reviews', value: 'raramente' },
  { field: 'google_replies_reviews', value: 'nao_analisado' },
  { field: 'pagespeed_mobile_core_web_vitals', value: 'nao_analisado' },
  { field: 'pagespeed_desktop_core_web_vitals', value: 'dados_insuficientes' },
]

describe('buildInitialValues — preservação de valor de enum (revisão 7.6)', () => {
  for (const { field, value } of ROUND_TRIP_CASES) {
    it(`${field} = "${value}" faz round-trip (preservado no estado + aceito pelo schema)`, () => {
      // 1. estado inicial preserva o valor verbatim (não colapsa para '')
      expect(initFrom({ [field]: value })[field]).toBe(value)
      // 2. o mesmo valor, reenviado, é aceito pelo schema
      const parsed = digitalAuditSchema.safeParse({ lead_id: LEAD_ID, [field]: value })
      expect(parsed.success, `${field}=${value}`).toBe(true)
    })
  }

  it('null continua virando "" (D-037: ausência não é um valor)', () => {
    expect(initFrom({ google_has_hours: null })['google_has_hours']).toBe('')
    expect(initFrom({ website_notes: null })['website_notes']).toBe('')
  })

  it('valor de enum não é confundido com "não" — "nao" é preservado como "nao"', () => {
    expect(initFrom({ google_has_hours: 'nao' })['google_has_hours']).toBe('nao')
  })
})

describe('buildInitialValues — números e datas', () => {
  it('0 vira "0" (não "" — zero é um valor)', () => {
    expect(initFrom({ google_reviews_count: 0 })['google_reviews_count']).toBe('0')
  })

  it('null/undefined numérico vira ""', () => {
    expect(initFrom({ google_reviews_count: null })['google_reviews_count']).toBe('')
    expect(initFrom({})['google_reviews_count']).toBe('')
  })

  it('decimal preserva a representação', () => {
    expect(initFrom({ google_rating: 4.9 })['google_rating']).toBe('4.9')
  })

  it('data de calendário passa verbatim', () => {
    expect(initFrom({ researched_at: '2026-08-27' })['researched_at']).toBe('2026-08-27')
    expect(initFrom({ instagram_last_post_date: '2026-07-15' })['instagram_last_post_date']).toBe('2026-07-15')
  })

  it('pagespeed_analyzed_at (instante) vira relógio local via offset explícito', () => {
    const iso = '2026-08-27T13:00:00.000Z'
    expect(initFrom({ pagespeed_analyzed_at: iso })['pagespeed_analyzed_at']).toBe(
      isoToDatetimeLocal(iso, UTC_MINUS_3),
    )
  })
})

describe('buildInitialValues — pré-preenchimento de researched_at', () => {
  it('só na criação (sem auditoria)', () => {
    expect(buildInitialValues(null, UTC_MINUS_3, '2026-08-27')['researched_at']).toBe('2026-08-27')
    expect(buildInitialValues(undefined, UTC_MINUS_3, '2026-08-27')['researched_at']).toBe('2026-08-27')
  })

  it('na edição, mantém o que a auditoria tem — inclusive vazio', () => {
    expect(buildInitialValues({ researched_at: '2026-05-05' }, UTC_MINUS_3, '2026-08-27')['researched_at']).toBe(
      '2026-05-05',
    )
    // auditoria presente mas sem a data → NÃO pré-preenche (só criação)
    expect(buildInitialValues({ google_has_hours: 'sim' }, UTC_MINUS_3, '2026-08-27')['researched_at']).toBe('')
  })
})

describe('initialOpportunities', () => {
  it('copia o array persistido', () => {
    expect(initialOpportunities({ digital_opportunities: ['website', 'crm'] })).toEqual(['website', 'crm'])
  })

  it('ausente / não-array → []', () => {
    expect(initialOpportunities(null)).toEqual([])
    expect(initialOpportunities({})).toEqual([])
    expect(initialOpportunities({ digital_opportunities: 'x' as unknown })).toEqual([])
  })
})
