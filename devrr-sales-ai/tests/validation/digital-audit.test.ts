import { describe, it, expect } from 'vitest'
import { digitalAuditSchema } from '@/lib/validation/digital-audit'

const LEAD_ID = '11111111-1111-1111-1111-111111111111'

function parse(input: Record<string, unknown>) {
  return digitalAuditSchema.safeParse({ lead_id: LEAD_ID, ...input })
}

describe('digitalAuditSchema — lead_id', () => {
  it('exige lead_id', () => {
    expect(digitalAuditSchema.safeParse({}).success).toBe(false)
  })

  it('rejeita lead_id que não é uuid', () => {
    expect(digitalAuditSchema.safeParse({ lead_id: 'nope' }).success).toBe(false)
  })

  it('aceita payload só com lead_id (salvar parcial é o caminho normal)', () => {
    const result = parse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.lead_id).toBe(LEAD_ID)
      // Ausente, igual a qualquer outro campo opcional — não é `[]` por
      // default (revisão corretiva 7.4, achado 1: ver describe abaixo).
      expect(result.data.digital_opportunities).toBeUndefined()
    }
  })
})

describe('digitalAuditSchema — campo vazio vira null, nunca 0/erro', () => {
  it('numéricos em branco → null (não 0)', () => {
    const result = parse({
      google_rating: '',
      google_reviews_count: '   ',
      google_ads_position: '',
      conversion_clicks_to_whatsapp: '',
      pagespeed_mobile_performance: '',
      pagespeed_mobile_lcp: '',
      pagespeed_mobile_cls: '',
      digital_opportunity_score: '',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.google_rating).toBeNull()
      expect(result.data.google_reviews_count).toBeNull()
      expect(result.data.google_ads_position).toBeNull()
      expect(result.data.conversion_clicks_to_whatsapp).toBeNull()
      expect(result.data.pagespeed_mobile_performance).toBeNull()
      expect(result.data.pagespeed_mobile_lcp).toBeNull()
      expect(result.data.pagespeed_mobile_cls).toBeNull()
      expect(result.data.digital_opportunity_score).toBeNull()
    }
  })

  it('enum e texto em branco → null', () => {
    const result = parse({ google_business_profile: '', website_notes: '', google_search_result_url: '' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.google_business_profile).toBeNull()
      expect(result.data.website_notes).toBeNull()
      expect(result.data.google_search_result_url).toBeNull()
    }
  })

  it('campo ausente → undefined (não 0, não null)', () => {
    const result = parse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.google_rating).toBeUndefined()
      expect(result.data.website_exists).toBeUndefined()
    }
  })
})

