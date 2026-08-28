// Rótulos em português do dossiê digital (7.6). Fonte ÚNICA para UI, Markdown
// (7.8) e cabeçalho do CSV (7.8) — nenhum rótulo é escrito à mão dentro de um
// componente. Lógica pura: zero import de supabase/next/database.types
// (regra de dependência da ARCHITECTURE.md) e zero função (só dados) para não
// abrir superfície de cobertura em `lib/domain/` (test:coverage exige 100%).
//
// D-036 — os 8 vocabulários compartilhados do dossiê. As chaves de cada mapa
// são exatamente os valores dos enums do Postgres (migration 0012 /
// `database.types.ts` → `sales.Enums`). Um valor novo no banco exige um rótulo
// novo aqui — o teste `tests/domain/digital-labels.test.ts` trava se divergir.
//
// D-037 — o estado "não avaliado" (`null` / campo em branco) é representado na
// UI pela opção vazia rotulada `NOT_ANALYZED_LABEL`; os selects nunca repetem
// `nao_analisado` como opção própria (a opção vazia já cobre esse significado).

import type { PagespeedRating } from '@/lib/domain/pagespeed'

/** Rótulo da opção vazia de todo select nullable do dossiê (= `null` no banco). */
export const NOT_ANALYZED_LABEL = 'Não analisado'

export const ENUM_LABELS = {
  tri_state: {
    sim: 'Sim',
    nao: 'Não',
    parcialmente: 'Parcialmente',
    nao_identificado: 'Não identificado',
    nao_analisado: 'Não analisado',
    nao_se_aplica: 'Não se aplica',
  },
  quality_level: {
    excelente: 'Excelente',
    boa: 'Boa',
    regular: 'Regular',
    ruim: 'Ruim',
    nao_analisado: 'Não analisado',
  },
  frequency_level: {
    frequentemente: 'Frequentemente',
    algumas: 'Algumas vezes',
    raramente: 'Raramente',
    nao: 'Não',
    nao_analisado: 'Não analisado',
  },
  speed_level: {
    rapido: 'Rápido',
    aceitavel: 'Aceitável',
    lento: 'Lento',
    muito_lento: 'Muito lento',
    nao_analisado: 'Não analisado',
  },
  activity_level: {
    ativo: 'Ativo',
    pouco_ativo: 'Pouco ativo',
    inativo: 'Inativo',
    nao_analisado: 'Não analisado',
  },
  cwv_status: {
    aprovado: 'Aprovado',
    reprovado: 'Reprovado',
    dados_insuficientes: 'Dados insuficientes',
    nao_analisado: 'Não analisado',
  },
  google_result_type: {
    organico: 'Orgânico',
    patrocinado: 'Patrocinado',
    maps: 'Google Maps',
    outro: 'Outro',
    nao_identificado: 'Não identificado',
  },
  sales_priority: {
    muito_alta: 'Muito alta',
    alta: 'Alta',
    media: 'Média',
    baixa: 'Baixa',
    nao_avaliada: 'Ainda não avaliada',
  },
} as const

export type DossierEnumGroup = keyof typeof ENUM_LABELS

/**
 * Vocabulário fechado de `digital_opportunities` (DOSSIE §9). `value` é o valor
 * canônico aceito por `digitalAuditSchema` / CHECK do banco — NÃO renomear sem
 * migration. `label` é livre para ficar amigável.
 */
export const DIGITAL_OPPORTUNITY_OPTIONS = [
  { value: 'google_business', label: 'Google Business Profile' },
  { value: 'google_reputation', label: 'Gestão/reputação Google' },
  { value: 'website', label: 'Website' },
  { value: 'landing_page', label: 'Landing Page' },
  { value: 'seo_local', label: 'SEO local' },
  { value: 'performance', label: 'Performance do site' },
  { value: 'ux_mobile', label: 'UX/mobile' },
  { value: 'conversao', label: 'Conversão' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'automacao', label: 'Automação' },
  { value: 'agendamento', label: 'Agendamento' },
  { value: 'captacao_leads', label: 'Captação de leads' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'crm', label: 'CRM' },
  { value: 'analytics', label: 'Analytics/Mensuração' },
  { value: 'outro', label: 'Outro' },
] as const

