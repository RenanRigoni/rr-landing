/**
 * Dossiês digitais de demonstração (Fase 7) para os leads que vieram de
 * prospecção ativa. Puro: recebe empresa + gerador aleatório determinístico e
 * devolve a linha de `sales.lead_digital_audits` sem `org_id`.
 *
 * Nota e volume de avaliações do Google e o PageSpeed ficam `null` de
 * propósito — são números verificáveis sobre empresas reais, e o PageSpeed
 * pode ser consultado ao vivo no próprio dossiê (7.10). O score e a
 * completude saem de `computeDigitalScore`, igual ao app (D-038).
 */

import { computeDigitalScore, type DigitalAuditFields } from '../../lib/domain/digital-score'
import type { Database } from '../../lib/types/database.types'
import { NICHE_GAP, NICHE_SEARCH_QUERY, type DemoCompany, type DemoNiche } from './demo-companies'
import type { Rng } from './demo-random'

type AuditInsert = Database['sales']['Tables']['lead_digital_audits']['Insert']
export type DemoAuditRow = Omit<AuditInsert, 'org_id'>

type Maturity = 'baixa' | 'media' | 'alta'
type Tri = 'sim' | 'nao' | 'parcialmente'

const MATURITY_PROBABILITY: Record<Maturity, number> = { baixa: 0.25, media: 0.55, alta: 0.85 }

const GOOGLE_CATEGORY: Record<DemoNiche, string> = {
  estetica: 'Clínica de estética',
  odonto: 'Dentista',
  moveis: 'Loja de móveis planejados',
  climatizacao: 'Serviço de ar-condicionado',
  solar: 'Fornecedor de equipamentos de energia solar',
  viagens: 'Agência de viagens',
  varejo: 'Loja',
  saude: 'Clínica',
}

export interface BuildDemoAuditInput {
  leadId: string
  company: DemoCompany
  researchedAt: Date
  rng: Rng
}

