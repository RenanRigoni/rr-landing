// Score digital derivado (0–100) + completude. Lógica pura: zero import de
// supabase/next/database.types (regra de dependência da ARCHITECTURE.md). O
// domínio declara a própria interface de entrada — a `Row` de
// `sales.lead_digital_audits` a satisfaz estruturalmente, mas não é importada.
//
// Contrato e tabela de pesos: docs/IMPLEMENTATION_PLAN.md → 7.2. Total = 100
// pontos, então a completude é literalmente "quantos pontos foram avaliáveis".
//
// D-037 — as duas classes que a completude separa:
//   • NÃO AVALIADO: `null`, `nao_analisado`/`nao_identificado`/`nao_se_aplica`,
//     ou número fora do domínio válido. Sai do numerador E do denominador.
//   • AVALIADO E AUSENTE: `nao`. Entra no denominador com o peso, vale 0 no
//     numerador — derruba o score, não a completude.
// D-038 — `digital_score`/`digital_score_completeness` nunca vêm do
//   formulário; são exatamente o que esta função devolve.

// Vocabulários do dossiê (D-036) redeclarados aqui como uniões de literais —
// o domínio não importa `database.types.ts`. A `Row` do banco satisfaz estes
// tipos estruturalmente.
type TriState =
  | 'sim'
  | 'nao'
  | 'parcialmente'
  | 'nao_identificado'
  | 'nao_analisado'
  | 'nao_se_aplica'
type QualityLevel = 'excelente' | 'boa' | 'regular' | 'ruim' | 'nao_analisado'
type FrequencyLevel = 'frequentemente' | 'algumas' | 'raramente' | 'nao' | 'nao_analisado'
type SpeedLevel = 'rapido' | 'aceitavel' | 'lento' | 'muito_lento' | 'nao_analisado'
type ActivityLevel = 'ativo' | 'pouco_ativo' | 'inativo' | 'nao_analisado'
type CwvStatus = 'aprovado' | 'reprovado' | 'dados_insuficientes' | 'nao_analisado'

/**
 * Subconjunto de `sales.lead_digital_audits` que entra no score. Todo campo é
 * `... | null`; a `Row` gerada satisfaz esta interface estruturalmente.
 */
export interface DigitalAuditFields {
  // Google / Google Business
  google_business_profile: TriState | null
  google_rating: number | null
  google_reviews_count: number | null
  google_recent_reviews: TriState | null
  google_replies_reviews: FrequencyLevel | null
  google_has_photos: TriState | null
  google_has_hours: TriState | null
  google_has_phone: TriState | null
  google_has_website: TriState | null
  google_easy_whatsapp: TriState | null
  google_has_booking: TriState | null
  // Website
  website_exists: TriState | null
  website_https: TriState | null
  website_mobile_friendly: TriState | null
  website_visual_quality: QualityLevel | null
  website_perceived_speed: SpeedLevel | null
  website_services_clear: TriState | null
  website_has_target_service_page: TriState | null
  website_has_clear_cta: TriState | null
  website_has_whatsapp: TriState | null
  website_has_contact_form: TriState | null
  website_has_online_booking: TriState | null
  website_phone_visible: TriState | null
  website_has_social_proof: TriState | null
  // Conversão
  conversion_clear_contact_path: TriState | null
  conversion_clicks_to_whatsapp: number | null
  conversion_cta_above_fold: TriState | null
  conversion_repeated_cta: TriState | null
  conversion_alternative_capture: TriState | null
  conversion_has_friction: TriState | null
  // PageSpeed
  pagespeed_mobile_performance: number | null
  pagespeed_mobile_core_web_vitals: CwvStatus | null
  pagespeed_mobile_seo: number | null
  pagespeed_mobile_accessibility: number | null
  pagespeed_mobile_best_practices: number | null
  pagespeed_desktop_performance: number | null
  pagespeed_desktop_core_web_vitals: CwvStatus | null
  // Instagram
  instagram_exists: TriState | null
  instagram_has_bio_link: TriState | null
  instagram_clear_bio: TriState | null
  instagram_has_cta: TriState | null
  instagram_easy_whatsapp: TriState | null
  instagram_easy_website: TriState | null
  instagram_active: ActivityLevel | null
  instagram_visual_quality: QualityLevel | null
  instagram_services_content: TriState | null
}