describe('digitalAuditSchema — "não avaliado" × "não" são estados distintos', () => {
  it('preserva `nao` como valor (não confunde com vazio)', () => {
    const result = parse({ google_has_photos: 'nao' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.google_has_photos).toBe('nao')
  })

  it('aceita `nao_analisado` como valor legítimo do enum', () => {
    const result = parse({ website_visual_quality: 'nao_analisado', google_replies_reviews: 'nao_analisado' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.website_visual_quality).toBe('nao_analisado')
      expect(result.data.google_replies_reviews).toBe('nao_analisado')
    }
  })

  it('rejeita valor fora do vocabulário do enum', () => {
    expect(parse({ google_has_photos: 'talvez' }).success).toBe(false)
  })
})

describe('digitalAuditSchema — limites numéricos (DOSSIE §19)', () => {
  it('google_rating: 4.5 aceito, 5.1 rejeitado, 4.55 rejeitado (uma casa decimal)', () => {
    expect(parse({ google_rating: '4.5' }).success).toBe(true)
    expect(parse({ google_rating: '5.1' }).success).toBe(false)
    expect(parse({ google_rating: '4.55' }).success).toBe(false)
    expect(parse({ google_rating: '-0.1' }).success).toBe(false)
  })

  it('scores Lighthouse: 100 aceito, 101 rejeitado, não-inteiro rejeitado', () => {
    expect(parse({ pagespeed_mobile_seo: '100' }).success).toBe(true)
    expect(parse({ pagespeed_mobile_seo: '101' }).success).toBe(false)
    expect(parse({ pagespeed_desktop_performance: '87.5' }).success).toBe(false)
  })

  it('digital_opportunity_score: 0–10', () => {
    expect(parse({ digital_opportunity_score: '10' }).success).toBe(true)
    expect(parse({ digital_opportunity_score: '11' }).success).toBe(false)
  })

  it('posições >= 1: 0 rejeitado, 1 aceito', () => {
    expect(parse({ google_ads_position: '0' }).success).toBe(false)
    expect(parse({ google_organic_position: '0' }).success).toBe(false)
    expect(parse({ google_ads_position: '1' }).success).toBe(true)
  })

  it('contadores >= 0 inteiros', () => {
    expect(parse({ google_reviews_count: '0' }).success).toBe(true)
    expect(parse({ google_reviews_count: '-1' }).success).toBe(false)
    expect(parse({ google_reviews_count: '12.5' }).success).toBe(false)
    expect(parse({ conversion_clicks_to_whatsapp: '-1' }).success).toBe(false)
  })

  it('CLS decimal >= 0; tempos em ms inteiros >= 0', () => {
    const ok = parse({ pagespeed_mobile_cls: '0.05', pagespeed_mobile_lcp: '2480' })
    expect(ok.success).toBe(true)
    if (ok.success) {
      expect(ok.data.pagespeed_mobile_cls).toBe(0.05)
      expect(ok.data.pagespeed_mobile_lcp).toBe(2480)
    }
    expect(parse({ pagespeed_mobile_cls: '-0.1' }).success).toBe(false)
    expect(parse({ pagespeed_desktop_lcp: '-1' }).success).toBe(false)
    expect(parse({ pagespeed_desktop_lcp: '12.5' }).success).toBe(false)
  })

  it('coage string do formulário para número', () => {
    const result = parse({ google_rating: '4.2', google_reviews_count: '37' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.google_rating).toBe(4.2)
      expect(result.data.google_reviews_count).toBe(37)
    }
  })
})

describe('digitalAuditSchema — URLs', () => {
  it('URL válida aceita, inválida rejeitada, vazia aceita (vira null)', () => {
    expect(parse({ website_url: 'https://exemplo.com.br' }).success).toBe(true)
    expect(parse({ website_url: 'não-é-url' }).success).toBe(false)

    const empty = parse({ website_url: '' })
    expect(empty.success).toBe(true)
    if (empty.success) expect(empty.data.website_url).toBeNull()
  })
})

describe('digitalAuditSchema — digital_opportunities', () => {
  // Revisão corretiva da 7.4 (achado 1): `.default([])` fazia o Zod gravar
  // `[]` no output mesmo com a chave ausente do request, o que um update
  // parcial lia como "limpar o array" — quebra a mesma invariante que todo
  // outro campo do schema respeita (campo ausente não altera o persistido).
  it('ausente → chave não aparece no output (não vira [] sozinho)', () => {
    const result = parse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect('digital_opportunities' in result.data).toBe(false)
      expect(result.data.digital_opportunities).toBeUndefined()
    }
  })

  it('presente e vazio (limpeza explícita) → []', () => {
    const result = parse({ digital_opportunities: [] })
    expect(result.success).toBe(true)
    if (result.success) {
      expect('digital_opportunities' in result.data).toBe(true)
      expect(result.data.digital_opportunities).toEqual([])
    }
  })

  it('aceita subconjunto válido do vocabulário', () => {
    const result = parse({ digital_opportunities: ['website', 'seo_local', 'whatsapp'] })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.digital_opportunities).toEqual(['website', 'seo_local', 'whatsapp'])
  })

  it('rejeita valor fora do vocabulário', () => {
    expect(parse({ digital_opportunities: ['website', 'xpto'] }).success).toBe(false)
  })
})

describe('digitalAuditSchema — digital_score não é input (D-038)', () => {
  it('ignora digital_score / digital_score_completeness enviados pelo cliente', () => {
    const result = parse({ digital_score: 999, digital_score_completeness: 999 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect('digital_score' in result.data).toBe(false)
      expect('digital_score_completeness' in result.data).toBe(false)
    }
  })
})

describe('digitalAuditSchema — campos de controle fora do schema (revisão 7.6)', () => {
  it('audit_id e expected_updated_at são descartados do parse (lidos fora do schema pela action)', () => {
    const result = parse({
      audit_id: 'a3f1c2d4-0000-4000-8000-000000000000',
      expected_updated_at: '2026-08-27T13:00:00.000Z',
      google_business_profile: 'sim',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect('audit_id' in result.data).toBe(false)
      expect('expected_updated_at' in result.data).toBe(false)
      expect(result.data.google_business_profile).toBe('sim')
    }
  })

  it('expected_updated_at com formato qualquer não quebra a validação (a action é que valida o formato)', () => {
    expect(parse({ expected_updated_at: 'qualquer-coisa' }).success).toBe(true)
  })
})

describe('digitalAuditSchema — estados contraditórios', () => {
  it("website_exists='nao' + campo interno afirmativo → rejeitado no path do campo", () => {
    const result = parse({ website_exists: 'nao', website_has_whatsapp: 'sim' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.join('.') === 'website_has_whatsapp')).toBe(true)
    }
  })

  it("website_exists='nao' + URL interna preenchida → rejeitado", () => {
    expect(parse({ website_exists: 'nao', website_url: 'https://x.com' }).success).toBe(false)
  })

  it("website_exists='nao' + campo interno 'nao'/'nao_analisado' → aceito (não é contradição)", () => {
    const result = parse({
      website_exists: 'nao',
      website_https: 'nao',
      website_mobile_friendly: 'nao_analisado',
      website_notes: 'confirmado: empresa não tem site',
    })
    expect(result.success).toBe(true)
  })

  it("website_exists nulo/ausente + campo interno afirmativo → aceito (salvar parcial)", () => {
    expect(parse({ website_has_whatsapp: 'sim' }).success).toBe(true)
    expect(parse({ website_exists: 'nao_analisado', website_has_whatsapp: 'sim' }).success).toBe(true)
  })

  it("instagram_exists='nao' + campo interno afirmativo → rejeitado", () => {
    const result = parse({ instagram_exists: 'nao', instagram_active: 'ativo' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.join('.') === 'instagram_active')).toBe(true)
    }
  })

  it("google_business_profile='nao' + atributo do perfil preenchido → rejeitado", () => {
    const result = parse({ google_business_profile: 'nao', google_rating: '4.5' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.join('.') === 'google_rating')).toBe(true)
    }
  })

  it("google_business_profile='nao' + campo de BUSCA (não do perfil) → aceito", () => {
    // posição orgânica / anúncios / URL do resultado são sobre a SERP, não o GBP
    const result = parse({
      google_business_profile: 'nao',
      google_organic_position: '3',
      found_on_google: 'sim',
      google_search_result_url: 'https://google.com/search?q=x',
    })
    expect(result.success).toBe(true)
  })
})

