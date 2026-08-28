import type { DigitalAuditFields } from '@/lib/domain/digital-score'

/**
 * Os 46 campos que entram em `computeDigitalScore`, todos "não avaliado".
 * Base do oráculo de score usado pelos testes que precisam conferir que o
 * número gravado é o do servidor (D-038) e não um valor vindo do formulário.
 *
 * Vive em `tests/helpers/` desde a 7.7, quando o segundo arquivo de teste
 * passou a precisar dele (`lead-intake.test.ts`, dossiê criado junto do lead):
 * duas cópias divergiriam na primeira vez que o score ganhasse um campo.
 */
export function emptyScoreFields(): DigitalAuditFields {
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