export interface DigitalScoreSection {
  key: 'google' | 'website' | 'conversion' | 'pagespeed' | 'instagram'
  label: string
  earned: number
  available: number
}

export interface DigitalScoreResult {
  /** `round(100 * earned / available)`; `null` quando nada foi avaliável. */
  score: number | null
  /** `round(available)` — o total é 100 por construção. */
  completeness: number
  earned: number
  available: number
  sections: DigitalScoreSection[]
}

// --- Conversores: valor do campo → fator em [0,1], ou `null` = não avaliado ---

/** sim=1 · nao=0 · resto (inclui nulo, nao_analisado, parcialmente) = não avaliado. */
function triBinary(v: TriState | null): number | null {
  if (v === 'sim') return 1
  if (v === 'nao') return 0
  return null
}

/** sim=1 · parcialmente=0.5 · nao=0 · resto = não avaliado. */
function triPartial(v: TriState | null): number | null {
  if (v === 'sim') return 1
  if (v === 'parcialmente') return 0.5
  if (v === 'nao') return 0
  return null
}

/** Invertido: nao=1 · sim=0 · resto = não avaliado. */
function triInverted(v: TriState | null): number | null {
  if (v === 'nao') return 1
  if (v === 'sim') return 0
  return null
}

/** excelente=1 · boa=0.75 · regular=0.4 · ruim=0 · resto = não avaliado. */
function quality(v: QualityLevel | null): number | null {
  if (v === 'excelente') return 1
  if (v === 'boa') return 0.75
  if (v === 'regular') return 0.4
  if (v === 'ruim') return 0
  return null
}

/** frequentemente=1 · algumas=0.5 · raramente=0.25 · nao=0 · resto = não avaliado. */
function repliesFrequency(v: FrequencyLevel | null): number | null {
  if (v === 'frequentemente') return 1
  if (v === 'algumas') return 0.5
  if (v === 'raramente') return 0.25
  if (v === 'nao') return 0
  return null
}

/** rapido=1 · aceitavel=0.6 · lento=0.2 · muito_lento=0 · resto = não avaliado. */
function perceivedSpeed(v: SpeedLevel | null): number | null {
  if (v === 'rapido') return 1
  if (v === 'aceitavel') return 0.6
  if (v === 'lento') return 0.2
  if (v === 'muito_lento') return 0
  return null
}

/** ativo=1 · pouco_ativo=0.5 · inativo=0 · resto = não avaliado. */
function activityLevel(v: ActivityLevel | null): number | null {
  if (v === 'ativo') return 1
  if (v === 'pouco_ativo') return 0.5
  if (v === 'inativo') return 0
  return null
}

/**
 * Nota do Google: >=4.5 = 1 · 4.0–4.49 = 0.6 · 3.0–3.99 = 0.3 · <3 = 0.
 * Fora do domínio 0–5 (CHECK/Zod já barram antes) = não avaliado, nunca 0.
 */
function googleRating(v: number | null): number | null {
  if (v === null) return null
  if (v < 0 || v > 5) return null
  if (v >= 4.5) return 1
  if (v >= 4.0) return 0.6
  if (v >= 3.0) return 0.3
  return 0
}

/**
 * Volume de avaliações: >=50 = 1 · 20–49 = 0.6 · 5–19 = 0.3 · <5 = 0.
 * Negativo (fora do domínio) = não avaliado.
 */
function reviewsCount(v: number | null): number | null {
  if (v === null) return null
  if (v < 0) return null
  if (v >= 50) return 1
  if (v >= 20) return 0.6
  if (v >= 5) return 0.3
  return 0
}

