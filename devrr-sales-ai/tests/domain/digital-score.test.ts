import { describe, it, expect } from 'vitest'
import {
  computeDigitalScore,
  type DigitalAuditFields,
  type DigitalScoreResult,
  type DigitalScoreSection,
} from '@/lib/domain/digital-score'

// Tabela de pesos e regras de cascata: docs/IMPLEMENTATION_PLAN.md → 7.2.
// D-037: `null`/`nao_analisado` = não avaliado (sai do numerador E do
// denominador); `nao` = avaliado e ausente (fica no denominador, vale 0).

function emptyAudit(): DigitalAuditFields {
  return {
    google_business_profile: null,
    google_rating: null,
    google_reviews_count: null,
    google_recent_reviews: null,
    google_replies_reviews: null,
    google_has_photos: null,
    google_has_hours: null,
    google_has_phone: null,
    google_has_website: null,
    google_easy_whatsapp: null,
    google_has_booking: null,
    website_exists: null,
    website_https: null,
    website_mobile_friendly: null,
    website_visual_quality: null,
    website_perceived_speed: null,
    website_services_clear: null,
    website_has_target_service_page: null,
    website_has_clear_cta: null,
    website_has_whatsapp: null,
    website_has_contact_form: null,
    website_has_online_booking: null,
    website_phone_visible: null,
    website_has_social_proof: null,
    conversion_clear_contact_path: null,
    conversion_clicks_to_whatsapp: null,
    conversion_cta_above_fold: null,
    conversion_repeated_cta: null,
    conversion_alternative_capture: null,
    conversion_has_friction: null,
    pagespeed_mobile_performance: null,
    pagespeed_mobile_core_web_vitals: null,
    pagespeed_mobile_seo: null,
    pagespeed_mobile_accessibility: null,
    pagespeed_mobile_best_practices: null,
    pagespeed_desktop_performance: null,
    pagespeed_desktop_core_web_vitals: null,
    instagram_exists: null,
    instagram_has_bio_link: null,
    instagram_clear_bio: null,
    instagram_has_cta: null,
    instagram_easy_whatsapp: null,
    instagram_easy_website: null,
    instagram_active: null,
    instagram_visual_quality: null,
    instagram_services_content: null,
  }
}

/** Toda resposta no melhor valor possível → 100/100. */
function perfectAudit(): DigitalAuditFields {
  return {
    google_business_profile: 'sim',
    google_rating: 5,
    google_reviews_count: 100,
    google_recent_reviews: 'sim',
    google_replies_reviews: 'frequentemente',
    google_has_photos: 'sim',
    google_has_hours: 'sim',
    google_has_phone: 'sim',
    google_has_website: 'sim',
    google_easy_whatsapp: 'sim',
    google_has_booking: 'sim',
    website_exists: 'sim',
    website_https: 'sim',
    website_mobile_friendly: 'sim',
    website_visual_quality: 'excelente',
    website_perceived_speed: 'rapido',
    website_services_clear: 'sim',
    website_has_target_service_page: 'sim',
    website_has_clear_cta: 'sim',
    website_has_whatsapp: 'sim',
    website_has_contact_form: 'sim',
    website_has_online_booking: 'sim',
    website_phone_visible: 'sim',
    website_has_social_proof: 'sim',
    conversion_clear_contact_path: 'sim',
    conversion_clicks_to_whatsapp: 0,
    conversion_cta_above_fold: 'sim',
    conversion_repeated_cta: 'sim',
    conversion_alternative_capture: 'sim',
    conversion_has_friction: 'nao', // invertido → 1
    pagespeed_mobile_performance: 100,
    pagespeed_mobile_core_web_vitals: 'aprovado',
    pagespeed_mobile_seo: 100,
    pagespeed_mobile_accessibility: 100,
    pagespeed_mobile_best_practices: 100,
    pagespeed_desktop_performance: 100,
    pagespeed_desktop_core_web_vitals: 'aprovado',
    instagram_exists: 'sim',
    instagram_has_bio_link: 'sim',
    instagram_clear_bio: 'sim',
    instagram_has_cta: 'sim',
    instagram_easy_whatsapp: 'sim',
    instagram_easy_website: 'sim',
    instagram_active: 'ativo',
    instagram_visual_quality: 'excelente',
    instagram_services_content: 'sim',
  }
}