/** Classificação visual das métricas de PageSpeed (DOSSIE §8) → texto. A cor
 * é responsabilidade do componente; aqui só o rótulo (cor nunca é sinal
 * único — DESIGN_SYSTEM.md → Acessibilidade). */
export const PAGESPEED_RATING_LABELS: Record<PagespeedRating, string> = {
  bom: 'bom',
  precisa_melhorar: 'precisa melhorar',
  ruim: 'ruim',
}

/**
 * Rótulo de cada campo de `sales.lead_digital_audits` que o formulário do
 * dossiê renderiza (7.6). `lead_id` fica de fora de propósito: é o vínculo
 * imutável, campo oculto do formulário, não um campo editável. `digital_score`
 * e `digital_score_completeness` também ficam de fora — são derivados no
 * servidor (D-038), aparecem só em leitura no resumo.
 *
 * O teste cruza este mapa com `digitalAuditSchema` campo a campo: sobra ou
 * falta quebram a suíte.
 */
export const FIELD_LABELS: Record<string, string> = {
  researched_at: 'Data da pesquisa',

  // Origem da prospecção (DOSSIE §2)
  search_query: 'Pesquisa realizada',
  search_location: 'Cidade/região pesquisada',
  found_on_google: 'Encontrado no Google?',
  google_result_type: 'Tipo de resultado',
  google_ads_active: 'Está anunciando?',
  google_ads_position: 'Posição patrocinada',
  google_organic_position: 'Posição orgânica',
  google_search_result_url: 'URL usada para encontrar a empresa',

  // Google Business Profile / Maps (DOSSIE §3)
  google_business_profile: 'Possui Perfil da Empresa no Google?',
  google_business_name: 'Nome exibido no Google',
  google_business_category: 'Categoria principal',
  google_rating: 'Nota Google',
  google_reviews_count: 'Quantidade de avaliações',
  google_recent_reviews: 'Possui avaliações recentes?',
  google_replies_reviews: 'Empresa responde avaliações?',
  google_has_photos: 'Possui fotos?',
  google_has_hours: 'Horário informado?',
  google_has_phone: 'Telefone disponível no Google?',
  google_has_website: 'Website disponível no Google?',
  google_easy_whatsapp: 'WhatsApp fácil pelo Google?',
  google_has_booking: 'Agendamento disponível?',
  google_profile_completeness: 'Perfil parece completo?',
  google_notes: 'Observações sobre Google',

  // Website (DOSSIE §4)
  website_exists: 'Possui site?',
  website_url: 'URL',
  website_https: 'HTTPS funcionando?',
  website_mobile_friendly: 'Site funciona bem no celular?',
  website_visual_quality: 'Aparência profissional?',
  website_perceived_speed: 'Carregamento percebido',
  website_services_clear: 'Serviços fáceis de encontrar?',
  website_has_target_service_page: 'Possui página do serviço pesquisado?',
  website_target_service_url: 'URL da página do serviço',
  website_has_clear_cta: 'CTA claro?',
  website_has_whatsapp: 'WhatsApp visível?',
  website_whatsapp_clickable: 'WhatsApp clicável?',
  website_whatsapp_floating: 'Botão flutuante de WhatsApp?',
  website_has_contact_form: 'Formulário de contato?',
  website_has_online_booking: 'Agendamento online?',
  website_phone_visible: 'Telefone fácil de localizar?',
  website_address_visible: 'Endereço fácil de localizar?',
  website_has_social_proof: 'Possui prova social?',
  website_has_clear_differentiators: 'Possui diferenciais claros?',
  website_has_team: 'Apresenta a equipe/profissionais?',
  website_content_updated: 'Possui conteúdo atualizado?',
  website_notes: 'Observações do site',

  // Conversão digital (DOSSIE §5)
  conversion_clear_contact_path: 'Existe caminho evidente até contato?',
  conversion_clicks_to_whatsapp: 'Cliques aproximados até WhatsApp',
  conversion_cta_above_fold: 'Existe CTA acima da dobra?',
  conversion_repeated_cta: 'CTA aparece em diferentes partes do site?',
  conversion_alternative_capture: 'Existe captura alternativa ao WhatsApp?',
  conversion_has_friction: 'Jornada parece gerar fricção?',
  conversion_friction_notes: 'Principais fricções encontradas',

  // Instagram (DOSSIE §6)
  instagram_exists: 'Possui Instagram?',
  instagram_username: 'Usuário',
  instagram_url: 'URL',
  instagram_has_bio_link: 'Link na bio?',
  instagram_clear_bio: 'Bio explica claramente o negócio?',
  instagram_has_cta: 'Possui CTA na bio?',
  instagram_easy_whatsapp: 'WhatsApp fácil de acessar?',
  instagram_easy_website: 'Site fácil de acessar?',
  instagram_active: 'Perfil está ativo?',
  instagram_last_post_date: 'Data aproximada da última publicação',
  instagram_visual_quality: 'Qualidade visual',
  instagram_services_content: 'Conteúdo demonstra serviços?',
  instagram_content_cta: 'Conteúdo possui CTA?',
  instagram_notes: 'Observações Instagram',

  // PageSpeed mobile (DOSSIE §7)
  pagespeed_mobile_performance: 'Performance (mobile)',
  pagespeed_mobile_accessibility: 'Accessibility (mobile)',
  pagespeed_mobile_best_practices: 'Best Practices (mobile)',
  pagespeed_mobile_seo: 'SEO (mobile)',
  pagespeed_mobile_core_web_vitals: 'Core Web Vitals (mobile)',
  pagespeed_mobile_lcp: 'LCP (mobile)',
  pagespeed_mobile_inp: 'INP (mobile)',
  pagespeed_mobile_cls: 'CLS (mobile)',
  pagespeed_mobile_fcp: 'FCP (mobile)',
  pagespeed_mobile_tbt: 'TBT (mobile)',
  pagespeed_mobile_speed_index: 'Speed Index (mobile)',

  // PageSpeed desktop
  pagespeed_desktop_performance: 'Performance (desktop)',
  pagespeed_desktop_accessibility: 'Accessibility (desktop)',
  pagespeed_desktop_best_practices: 'Best Practices (desktop)',
  pagespeed_desktop_seo: 'SEO (desktop)',
  pagespeed_desktop_core_web_vitals: 'Core Web Vitals (desktop)',
  pagespeed_desktop_lcp: 'LCP (desktop)',
  pagespeed_desktop_inp: 'INP (desktop)',
  pagespeed_desktop_cls: 'CLS (desktop)',
  pagespeed_desktop_fcp: 'FCP (desktop)',
  pagespeed_desktop_tbt: 'TBT (desktop)',
  pagespeed_desktop_speed_index: 'Speed Index (desktop)',

  // PageSpeed — informações gerais
  pagespeed_analyzed_url: 'URL analisada',
  pagespeed_analyzed_at: 'Data/hora da análise',
  pagespeed_mobile_report_url: 'Link do relatório Mobile',
  pagespeed_desktop_report_url: 'Link do relatório Desktop',
  pagespeed_field_data_available: 'Dados de campo disponíveis?',
  pagespeed_notes: 'Observações PageSpeed',

  // Diagnóstico digital (DOSSIE §9)
  digital_problems: 'Principais problemas digitais encontrados',
  digital_strengths: 'Principais pontos positivos',
  digital_opportunities: 'Oportunidades identificadas',
  digital_sales_priority: 'Prioridade comercial percebida',
  digital_opportunity_score: 'Potencial de melhoria digital (0–10)',
  digital_opportunity_reason: 'Justificativa do potencial',
}