/**
 * Cliques até o WhatsApp: <=1 = 1 · 2 = 0.6 · 3 = 0.3 · >=4 = 0.
 * Negativo (fora do domínio) = não avaliado.
 */
function clicksToWhatsapp(v: number | null): number | null {
  if (v === null) return null
  if (v < 0) return null
  if (v <= 1) return 1
  if (v <= 2) return 0.6
  if (v <= 3) return 0.3
  return 0
}

/** Score Lighthouse: valor/100. Fora de 0–100 = não avaliado, nunca 0. */
function lighthouse(v: number | null): number | null {
  if (v === null) return null
  if (v < 0 || v > 100) return null
  return v / 100
}

/** Core Web Vitals: aprovado=1 · reprovado=0 · dados_insuficientes/resto = não avaliado. */
function cwv(v: CwvStatus | null): number | null {
  if (v === 'aprovado') return 1
  if (v === 'reprovado') return 0
  return null
}

// --- Montagem das seções ---

interface ScoreItem {
  weight: number
  factor: number | null
}

/**
 * Cascata de base (regras da 7.2): quando o campo-base da seção é `nao`, todos
 * os outros itens contam como **avaliados valendo 0** (lacuna real medida, não
 * lacuna de pesquisa). O item-base fica na posição 0 e é preservado (o próprio
 * `triBinary('nao')` já dá 0).
 */
function applyBaseNaoCascade(items: ScoreItem[], base: TriState | null): ScoreItem[] {
  if (base !== 'nao') return items
  return items.map((item, i) => (i === 0 ? item : { weight: item.weight, factor: 0 }))
}

function sumSection(
  key: DigitalScoreSection['key'],
  label: string,
  items: ScoreItem[],
): DigitalScoreSection {
  let earned = 0
  let available = 0
  for (const item of items) {
    if (item.factor === null) continue
    available += item.weight
    earned += item.weight * item.factor
  }
  return { key, label, earned, available }
}

function buildPagespeedItems(a: DigitalAuditFields): ScoreItem[] {
  return [
    { weight: 6, factor: lighthouse(a.pagespeed_mobile_performance) },
    { weight: 4, factor: cwv(a.pagespeed_mobile_core_web_vitals) },
    { weight: 2, factor: lighthouse(a.pagespeed_mobile_seo) },
    { weight: 2, factor: lighthouse(a.pagespeed_mobile_accessibility) },
    { weight: 1, factor: lighthouse(a.pagespeed_mobile_best_practices) },
    { weight: 3, factor: lighthouse(a.pagespeed_desktop_performance) },
    { weight: 2, factor: cwv(a.pagespeed_desktop_core_web_vitals) },
  ]
}

/**
 * Score digital derivado. Ver a tabela de pesos e as regras de cascata em
 * docs/IMPLEMENTATION_PLAN.md → 7.2.
 */