export function buildDemoAudit({ leadId, company, researchedAt, rng }: BuildDemoAuditInput): DemoAuditRow {
  const maturity = rng.weighted<Maturity>([
    ['baixa', 0.45],
    ['media', 0.4],
    ['alta', 0.15],
  ])
  const p = MATURITY_PROBABILITY[maturity]
  const tri = (probability: number): Tri => (rng.chance(Math.min(probability, 0.95)) ? 'sim' : 'nao')
  const hasSite = company.website !== null
  const quality = maturity === 'baixa' ? 'regular' : maturity === 'media' ? 'boa' : 'excelente'
  const frequency = maturity === 'baixa' ? 'raramente' : maturity === 'media' ? 'algumas' : 'frequentemente'

  const fields: DigitalAuditFields = {
    google_business_profile: rng.chance(0.9) ? 'sim' : 'nao',
    google_rating: null,
    google_reviews_count: null,
    google_recent_reviews: tri(p),
    google_replies_reviews: frequency,
    google_has_photos: tri(p + 0.3),
    google_has_hours: tri(0.85),
    google_has_phone: 'sim',
    google_has_website: hasSite ? 'sim' : 'nao',
    google_easy_whatsapp: tri(p),
    google_has_booking: tri(p * 0.4),
    website_exists: hasSite ? 'sim' : 'nao_identificado',
    website_https: hasSite ? 'sim' : null,
    website_mobile_friendly: hasSite ? (maturity === 'baixa' ? 'parcialmente' : 'sim') : null,
    website_visual_quality: hasSite ? quality : null,
    website_perceived_speed: hasSite ? (maturity === 'baixa' ? 'lento' : maturity === 'media' ? 'aceitavel' : 'rapido') : null,
    website_services_clear: hasSite ? (maturity === 'baixa' ? 'parcialmente' : 'sim') : null,
    website_has_target_service_page: hasSite ? tri(p - 0.1) : null,
    website_has_clear_cta: hasSite ? tri(p) : null,
    website_has_whatsapp: hasSite ? tri(p + 0.2) : null,
    website_has_contact_form: hasSite ? tri(0.5) : null,
    website_has_online_booking: hasSite ? tri(p * 0.3) : null,
    website_phone_visible: hasSite ? 'sim' : null,
    website_has_social_proof: hasSite ? tri(p) : null,
    conversion_clear_contact_path: maturity === 'baixa' ? 'parcialmente' : 'sim',
    conversion_clicks_to_whatsapp: maturity === 'baixa' ? rng.int(3, 5) : maturity === 'media' ? 2 : 1,
    conversion_cta_above_fold: tri(p),
    conversion_repeated_cta: tri(p - 0.1),
    conversion_alternative_capture: tri(p * 0.5),
    conversion_has_friction: maturity === 'baixa' ? 'sim' : tri(0.3),
    pagespeed_mobile_performance: null,
    pagespeed_mobile_core_web_vitals: null,
    pagespeed_mobile_seo: null,
    pagespeed_mobile_accessibility: null,
    pagespeed_mobile_best_practices: null,
    pagespeed_desktop_performance: null,
    pagespeed_desktop_core_web_vitals: null,
    instagram_exists: 'sim',
    instagram_has_bio_link: tri(p + 0.2),
    instagram_clear_bio: tri(p + 0.1),
    instagram_has_cta: tri(p),
    instagram_easy_whatsapp: tri(p + 0.1),
    instagram_easy_website: hasSite ? tri(p) : 'nao',
    instagram_active: maturity === 'baixa' ? 'pouco_ativo' : 'ativo',
    instagram_visual_quality: quality,
    instagram_services_content: tri(p + 0.1),
  }

  const score = computeDigitalScore(fields)
  const researchedDate = researchedAt.toISOString().slice(0, 10)

  return {
    ...fields,
    lead_id: leadId,
    researched_at: researchedDate,
    created_at: researchedAt.toISOString(),
    search_query: `${NICHE_SEARCH_QUERY[company.niche]} ${company.city.toLowerCase()}`,
    search_location: `${company.city} - MG`,
    found_on_google: 'sim',
    google_result_type: hasSite ? rng.pick(['organico', 'maps'] as const) : 'maps',
    google_ads_active: maturity === 'alta' ? tri(0.5) : 'nao',
    google_organic_position: hasSite ? rng.int(1, 12) : null,
    google_business_name: company.name,
    google_business_category: GOOGLE_CATEGORY[company.niche],
    google_profile_completeness: quality,
    google_notes: 'Nota e volume de avaliações não registrados neste levantamento.',
    website_url: company.website,
    website_address_visible: hasSite ? 'sim' : null,
    website_whatsapp_clickable: fields.website_has_whatsapp,
    website_whatsapp_floating: hasSite ? tri(p - 0.1) : null,
    website_has_clear_differentiators: hasSite ? tri(p) : null,
    website_has_team: hasSite ? tri(p) : null,
    website_content_updated: hasSite ? tri(p) : null,
    website_notes: hasSite ? null : 'Site não localizado na busca — confirmar com o cliente.',
    conversion_friction_notes: fields.conversion_has_friction === 'sim' ? capitalize(NICHE_GAP[company.niche]) + '.' : null,
    instagram_content_cta: frequency,
    pagespeed_notes: hasSite ? 'Não consultado ainda — usar "Consultar PageSpeed" no dossiê.' : null,
    digital_problems: problemsFor(maturity, company.niche),
    digital_strengths: strengthsFor(maturity),
    digital_opportunities: opportunitiesFor(maturity, company.niche, hasSite),
    digital_sales_priority:
      maturity === 'baixa' ? rng.pick(['muito_alta', 'alta'] as const) : maturity === 'media' ? rng.pick(['alta', 'media'] as const) : 'baixa',
    digital_opportunity_score: maturity === 'baixa' ? rng.int(8, 9) : maturity === 'media' ? rng.int(6, 7) : rng.int(3, 5),
    digital_opportunity_reason:
      maturity === 'alta'
        ? 'Presença digital madura; oportunidade pontual em automação e CRM.'
        : `Demanda existe (aparece no Google), mas a conversão trava: ${NICHE_GAP[company.niche]}.`,
    digital_score: score.score,
    digital_score_completeness: score.completeness,
  }
}

function problemsFor(maturity: Maturity, niche: DemoNiche): string {
  if (maturity === 'alta') return 'Poucos pontos de captura além do WhatsApp; sem acompanhamento de funil.'
  const base = capitalize(NICHE_GAP[niche])
  return maturity === 'baixa'
    ? `${base}. Muitos cliques até o WhatsApp e CTA fraco no mobile.`
    : `${base}. CTA não se repete ao longo da página.`
}

function strengthsFor(maturity: Maturity): string {
  if (maturity === 'baixa') return 'Perfil no Google Maps ativo e marca conhecida na cidade.'
  if (maturity === 'media') return 'Instagram ativo com bom visual; aparece bem no Maps.'
  return 'Site rápido, identidade visual forte e prova social bem trabalhada.'
}

function opportunitiesFor(maturity: Maturity, niche: DemoNiche, hasSite: boolean): string[] {
  const byNiche: Record<DemoNiche, string[]> = {
    estetica: ['agendamento', 'landing_page'],
    odonto: ['landing_page', 'seo_local'],
    moveis: ['captacao_leads', 'crm'],
    climatizacao: ['whatsapp', 'agendamento'],
    solar: ['captacao_leads', 'crm'],
    viagens: ['website', 'automacao'],
    varejo: ['website', 'conversao'],
    saude: ['agendamento', 'automacao'],
  }
  const list = [...byNiche[niche]]
  if (!hasSite && !list.includes('website')) list.push('website')
  if (maturity === 'baixa') list.push('conversao', 'google_business')
  if (maturity === 'alta') return ['crm', 'analytics']
  return [...new Set(list)]
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