function audit(overrides: Partial<DigitalAuditFields>): DigitalAuditFields {
  return { ...emptyAudit(), ...overrides }
}

function section(result: DigitalScoreResult, key: DigitalScoreSection['key']): DigitalScoreSection {
  const found = result.sections.find((s) => s.key === key)
  if (!found) throw new Error(`seção "${key}" ausente`)
  return found
}

describe('computeDigitalScore — casos base', () => {
  it('auditoria toda vazia → score null, completude 0, todas as seções zeradas', () => {
    const result = computeDigitalScore(emptyAudit())
    expect(result.score).toBeNull()
    expect(result.completeness).toBe(0)
    expect(result.earned).toBe(0)
    expect(result.available).toBe(0)
    expect(result.sections).toHaveLength(5)
    for (const s of result.sections) {
      expect(s.earned).toBe(0)
      expect(s.available).toBe(0)
    }
  })

  it('auditoria perfeita → 100/100', () => {
    const result = computeDigitalScore(perfectAudit())
    expect(result.score).toBe(100)
    expect(result.completeness).toBe(100)
    expect(result.earned).toBe(100)
    expect(result.available).toBe(100)
  })

  it('todos os itens no pior valor (sem gatilho de cascata) → score baixo, completude 100', () => {
    // bases em 'sim' (não disparam cascata), todo o resto no pior valor válido
    const result = computeDigitalScore(
      audit({
        google_business_profile: 'sim',
        google_rating: 2,
        google_reviews_count: 0,
        google_recent_reviews: 'nao',
        google_replies_reviews: 'nao',
        google_has_photos: 'nao',
        google_has_hours: 'nao',
        google_has_phone: 'nao',
        google_has_website: 'nao',
        google_easy_whatsapp: 'nao',
        google_has_booking: 'nao',
        website_exists: 'sim',
        website_https: 'nao',
        website_mobile_friendly: 'nao',
        website_visual_quality: 'ruim',
        website_perceived_speed: 'muito_lento',
        website_services_clear: 'nao',
        website_has_target_service_page: 'nao',
        website_has_clear_cta: 'nao',
        website_has_whatsapp: 'nao',
        website_has_contact_form: 'nao',
        website_has_online_booking: 'nao',
        website_phone_visible: 'nao',
        website_has_social_proof: 'nao',
        conversion_clear_contact_path: 'nao',
        conversion_clicks_to_whatsapp: 4,
        conversion_cta_above_fold: 'nao',
        conversion_repeated_cta: 'nao',
        conversion_alternative_capture: 'nao',
        conversion_has_friction: 'sim', // invertido → 0
        pagespeed_mobile_performance: 0,
        pagespeed_mobile_core_web_vitals: 'reprovado',
        pagespeed_mobile_seo: 0,
        pagespeed_mobile_accessibility: 0,
        pagespeed_mobile_best_practices: 0,
        pagespeed_desktop_performance: 0,
        pagespeed_desktop_core_web_vitals: 'reprovado',
        instagram_exists: 'sim',
        instagram_has_bio_link: 'nao',
        instagram_clear_bio: 'nao',
        instagram_has_cta: 'nao',
        instagram_easy_whatsapp: 'nao',
        instagram_easy_website: 'nao',
        instagram_active: 'inativo',
        instagram_visual_quality: 'ruim',
        instagram_services_content: 'nao',
      }),
    )
    // Só os 3 campos-base 'sim' pontuam: google 4 + website 5 + instagram 3 = 12.
    expect(result.score).toBe(12)
    expect(result.completeness).toBe(100)
    expect(result.earned).toBe(12)
    expect(result.available).toBe(100)
  })
})

describe('computeDigitalScore — nao_analisado × nao (D-037)', () => {
  it('um campo `nao_analisado` reduz a completude e NÃO derruba o score', () => {
    const result = computeDigitalScore({ ...perfectAudit(), google_has_booking: 'nao_analisado' })
    expect(result.score).toBe(100)
    expect(result.completeness).toBe(99)
    expect(result.available).toBe(99)
  })

  it('um campo `nao` derruba o score e NÃO reduz a completude', () => {
    const result = computeDigitalScore({ ...perfectAudit(), google_has_booking: 'nao' })
    expect(result.score).toBe(99)
    expect(result.completeness).toBe(100)
    expect(result.available).toBe(100)
  })
})

