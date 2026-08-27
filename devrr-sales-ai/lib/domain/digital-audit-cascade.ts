// Cascatas de dependência do dossiê digital: quais campos deixam de fazer
// sentido quando a base de uma seção é `nao`. Lógica pura — zero import de
// supabase/next/database.types (regra de dependência da ARCHITECTURE.md).
//
// Fonte única de duas coisas que precisam concordar (7.4, revisão corretiva):
//
//   1. `lib/validation/digital-audit.ts` (7.3) usa as listas para REJEITAR um
//      request que afirme "não existe" e ao mesmo tempo mande campo interno
//      afirmativo;
//   2. `lib/actions/digital-audit-core.ts` usa `resolveClearedFields` para
//      LIMPAR o estado final antes de gravar — o Zod só enxerga o request, e
//      um update parcial que muda só `website_exists` para `nao` deixaria os
//      `website_*`/PageSpeed antigos no banco, produzindo um dossiê
//      estruturalmente contraditório.
//
// O mesmo conjunto limpo alimenta a gravação E o cálculo do score, para que
// `digital_score`/`digital_score_completeness` descrevam exatamente a linha
// persistida.
//
// O que NÃO é limpo, de propósito:
//   • notas em texto livre (`website_notes`, `instagram_notes`,
//     `pagespeed_notes`, `google_notes`) — têm valor documental e costumam
//     ser justamente onde se registra "procurei e não existe";
//   • `instagram_username`, `google_business_name`, `google_business_category`
//     — identificam o que foi procurado, não afirmam que o perfil existe;
//   • tudo que descreve a BUSCA no Google (`found_on_google`,
//     `google_result_type`, `google_ads_*`, `google_organic_position`,
//     `google_search_result_url`) — a empresa pode aparecer em busca ou
//     anúncio sem ter Google Business Profile.

/** Campos do site que não fazem sentido quando não existe site. */
export const WEBSITE_DEPENDENT_FIELDS = [
  'website_url',
  'website_https',
  'website_mobile_friendly',
  'website_visual_quality',
  'website_perceived_speed',
  'website_services_clear',
  'website_has_target_service_page',
  'website_target_service_url',
  'website_has_clear_cta',
  'website_has_whatsapp',
  'website_whatsapp_clickable',
  'website_whatsapp_floating',
  'website_has_contact_form',
  'website_has_online_booking',
  'website_phone_visible',
  'website_address_visible',
  'website_has_social_proof',
  'website_has_clear_differentiators',
  'website_has_team',
  'website_content_updated',
] as const

/**
 * PageSpeed mede um site. Sem site, toda medição guardada descreve algo que a
 * própria auditoria afirma não existir — inclusive os metadados da análise.
 * Só limpo pela cascata de `website_exists`, nunca por conta própria.
 */
export const PAGESPEED_DEPENDENT_FIELDS = [
  'pagespeed_mobile_performance',
  'pagespeed_mobile_accessibility',
  'pagespeed_mobile_best_practices',
  'pagespeed_mobile_seo',
  'pagespeed_mobile_core_web_vitals',
  'pagespeed_mobile_lcp',
  'pagespeed_mobile_inp',
  'pagespeed_mobile_cls',
  'pagespeed_mobile_fcp',
  'pagespeed_mobile_tbt',
  'pagespeed_mobile_speed_index',
  'pagespeed_desktop_performance',
  'pagespeed_desktop_accessibility',
  'pagespeed_desktop_best_practices',
  'pagespeed_desktop_seo',
  'pagespeed_desktop_core_web_vitals',
  'pagespeed_desktop_lcp',
  'pagespeed_desktop_inp',
  'pagespeed_desktop_cls',
  'pagespeed_desktop_fcp',
  'pagespeed_desktop_tbt',
  'pagespeed_desktop_speed_index',
  'pagespeed_analyzed_url',
  'pagespeed_analyzed_at',
  'pagespeed_mobile_report_url',
  'pagespeed_desktop_report_url',
  'pagespeed_field_data_available',
] as const

/** Campos do perfil do Instagram que não fazem sentido sem perfil. */
export const INSTAGRAM_DEPENDENT_FIELDS = [
  'instagram_url',
  'instagram_has_bio_link',
  'instagram_clear_bio',
  'instagram_has_cta',
  'instagram_easy_whatsapp',
  'instagram_easy_website',
  'instagram_active',
  'instagram_last_post_date',
  'instagram_visual_quality',
  'instagram_services_content',
  'instagram_content_cta',
] as const

/**
 * Atributos do próprio Google Business Profile. A lista é deliberadamente
 * estreita: nada aqui descreve a busca no Google, só o perfil.
 */
export const GOOGLE_PROFILE_DEPENDENT_FIELDS = [
  'google_rating',
  'google_reviews_count',
  'google_recent_reviews',
  'google_replies_reviews',
  'google_has_photos',
  'google_has_hours',
  'google_has_phone',
  'google_has_website',
  'google_easy_whatsapp',
  'google_has_booking',
  'google_profile_completeness',
] as const

export type DigitalAuditDependentField =
  | (typeof WEBSITE_DEPENDENT_FIELDS)[number]
  | (typeof PAGESPEED_DEPENDENT_FIELDS)[number]
  | (typeof INSTAGRAM_DEPENDENT_FIELDS)[number]
  | (typeof GOOGLE_PROFILE_DEPENDENT_FIELDS)[number]

/** As três bases de seção que disparam cascata quando valem `nao`. */
export interface DigitalAuditCascadeBases {
  website_exists?: string | null
  instagram_exists?: string | null
  google_business_profile?: string | null
}

/**
 * Campos que precisam ir a `null` no estado final, dado o valor das bases.
 *
 * Só `nao` dispara: `null`, ausente e `nao_analisado`/`nao_identificado`/
 * `nao_se_aplica` significam "não avaliado" (D-037) e nunca podem apagar
 * pesquisa já feita — salvar parcial é o caminho normal (regra 6 da Fase 7).
 */
export function resolveClearedFields(bases: DigitalAuditCascadeBases): DigitalAuditDependentField[] {
  const cleared: DigitalAuditDependentField[] = []

  if (bases.website_exists === 'nao') {
    cleared.push(...WEBSITE_DEPENDENT_FIELDS, ...PAGESPEED_DEPENDENT_FIELDS)
  }
  if (bases.instagram_exists === 'nao') {
    cleared.push(...INSTAGRAM_DEPENDENT_FIELDS)
  }
  if (bases.google_business_profile === 'nao') {
    cleared.push(...GOOGLE_PROFILE_DEPENDENT_FIELDS)
  }

  return cleared
}
