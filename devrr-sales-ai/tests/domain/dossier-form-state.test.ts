import { describe, it, expect } from 'vitest'
import { digitalAuditSchema } from '@/lib/validation/digital-audit'
import {
  buildInitialValues,
  initialOpportunities,
  clearSectionValues,
  markSectionNotAnalyzedValues,
} from '@/components/leads/dossier/form-state'
import {
  DOSSIER_SECTIONS,
  ALL_DOSSIER_FIELDS,
  visibleFields,
  type DossierFieldName,
  type DossierSectionSpec,
} from '@/components/leads/dossier/sections'
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

// ------------------------------------------------------------------------
// Ações em massa: Limpar seção / Marcar não analisado
// ------------------------------------------------------------------------

function section(key: string): DossierSectionSpec {
  const found = DOSSIER_SECTIONS.find((s) => s.key === key)
  if (!found) throw new Error(`seção não encontrada: ${key}`)
  return found
}

/** `values` com todos os 101 campos escalares preenchidos com algo não vazio. */
function allFilled(): Record<string, string> {
  const values: Record<string, string> = {}
  for (const field of ALL_DOSSIER_FIELDS) {
    if (field.type === 'multicheck') continue
    if (field.type === 'select') values[field.name] = field.options?.[0] ?? 'sim'
    else if (field.type === 'number') values[field.name] = '5'
    else if (field.type === 'date') values[field.name] = '2026-08-27'
    else if (field.type === 'datetime') values[field.name] = '2026-08-27T10:00'
    else values[field.name] = 'x'
  }
  return values
}

describe('clearSectionValues', () => {
  it('esvazia só os campos da seção, sem tocar em outra seção', () => {
    const before = allFilled()
    const out = clearSectionValues(section('google'), before)

    for (const field of section('google').fields) {
      if (field.type !== 'multicheck') expect(out[field.name], field.name).toBe('')
    }
    // campo de outra seção intacto
    expect(out['website_url']).toBe(before['website_url'])
    expect(out['conversion_friction_notes']).toBe(before['conversion_friction_notes'])
  })

  it('não cria nem toca chaves de controle (lead_id, audit_id, expected_updated_at, sentinel)', () => {
    const out = clearSectionValues(section('diagnostico'), allFilled())
    expect('lead_id' in out).toBe(false)
    expect('audit_id' in out).toBe(false)
    expect('expected_updated_at' in out).toBe(false)
    expect('digital_opportunities_present' in out).toBe(false)
    // o multicheck também não vira chave de `values`
    expect('digital_opportunities' in out).toBe(false)
  })

  it('nunca produz "nao" — só ""', () => {
    const out = clearSectionValues(section('website'), allFilled())
    for (const value of Object.values(out)) expect(value).not.toBe('nao')
  })
})

const ASSESSMENT_TYPES = new Set(['select', 'number', 'date', 'datetime'])

describe('markSectionNotAnalyzedValues', () => {
  it('zera avaliação (select/number/date/datetime); identificação e notas ficam intactas', () => {
    const before = allFilled()
    const out = markSectionNotAnalyzedValues(section('instagram'), before)

    for (const field of section('instagram').fields) {
      if (field.type === 'multicheck') continue
      if (ASSESSMENT_TYPES.has(field.type)) expect(out[field.name], field.name).toBe('')
      else expect(out[field.name], field.name).toBe(before[field.name]) // text/url/textarea
    }
    // concreto: username (text) e observação (textarea) sobrevivem
    expect(out['instagram_username']).toBe(before['instagram_username'])
    expect(out['instagram_notes']).toBe(before['instagram_notes'])
    // data e selects zerados
    expect(out['instagram_last_post_date']).toBe('')
    expect(out['instagram_active']).toBe('')
  })

  it('NUNCA produz "nao" em nenhuma seção (D-037: "não analisado" ≠ "não")', () => {
    for (const s of DOSSIER_SECTIONS) {
      const out = markSectionNotAnalyzedValues(s, allFilled())
      for (const [key, value] of Object.entries(out)) {
        expect(value, `${s.key}.${key}`).not.toBe('nao')
      }
    }
  })

  it('não toca campo de outra seção', () => {
    const before = allFilled()
    const out = markSectionNotAnalyzedValues(section('conversao'), before)
    expect(out['google_business_profile']).toBe(before['google_business_profile'])
    expect(out['website_https']).toBe(before['website_https'])
  })

  it('números de avaliação também zeram (google_rating, digital_opportunity_score, pagespeed)', () => {
    expect(markSectionNotAnalyzedValues(section('google'), allFilled())['google_rating']).toBe('')
    expect(
      markSectionNotAnalyzedValues(section('diagnostico'), allFilled())['digital_opportunity_score'],
    ).toBe('')
    expect(
      markSectionNotAnalyzedValues(section('pagespeed'), allFilled())['pagespeed_mobile_performance'],
    ).toBe('')
  })

  it('condicionais Website: base vira "" → dependentes ficam ocultos, não vão no FormData', () => {
    const out = markSectionNotAnalyzedValues(section('website'), allFilled())
    expect(out['website_exists']).toBe('')
    const visible = visibleFields(section('website'), out).map((f) => f.name)
    expect(visible).toEqual(['website_exists', 'website_notes'])
  })

  it('Google Business: base "" e atributos do perfil vazios (visíveis, mas sem valor contraditório)', () => {
    const before = allFilled()
    const out = markSectionNotAnalyzedValues(section('google'), before)
    expect(out['google_business_profile']).toBe('')
    // atributos do perfil zerados
    expect(out['google_rating']).toBe('')
    expect(out['google_has_photos']).toBe('')
    expect(out['google_profile_completeness']).toBe('')
    // identificação e nota livre preservadas
    expect(out['google_business_name']).toBe(before['google_business_name'])
    expect(out['google_notes']).toBe(before['google_notes'])
    // base '' (≠ 'nao') → os campos do perfil seguem visíveis, mas todos
    // vazios: FormData manda '' → null, nunca um valor que contradiga a base
    const visible = visibleFields(section('google'), out)
    for (const field of visible) {
      if (ASSESSMENT_TYPES.has(field.type)) expect(out[field.name], field.name).toBe('')
    }
  })
})