describe('computeDigitalScore — regras de cascata', () => {
  it("website_exists='nao': Website inteiro avaliado valendo 0 (25 pts) e PageSpeed fora do denominador", () => {
    const result = computeDigitalScore(
      audit({
        website_exists: 'nao',
        // preenchidos de propósito: a cascata força tudo a 0
        website_https: 'sim',
        website_mobile_friendly: 'sim',
        website_visual_quality: 'excelente',
        website_has_social_proof: 'sim',
        pagespeed_mobile_performance: 100,
        pagespeed_mobile_core_web_vitals: 'aprovado',
      }),
    )
    expect(section(result, 'website')).toMatchObject({ earned: 0, available: 25 })
    expect(section(result, 'pagespeed')).toMatchObject({ earned: 0, available: 0 })
  })

  it("website_exists=null: seção Website fora do denominador, PageSpeed segue a regra própria", () => {
    const result = computeDigitalScore(audit({ website_exists: null, pagespeed_mobile_performance: 100 }))
    expect(section(result, 'website')).toMatchObject({ earned: 0, available: 0 })
    expect(section(result, 'pagespeed').available).toBe(6)
    expect(section(result, 'pagespeed').earned).toBeCloseTo(6)
  })

  it("website_exists='nao_analisado' também tira a seção Website do denominador", () => {
    const result = computeDigitalScore(audit({ website_exists: 'nao_analisado', website_https: 'sim' }))
    expect(section(result, 'website')).toMatchObject({ earned: 0, available: 0 })
  })

  it("google_business_profile='nao': outros 16 pts de Google avaliados valendo 0 (seção 20/0)", () => {
    const result = computeDigitalScore(
      audit({
        google_business_profile: 'nao',
        google_rating: 5,
        google_reviews_count: 100,
        google_has_photos: 'sim',
      }),
    )
    expect(section(result, 'google')).toMatchObject({ earned: 0, available: 20 })
  })

  it("instagram_exists='nao': outros 12 pts de Instagram avaliados valendo 0 (seção 15/0)", () => {
    const result = computeDigitalScore(
      audit({
        instagram_exists: 'nao',
        instagram_has_bio_link: 'sim',
        instagram_active: 'ativo',
        instagram_visual_quality: 'excelente',
      }),
    )
    expect(section(result, 'instagram')).toMatchObject({ earned: 0, available: 15 })
  })
})

describe('computeDigitalScore — número fora do domínio válido = não avaliado, nunca 0', () => {
  it('google_rating acima de 5 → não avaliado (score null, nada no denominador)', () => {
    const result = computeDigitalScore(audit({ google_rating: 7 }))
    expect(result.score).toBeNull()
    expect(result.available).toBe(0)
  })

  it('google_rating negativo → não avaliado', () => {
    const result = computeDigitalScore(audit({ google_rating: -1 }))
    expect(result.score).toBeNull()
    expect(result.available).toBe(0)
  })

  it('lighthouse > 100 → não avaliado (não entra no denominador do PageSpeed)', () => {
    const result = computeDigitalScore(audit({ website_exists: 'sim', pagespeed_mobile_performance: 150 }))
    expect(section(result, 'pagespeed').available).toBe(0)
  })

  it('lighthouse negativo → não avaliado', () => {
    const result = computeDigitalScore(audit({ website_exists: 'sim', pagespeed_mobile_performance: -5 }))
    expect(section(result, 'pagespeed').available).toBe(0)
  })

  it('conversion_clicks_to_whatsapp negativo → não avaliado', () => {
    const result = computeDigitalScore(audit({ conversion_clicks_to_whatsapp: -1 }))
    expect(section(result, 'conversion').available).toBe(0)
  })
})

describe('computeDigitalScore — bandas de google_rating (peso 3)', () => {
  it.each([
    [4.5, 100],
    [4.49, 60],
    [4.0, 60],
    [3.99, 30],
    [3.0, 30],
    [2.99, 0],
  ])('nota %s → score %i', (rating, expected) => {
    const result = computeDigitalScore(audit({ google_rating: rating }))
    expect(result.score).toBe(expected)
    expect(section(result, 'google').available).toBe(3)
  })
})

