import { describe, it, expect } from 'vitest'
import { digitalAuditSchema } from '@/lib/validation/digital-audit'
import {
  DOSSIER_SECTIONS,
  ALL_DOSSIER_FIELDS,
  DELIBERATELY_UNRENDERED_FIELDS,
  isFieldVisible,
  visibleFields,
  countSectionFilled,
  type DossierFieldSpec,
} from '@/components/leads/dossier/sections'

const LEAD_ID = '11111111-1111-1111-1111-111111111111'

function schemaShapeKeys(): string[] {
  return Object.keys(digitalAuditSchema.innerType().shape)
}

function spec(name: string): DossierFieldSpec {
  const found = ALL_DOSSIER_FIELDS.find((field) => field.name === name)
  if (!found) throw new Error(`campo não configurado: ${name}`)
  return found
}

function section(key: string) {
  const found = DOSSIER_SECTIONS.find((entry) => entry.key === key)
  if (!found) throw new Error(`seção não encontrada: ${key}`)
  return found
}

// ------------------------------------------------------------------------
// Conferência campo a campo: schema (7.3) × formulário (7.6)
// ------------------------------------------------------------------------

describe('cobertura do schema', () => {
  it('as 7 seções na ordem do DOSSIE §11', () => {
    expect(DOSSIER_SECTIONS.map((entry) => entry.key)).toEqual([
      'origem',
      'google',
      'website',
      'conversao',
      'instagram',
      'pagespeed',
      'diagnostico',
    ])
  })

  it('todo campo de entrada do schema é renderizado exatamente uma vez, menos os deliberadamente ocultos', () => {
    const rendered = ALL_DOSSIER_FIELDS.map((field) => field.name)
    const renderedSet = new Set<string>(rendered)

    // sem repetição entre seções
    expect(rendered.length).toBe(renderedSet.size)

    const schemaKeys = new Set(schemaShapeKeys())
    const unrendered = new Set(Object.keys(DELIBERATELY_UNRENDERED_FIELDS))

    // 1. todo campo do schema: ou renderizado, ou explicitamente listado como não renderizado
    for (const key of schemaKeys) {
      const covered = renderedSet.has(key) || unrendered.has(key)
      expect(covered, `campo do schema fora da UI e sem justificativa: ${key}`).toBe(true)
    }

    // 2. todo campo renderizado é campo real do schema
    for (const key of renderedSet) {
      expect(schemaKeys.has(key), `campo renderizado que não existe no schema: ${key}`).toBe(true)
    }

    // 3. o único campo deliberadamente oculto é lead_id (vínculo imutável)
    expect(Object.keys(DELIBERATELY_UNRENDERED_FIELDS)).toEqual(['lead_id'])
  })

  it('conta 101 campos de entrada renderizados (102 no schema − lead_id)', () => {
    expect(ALL_DOSSIER_FIELDS).toHaveLength(schemaShapeKeys().length - 1)
    expect(ALL_DOSSIER_FIELDS).toHaveLength(101)
  })

  it('não existe campo de formulário para digital_score / digital_score_completeness (D-038)', () => {
    const names = ALL_DOSSIER_FIELDS.map((field) => field.name)
    expect(names).not.toContain('digital_score')
    expect(names).not.toContain('digital_score_completeness')
  })
})

// ------------------------------------------------------------------------
// Tipos de campo específicos
// ------------------------------------------------------------------------

describe('tipos de campo', () => {
  it('researched_at é data de calendário na seção Origem', () => {
    expect(spec('researched_at').type).toBe('date')
    expect(section('origem').fields.some((field) => field.name === 'researched_at')).toBe(true)
  })

  it('instagram_last_post_date é data de calendário', () => {
    expect(spec('instagram_last_post_date').type).toBe('date')
  })

  it('pagespeed_analyzed_at é datetime (timestamptz — instante, não data de calendário)', () => {
    expect(spec('pagespeed_analyzed_at').type).toBe('datetime')
  })

  it('digital_opportunities é multicheck e a seção Diagnóstico carrega o sentinel', () => {
    expect(spec('digital_opportunities').type).toBe('multicheck')
    expect(section('diagnostico').hasOpportunities).toBe(true)
  })

  it('nenhuma outra seção carrega o grupo de oportunidades', () => {
    const withOpportunities = DOSSIER_SECTIONS.filter((entry) => entry.hasOpportunities)
    expect(withOpportunities.map((entry) => entry.key)).toEqual(['diagnostico'])
  })
})

