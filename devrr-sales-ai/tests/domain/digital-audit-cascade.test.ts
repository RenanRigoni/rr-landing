import { describe, it, expect } from 'vitest'
import {
  resolveClearedFields,
  WEBSITE_DEPENDENT_FIELDS,
  PAGESPEED_DEPENDENT_FIELDS,
  INSTAGRAM_DEPENDENT_FIELDS,
  GOOGLE_PROFILE_DEPENDENT_FIELDS,
} from '@/lib/domain/digital-audit-cascade'

// Cascatas do dossiê (7.4, revisão corretiva). Só `nao` limpa — D-037: nulo,
// ausente e `nao_analisado`/`nao_identificado`/`nao_se_aplica` significam "não
// avaliado" e não podem apagar pesquisa já feita.

describe('resolveClearedFields — nada a limpar', () => {
  it('estado vazio → lista vazia', () => {
    expect(resolveClearedFields({})).toEqual([])
  })

  it.each([
    ['sim' as const],
    ['parcialmente' as const],
    ['nao_analisado' as const],
    ['nao_identificado' as const],
    ['nao_se_aplica' as const],
  ])('base "%s" não dispara cascata em nenhuma seção', (value) => {
    const cleared = resolveClearedFields({
      website_exists: value,
      instagram_exists: value,
      google_business_profile: value,
    })
    expect(cleared).toEqual([])
  })

  it('base explicitamente null não dispara cascata', () => {
    expect(
      resolveClearedFields({ website_exists: null, instagram_exists: null, google_business_profile: null }),
    ).toEqual([])
  })
})

describe("resolveClearedFields — website_exists = 'nao'", () => {
  const cleared = resolveClearedFields({ website_exists: 'nao' })

  it('limpa todos os campos dependentes de website', () => {
    for (const field of WEBSITE_DEPENDENT_FIELDS) {
      expect(cleared).toContain(field)
    }
  })

  it('limpa TODO o PageSpeed, inclusive desktop e metadados da análise', () => {
    for (const field of PAGESPEED_DEPENDENT_FIELDS) {
      expect(cleared).toContain(field)
    }
    expect(cleared).toContain('pagespeed_desktop_performance')
    expect(cleared).toContain('pagespeed_analyzed_url')
    expect(cleared).toContain('pagespeed_analyzed_at')
    expect(cleared).toContain('pagespeed_field_data_available')
  })

  it('não toca Instagram nem Google quando só o website é "nao"', () => {
    for (const field of [...INSTAGRAM_DEPENDENT_FIELDS, ...GOOGLE_PROFILE_DEPENDENT_FIELDS]) {
      expect(cleared).not.toContain(field)
    }
  })

  it('preserva observações e o próprio campo-base', () => {
    expect(cleared).not.toContain('website_notes')
    expect(cleared).not.toContain('pagespeed_notes')
    expect(cleared).not.toContain('website_exists')
  })
})

describe("resolveClearedFields — instagram_exists = 'nao'", () => {
  const cleared = resolveClearedFields({ instagram_exists: 'nao' })

  it('limpa os campos estruturados do perfil', () => {
    for (const field of INSTAGRAM_DEPENDENT_FIELDS) {
      expect(cleared).toContain(field)
    }
  })

  it('preserva observação textual e o identificador procurado', () => {
    expect(cleared).not.toContain('instagram_notes')
    expect(cleared).not.toContain('instagram_username')
  })

  it('não toca website nem PageSpeed', () => {
    for (const field of [...WEBSITE_DEPENDENT_FIELDS, ...PAGESPEED_DEPENDENT_FIELDS]) {
      expect(cleared).not.toContain(field)
    }
  })
})

describe("resolveClearedFields — google_business_profile = 'nao'", () => {
  const cleared = resolveClearedFields({ google_business_profile: 'nao' })

  it('limpa os atributos do próprio perfil', () => {
    for (const field of GOOGLE_PROFILE_DEPENDENT_FIELDS) {
      expect(cleared).toContain(field)
    }
  })

  it('NÃO limpa nada que descreva a busca no Google — a empresa pode aparecer sem GBP', () => {
    for (const field of [
      'found_on_google',
      'google_result_type',
      'google_ads_active',
      'google_ads_position',
      'google_organic_position',
      'google_search_result_url',
    ]) {
      expect(cleared).not.toContain(field)
    }
  })

  it('preserva notas e identificação do negócio', () => {
    expect(cleared).not.toContain('google_notes')
    expect(cleared).not.toContain('google_business_name')
    expect(cleared).not.toContain('google_business_category')
  })
})

describe('resolveClearedFields — combinações', () => {
  it('as três bases em "nao" limpam a união dos conjuntos', () => {
    const cleared = resolveClearedFields({
      website_exists: 'nao',
      instagram_exists: 'nao',
      google_business_profile: 'nao',
    })
    const expected = [
      ...WEBSITE_DEPENDENT_FIELDS,
      ...PAGESPEED_DEPENDENT_FIELDS,
      ...INSTAGRAM_DEPENDENT_FIELDS,
      ...GOOGLE_PROFILE_DEPENDENT_FIELDS,
    ]
    expect(cleared).toHaveLength(expected.length)
    expect(new Set(cleared)).toEqual(new Set(expected))
  })

  it('bases misturadas: só a que vale "nao" dispara', () => {
    const cleared = resolveClearedFields({
      website_exists: 'sim',
      instagram_exists: 'nao',
      google_business_profile: 'nao_analisado',
    })
    expect(new Set(cleared)).toEqual(new Set(INSTAGRAM_DEPENDENT_FIELDS))
  })

  it('os quatro conjuntos são disjuntos entre si', () => {
    const all = [
      ...WEBSITE_DEPENDENT_FIELDS,
      ...PAGESPEED_DEPENDENT_FIELDS,
      ...INSTAGRAM_DEPENDENT_FIELDS,
      ...GOOGLE_PROFILE_DEPENDENT_FIELDS,
    ]
    expect(new Set(all).size).toBe(all.length)
  })
})