describe('digitalAuditSchema — datas de calendário (date) não passam por fuso', () => {
  it('researched_at fica exatamente a string AAAA-MM-DD, sem virar Date', () => {
    const result = parse({ researched_at: '2026-08-27' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.researched_at).toBe('2026-08-27')
      expect(result.data.researched_at).not.toBeInstanceOf(Date)
    }
  })

  it('instagram_last_post_date também fica string exata', () => {
    const result = parse({ instagram_last_post_date: '2026-07-15' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.instagram_last_post_date).toBe('2026-07-15')
  })

  it('rejeita data inexistente no calendário em vez de normalizar em silêncio', () => {
    // z.coerce.date() aceitava '2026-02-31' e devolvia 2026-03-03.
    expect(parse({ researched_at: '2026-02-31' }).success).toBe(false)
    expect(parse({ researched_at: '2026-13-01' }).success).toBe(false)
    expect(parse({ instagram_last_post_date: '2026-04-31' }).success).toBe(false)
  })

  it('aceita 29 de fevereiro em ano bissexto e rejeita em ano comum', () => {
    expect(parse({ researched_at: '2028-02-29' }).success).toBe(true)
    expect(parse({ researched_at: '2026-02-29' }).success).toBe(false)
  })

  it('rejeita datetime com fuso num campo de calendário (era o que deslocava o dia)', () => {
    // '2026-08-27T23:00:00-03:00' virava '2026-08-28' ao passar por UTC.
    expect(parse({ researched_at: '2026-08-27T23:00:00-03:00' }).success).toBe(false)
    expect(parse({ researched_at: '27/08/2026' }).success).toBe(false)
  })

  it('data vazia continua virando null', () => {
    const result = parse({ researched_at: '', instagram_last_post_date: '' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.researched_at).toBeNull()
      expect(result.data.instagram_last_post_date).toBeNull()
    }
  })
})

describe('digitalAuditSchema — pagespeed_analyzed_at é instante (timestamptz)', () => {
  it('continua sendo Date, preservando o instante com fuso', () => {
    const result = parse({ pagespeed_analyzed_at: '2026-08-27T10:30:00.000Z' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.pagespeed_analyzed_at).toBeInstanceOf(Date)
      expect(result.data.pagespeed_analyzed_at?.toISOString()).toBe('2026-08-27T10:30:00.000Z')
    }
  })

  it('aceita offset explícito e normaliza para o mesmo instante em UTC', () => {
    const result = parse({ pagespeed_analyzed_at: '2026-08-27T23:00:00-03:00' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.pagespeed_analyzed_at?.toISOString()).toBe('2026-08-28T02:00:00.000Z')
    }
  })

  it('rejeita instante inválido', () => {
    expect(parse({ pagespeed_analyzed_at: 'ontem' }).success).toBe(false)
  })
})

describe('digitalAuditSchema — payload completo', () => {

  it('payload coerente e rico passa inteiro', () => {
    const result = parse({
      researched_at: '2026-08-27',
      search_query: 'clareamento dental',
      search_location: 'Uberlândia - MG',
      found_on_google: 'sim',
      google_result_type: 'maps',
      google_business_profile: 'sim',
      google_rating: '4.7',
      google_reviews_count: '128',
      google_replies_reviews: 'algumas',
      google_profile_completeness: 'boa',
      website_exists: 'sim',
      website_url: 'https://clinica.example',
      website_visual_quality: 'boa',
      website_perceived_speed: 'aceitavel',
      conversion_clicks_to_whatsapp: '2',
      instagram_exists: 'sim',
      instagram_active: 'ativo',
      instagram_url: 'https://instagram.com/clinica',
      pagespeed_mobile_performance: '72',
      pagespeed_mobile_core_web_vitals: 'reprovado',
      pagespeed_mobile_lcp: '3400',
      pagespeed_mobile_cls: '0.12',
      digital_opportunities: ['website', 'performance', 'seo_local'],
      digital_sales_priority: 'alta',
      digital_opportunity_score: '8',
    })
    expect(result.success).toBe(true)
  })
})