// ------------------------------------------------------------------------
// Visibilidade condicional
// ------------------------------------------------------------------------

describe('condicional — Website', () => {
  const dependent = spec('website_url')

  it('campos dependentes só aparecem com website_exists = "sim"', () => {
    expect(isFieldVisible(dependent, { website_exists: 'sim' })).toBe(true)
    expect(isFieldVisible(dependent, { website_exists: 'nao' })).toBe(false)
    expect(isFieldVisible(dependent, { website_exists: '' })).toBe(false)
    expect(isFieldVisible(dependent, {})).toBe(false)
  })

  it('a própria base e as observações do site aparecem sempre', () => {
    expect(isFieldVisible(spec('website_exists'), { website_exists: 'nao' })).toBe(true)
    expect(isFieldVisible(spec('website_notes'), { website_exists: 'nao' })).toBe(true)
  })

  it('PageSpeed também depende da existência do site', () => {
    expect(isFieldVisible(spec('pagespeed_mobile_performance'), { website_exists: 'nao' })).toBe(false)
    expect(isFieldVisible(spec('pagespeed_mobile_performance'), { website_exists: 'sim' })).toBe(true)
    // exceto as observações do PageSpeed
    expect(isFieldVisible(spec('pagespeed_notes'), { website_exists: 'nao' })).toBe(true)
  })
})

describe('condicional — Instagram', () => {
  it('campos estruturados dependem de instagram_exists = "sim"; usuário e observações não', () => {
    expect(isFieldVisible(spec('instagram_url'), { instagram_exists: 'sim' })).toBe(true)
    expect(isFieldVisible(spec('instagram_url'), { instagram_exists: 'nao' })).toBe(false)
    expect(isFieldVisible(spec('instagram_username'), { instagram_exists: 'nao' })).toBe(true)
    expect(isFieldVisible(spec('instagram_notes'), { instagram_exists: 'nao' })).toBe(true)
    expect(isFieldVisible(spec('instagram_exists'), { instagram_exists: 'nao' })).toBe(true)
  })
})

describe('condicional — Google Business Profile', () => {
  it('atributos do perfil somem só quando google_business_profile = "nao"', () => {
    expect(isFieldVisible(spec('google_rating'), { google_business_profile: 'nao' })).toBe(false)
    expect(isFieldVisible(spec('google_rating'), { google_business_profile: 'sim' })).toBe(true)
    expect(isFieldVisible(spec('google_rating'), { google_business_profile: 'nao_identificado' })).toBe(true)
    expect(isFieldVisible(spec('google_rating'), {})).toBe(true)
  })

  it('campos independentes de pesquisa continuam disponíveis mesmo sem perfil', () => {
    const searchFields = [
      'found_on_google',
      'google_result_type',
      'google_ads_active',
      'google_ads_position',
      'google_organic_position',
      'google_search_result_url',
    ]
    for (const name of searchFields) {
      expect(isFieldVisible(spec(name), { google_business_profile: 'nao' }), name).toBe(true)
    }
    // e a identificação / nota livre do próprio bloco Google
    expect(isFieldVisible(spec('google_business_name'), { google_business_profile: 'nao' })).toBe(true)
    expect(isFieldVisible(spec('google_notes'), { google_business_profile: 'nao' })).toBe(true)
  })
})

// ------------------------------------------------------------------------
// Contadores "N de M preenchidos"
// ------------------------------------------------------------------------