export function computeDigitalScore(audit: DigitalAuditFields): DigitalScoreResult {
  const googleItems = applyBaseNaoCascade(
    [
      { weight: 4, factor: triBinary(audit.google_business_profile) },
      { weight: 3, factor: googleRating(audit.google_rating) },
      { weight: 2, factor: reviewsCount(audit.google_reviews_count) },
      { weight: 2, factor: triBinary(audit.google_recent_reviews) },
      { weight: 2, factor: repliesFrequency(audit.google_replies_reviews) },
      { weight: 1, factor: triBinary(audit.google_has_photos) },
      { weight: 1, factor: triBinary(audit.google_has_hours) },
      { weight: 1, factor: triBinary(audit.google_has_phone) },
      { weight: 1, factor: triBinary(audit.google_has_website) },
      { weight: 2, factor: triBinary(audit.google_easy_whatsapp) },
      { weight: 1, factor: triBinary(audit.google_has_booking) },
    ],
    audit.google_business_profile,
  )

  const websiteItemsAll: ScoreItem[] = [
    { weight: 5, factor: triBinary(audit.website_exists) },
    { weight: 1, factor: triBinary(audit.website_https) },
    { weight: 3, factor: triPartial(audit.website_mobile_friendly) },
    { weight: 2, factor: quality(audit.website_visual_quality) },
    { weight: 1, factor: perceivedSpeed(audit.website_perceived_speed) },
    { weight: 2, factor: triPartial(audit.website_services_clear) },
    { weight: 2, factor: triBinary(audit.website_has_target_service_page) },
    { weight: 2, factor: triBinary(audit.website_has_clear_cta) },
    { weight: 2, factor: triBinary(audit.website_has_whatsapp) },
    { weight: 1, factor: triBinary(audit.website_has_contact_form) },
    { weight: 1, factor: triBinary(audit.website_has_online_booking) },
    { weight: 1, factor: triBinary(audit.website_phone_visible) },
    { weight: 2, factor: triBinary(audit.website_has_social_proof) },
  ]

  // Cascata de Website + acoplamento com PageSpeed (regras da 7.2):
  //   website_exists = 'nao'          → outros 20 pts de Website avaliados = 0
  //                                     E seção PageSpeed inteira fora do denominador
  //   website_exists nulo/nao_analisado → seção Website inteira fora do denominador
  //                                       (PageSpeed segue a regra própria)
  //   website_exists = 'sim'         → tudo normal
  let websiteItems: ScoreItem[]
  let pagespeedItems: ScoreItem[]
  if (audit.website_exists === 'nao') {
    websiteItems = websiteItemsAll.map((item, i) =>
      i === 0 ? item : { weight: item.weight, factor: 0 },
    )
    pagespeedItems = []
  } else if (triBinary(audit.website_exists) === null) {
    websiteItems = []
    pagespeedItems = buildPagespeedItems(audit)
  } else {
    websiteItems = websiteItemsAll
    pagespeedItems = buildPagespeedItems(audit)
  }

  const conversionItems: ScoreItem[] = [
    { weight: 6, factor: triPartial(audit.conversion_clear_contact_path) },
    { weight: 4, factor: clicksToWhatsapp(audit.conversion_clicks_to_whatsapp) },
    { weight: 4, factor: triBinary(audit.conversion_cta_above_fold) },
    { weight: 2, factor: triBinary(audit.conversion_repeated_cta) },
    { weight: 2, factor: triBinary(audit.conversion_alternative_capture) },
    { weight: 2, factor: triInverted(audit.conversion_has_friction) },
  ]

  const instagramItems = applyBaseNaoCascade(
    [
      { weight: 3, factor: triBinary(audit.instagram_exists) },
      { weight: 1, factor: triBinary(audit.instagram_has_bio_link) },
      { weight: 2, factor: triPartial(audit.instagram_clear_bio) },
      { weight: 2, factor: triBinary(audit.instagram_has_cta) },
      { weight: 2, factor: triBinary(audit.instagram_easy_whatsapp) },
      { weight: 1, factor: triBinary(audit.instagram_easy_website) },
      { weight: 2, factor: activityLevel(audit.instagram_active) },
      { weight: 1, factor: quality(audit.instagram_visual_quality) },
      { weight: 1, factor: triPartial(audit.instagram_services_content) },
    ],
    audit.instagram_exists,
  )

  const sections: DigitalScoreSection[] = [
    sumSection('google', 'Google / Google Business', googleItems),
    sumSection('website', 'Website', websiteItems),
    sumSection('conversion', 'Conversão', conversionItems),
    sumSection('pagespeed', 'PageSpeed', pagespeedItems),
    sumSection('instagram', 'Instagram', instagramItems),
  ]

  let earned = 0
  let available = 0
  for (const section of sections) {
    earned += section.earned
    available += section.available
  }

  const score = available === 0 ? null : Math.round((100 * earned) / available)
  const completeness = Math.round(available)

  return { score, completeness, earned, available, sections }
}