describe('computeDigitalScore — bandas de google_reviews_count (peso 2)', () => {
  it.each([
    [50, 100],
    [49, 60],
    [20, 60],
    [19, 30],
    [5, 30],
    [4, 0],
  ])('%i avaliações → score %i', (count, expected) => {
    const result = computeDigitalScore(audit({ google_reviews_count: count }))
    expect(result.score).toBe(expected)
  })

  it('contagem negativa → não avaliado', () => {
    const result = computeDigitalScore(audit({ google_reviews_count: -1 }))
    expect(result.score).toBeNull()
    expect(section(result, 'google').available).toBe(0)
  })
})

describe('computeDigitalScore — bandas de conversion_clicks_to_whatsapp (peso 4)', () => {
  it.each([
    [0, 100],
    [1, 100],
    [2, 60],
    [3, 30],
    [4, 0],
  ])('%i cliques → score %i', (clicks, expected) => {
    const result = computeDigitalScore(audit({ conversion_clicks_to_whatsapp: clicks }))
    expect(result.score).toBe(expected)
    expect(section(result, 'conversion').available).toBe(4)
  })
})

describe('computeDigitalScore — conversões enum não-binárias', () => {
  it("triPartial 'parcialmente' vale 0.5 (conversion_clear_contact_path, peso 6)", () => {
    const result = computeDigitalScore(audit({ conversion_clear_contact_path: 'parcialmente' }))
    expect(section(result, 'conversion').earned).toBeCloseTo(3)
    expect(result.score).toBe(50)
  })

  it.each([
    ['boa' as const, 75],
    ['regular' as const, 40],
  ])("quality '%s' (instagram_visual_quality, peso 1) → score %i", (level, expected) => {
    const result = computeDigitalScore(audit({ instagram_visual_quality: level }))
    expect(result.score).toBe(expected)
  })

  it.each([
    ['algumas' as const, 50],
    ['raramente' as const, 25],
  ])("google_replies_reviews '%s' (peso 2) → score %i", (level, expected) => {
    const result = computeDigitalScore(audit({ google_replies_reviews: level }))
    expect(result.score).toBe(expected)
  })

  it.each([
    ['aceitavel' as const, 5.6],
    ['lento' as const, 5.2],
  ])("website_perceived_speed '%s' contribui parcialmente na seção Website", (level, sectionEarned) => {
    const result = computeDigitalScore(audit({ website_exists: 'sim', website_perceived_speed: level }))
    expect(section(result, 'website').earned).toBeCloseTo(sectionEarned)
    expect(section(result, 'website').available).toBe(6)
  })

  it("instagram_active 'pouco_ativo' vale 0.5 (peso 2)", () => {
    const result = computeDigitalScore(audit({ instagram_active: 'pouco_ativo' }))
    expect(result.score).toBe(50)
    expect(section(result, 'instagram').available).toBe(2)
  })

  it("core_web_vitals 'reprovado' vale 0 (fica no denominador)", () => {
    const result = computeDigitalScore(
      audit({ website_exists: 'sim', pagespeed_mobile_core_web_vitals: 'reprovado' }),
    )
    expect(section(result, 'pagespeed')).toMatchObject({ earned: 0, available: 4 })
  })

  it("core_web_vitals 'dados_insuficientes' → não avaliado (fora do denominador)", () => {
    const result = computeDigitalScore(
      audit({ website_exists: 'sim', pagespeed_mobile_core_web_vitals: 'dados_insuficientes' }),
    )
    expect(section(result, 'pagespeed').available).toBe(0)
  })
})

describe('computeDigitalScore — forma do retorno', () => {
  it('devolve as 5 seções na ordem fixa, com rótulos', () => {
    const result = computeDigitalScore(emptyAudit())
    expect(result.sections.map((s) => s.key)).toEqual([
      'google',
      'website',
      'conversion',
      'pagespeed',
      'instagram',
    ])
    for (const s of result.sections) {
      expect(s.label.length).toBeGreaterThan(0)
    }
  })
})