describe('countSectionFilled', () => {
  it('conta só campos visíveis com valor, ignorando os ocultos', () => {
    const website = section('website')
    // sem site: só a base + as observações do site ficam visíveis
    expect(countSectionFilled(website, { website_exists: '' }, [])).toEqual({ filled: 0, total: 2 })
    expect(countSectionFilled(website, { website_exists: 'sim' }, [])).toEqual({ filled: 1, total: 22 })
    expect(
      countSectionFilled(website, { website_exists: 'sim', website_url: 'https://x.com' }, []),
    ).toEqual({ filled: 2, total: 22 })
  })

  it('multicheck conta como 1 quando há ao menos uma oportunidade marcada', () => {
    const diagnostico = section('diagnostico')
    expect(countSectionFilled(diagnostico, {}, [])).toEqual({ filled: 0, total: 6 })
    expect(countSectionFilled(diagnostico, {}, ['website'])).toEqual({ filled: 1, total: 6 })
  })

  it('valor só com espaços não conta como preenchido', () => {
    expect(countSectionFilled(section('origem'), { search_query: '   ' }, [])).toEqual({
      filled: 0,
      total: 9,
    })
  })
})

// ------------------------------------------------------------------------
// Vocabulário dos selects × schema
// ------------------------------------------------------------------------

describe('opções dos selects', () => {
  const selects = ALL_DOSSIER_FIELDS.filter((field) => field.type === 'select')

  it('todo select tem enumGroup e ao menos uma opção afirmativa', () => {
    for (const field of selects) {
      expect(field.enumGroup, field.name).toBeDefined()
      expect((field.options ?? []).length, field.name).toBeGreaterThan(0)
    }
  })

  it('todo valor de opção é aceito pelo schema no campo correspondente', () => {
    for (const field of selects) {
      for (const value of field.options ?? []) {
        const result = digitalAuditSchema.safeParse({ lead_id: LEAD_ID, [field.name]: value })
        expect(result.success, `${field.name} = ${value}`).toBe(true)
      }
    }
  })

  it('valor fora do vocabulário é rejeitado pelo schema', () => {
    for (const field of selects) {
      const result = digitalAuditSchema.safeParse({ lead_id: LEAD_ID, [field.name]: '__nao_existe__' })
      expect(result.success, field.name).toBe(false)
    }
  })

  it('nenhuma lista de opções inclui nao_analisado (a opção vazia já cobre esse estado)', () => {
    for (const field of selects) {
      expect(field.options ?? [], field.name).not.toContain('nao_analisado')
    }
  })
})

// ------------------------------------------------------------------------
// Coerência dos limites numéricos com o schema / DOSSIE §19
// ------------------------------------------------------------------------

describe('limites numéricos', () => {
  const numbers = ALL_DOSSIER_FIELDS.filter((field) => field.type === 'number')

  it('min nunca é maior que max', () => {
    for (const field of numbers) {
      if (field.min !== undefined && field.max !== undefined) {
        expect(field.min, field.name).toBeLessThanOrEqual(field.max)
      }
    }
  })

  it('pares conhecidos batem com DOSSIE §19', () => {
    expect(spec('google_rating')).toMatchObject({ min: 0, max: 5, step: 0.1 })
    expect(spec('digital_opportunity_score')).toMatchObject({ min: 0, max: 10 })
    expect(spec('pagespeed_mobile_performance')).toMatchObject({ min: 0, max: 100 })
    expect(spec('google_ads_position')).toMatchObject({ min: 1 })
    expect(spec('google_organic_position')).toMatchObject({ min: 1 })
  })
})

// ------------------------------------------------------------------------
// visibleFields (usado pelo formulário para decidir o que sai no FormData)
// ------------------------------------------------------------------------

describe('visibleFields', () => {
  it('remove os dependentes de site quando não há site', () => {
    const website = section('website')
    const names = visibleFields(website, { website_exists: 'nao' }).map((field) => field.name)
    expect(names).toEqual(['website_exists', 'website_notes'])
  })
})
