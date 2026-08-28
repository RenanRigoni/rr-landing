// Normalização da resposta da API oficial do PageSpeed Insights v5 (7.10).
// Lógica **pura**: sem `fetch`, sem `next`, sem `supabase`, sem leitura de env
// (regra de dependência da ARCHITECTURE.md). Só transforma um payload externo —
// fronteira NÃO confiável — nos campos `pagespeed_*` que o dossiê já tem
// (`sales.lead_digital_audits`, migration 0012). Nenhuma coluna nova.
//
// Contrato do plano 7.10 / D-040:
//   • scores Lighthouse chegam 0–1; o banco usa 0–100 → `× 100` arredondado.
//     `0` é `0`, nunca `null` (medição é dado, D-037);
//   • métricas de LABORATÓRIO (LCP/FCP/TBT/Speed Index) em ms inteiro,
//     `audits[...].numericValue`; CLS decimal, sem unidade;
//   • **INP só existe em dado de CAMPO (CrUX)** — sem `loadingExperience`,
//     `inp` fica `null`, jamais `0` inventado;
//   • `core_web_vitals`: julgado pelos percentis de CAMPO (LCP ≤ 2500 ms,
//     INP ≤ 200 ms, CLS ≤ 0.1). Sem CrUX (ou faltando um dos três percentis)
//     → `dados_insuficientes`, NUNCA `reprovado`;
//   • `field_data_available` reflete a existência real de CrUX.
//
// A UI (`DossierSummary`, `pagespeed.ts`) é quem formata segundos/ratings —
// aqui nada é convertido para exibição.

import { isoToDatetimeLocal } from '@/lib/domain/dossier-datetime'

export type PagespeedStrategy = 'mobile' | 'desktop'

/** Status de Core Web Vitals — vocabulário do enum `sales.cwv_status`. */
export type PagespeedCwvStatus = 'aprovado' | 'reprovado' | 'dados_insuficientes'

/**
 * Os 12 campos `pagespeed_*` que UMA consulta (uma estratégia) preenche. As
 * chaves são o nome da coluna SEM o prefixo `pagespeed_mobile_` /
 * `pagespeed_desktop_` — quem prefixa é `strategyFieldsToFormValues`.
 */
export interface PagespeedStrategyFields {
  performance: number | null
  accessibility: number | null
  best_practices: number | null
  seo: number | null
  core_web_vitals: PagespeedCwvStatus
  /** ms, laboratório. */
  lcp: number | null
  /** ms, CAMPO (CrUX). `null` quando não há dado de campo — nunca `0`. */
  inp: number | null
  /** decimal, laboratório. */
  cls: number | null
  /** ms, laboratório. */
  fcp: number | null
  /** ms, laboratório. */
  tbt: number | null
  /** ms, laboratório. */
  speed_index: number | null
  /** Havia CrUX (`loadingExperience.metrics`) na resposta desta estratégia. */
  field_data_available: boolean
}

/** Resultado de uma estratégia dentro de `ConsultPagespeedResult`. */
export interface PagespeedStrategyOutcome {
  ok: boolean
  /** Presente quando `ok`. */
  fields: PagespeedStrategyFields | null
  /** Link de conveniência para `pagespeed.web.dev`. Presente quando `ok`. */
  reportUrl: string | null
  /** Mensagem tratável para a UI quando `!ok`. Sem stack, sem payload cru. */
  error: string | null
}

/**
 * O que a action `consultPagespeed` devolve ao cliente. Serializável (só
 * number/string/boolean/null). `ok: false` só quando NADA é aproveitável (URL
 * inválida ou as duas estratégias falharam) — uma estratégia sozinha falhando
 * mantém `ok: true` e vira aviso (plano 7.10: "uma pode falhar e a outra ser
 * aproveitada").
 */
export interface ConsultPagespeedResult {
  ok: boolean
  error: string | null
  analyzedUrl: string | null
  /** Instante real da consulta, ISO 8601 (`timestamptz`). `null` quando `!ok`. */
  analyzedAtIso: string | null
  mobile: PagespeedStrategyOutcome
  desktop: PagespeedStrategyOutcome
}

// ---------------------------------------------------------------------------
// Guards defensivos — a resposta do Google é fronteira não confiável.
// Nada de `as` para "fingir formato": só narrowing por predicado.
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/** `categories[key].score` (0–1) → 0–100 arredondado; ausente/não numérico → `null`. */
function categoryScore(categories: unknown, key: string): number | null {
  if (!isRecord(categories)) return null
  const category = categories[key]
  if (!isRecord(category)) return null
  const score = finiteNumber(category.score)
  return score === null ? null : Math.round(score * 100)
}

/** `audits[id].numericValue`; `round` aplica só a métrica de tempo (ms inteiro). */
function auditNumeric(audits: unknown, id: string, round: boolean): number | null {
  if (!isRecord(audits)) return null
  const audit = audits[id]
  if (!isRecord(audit)) return null
  const value = finiteNumber(audit.numericValue)
  if (value === null) return null
  return round ? Math.round(value) : value
}

/**
 * `loadingExperience.metrics[key].percentile`. Para LCP/INP vem em ms; para
 * CLS vem escalado por 100 (ex.: `8` = 0.08). `hasField` acompanha para o
 * chamador distinguir "sem CrUX" de "CrUX sem esta métrica".
 */
function fieldPercentile(metrics: Record<string, unknown> | null, key: string): number | null {
  if (metrics === null) return null
  const metric = metrics[key]
  if (!isRecord(metric)) return null
  return finiteNumber(metric.percentile)
}

/**
 * Core Web Vitals pelos percentis de CAMPO. Sem CrUX, ou faltando qualquer um
 * dos três percentis, o veredito é `dados_insuficientes` — o plano é explícito
 * em NÃO marcar `reprovado` por ausência de dado.
 */
function classifyFieldCwv(
  hasField: boolean,
  lcpMs: number | null,
  inpMs: number | null,
  clsScaled: number | null,
): PagespeedCwvStatus {
  if (!hasField) return 'dados_insuficientes'
  if (lcpMs === null || inpMs === null || clsScaled === null) return 'dados_insuficientes'
  const pass = lcpMs <= 2500 && inpMs <= 200 && clsScaled / 100 <= 0.1
  return pass ? 'aprovado' : 'reprovado'
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

/**
 * Payload cru de `runPagespeed` (uma estratégia) → os 12 campos internos dessa
 * estratégia. Nunca lança: campo ausente/ inesperado vira `null` (ou
 * `dados_insuficientes` no CWV), jamais um `TypeError`.
 */
export function parsePagespeedResponse(
  json: unknown,
  _strategy: PagespeedStrategy,
): PagespeedStrategyFields {
  const root = isRecord(json) ? json : {}
  const lighthouse = isRecord(root.lighthouseResult) ? root.lighthouseResult : {}
  const categories = lighthouse.categories
  const audits = lighthouse.audits

  const loadingExperience = isRecord(root.loadingExperience) ? root.loadingExperience : null
  const fieldMetrics =
    loadingExperience !== null && isRecord(loadingExperience.metrics)
      ? loadingExperience.metrics
      : null
  const hasField = fieldMetrics !== null && Object.keys(fieldMetrics).length > 0

  const fieldLcp = fieldPercentile(fieldMetrics, 'LARGEST_CONTENTFUL_PAINT_MS')
  const fieldInp = fieldPercentile(fieldMetrics, 'INTERACTION_TO_NEXT_PAINT')
  const fieldCls = fieldPercentile(fieldMetrics, 'CUMULATIVE_LAYOUT_SHIFT_SCORE')

  return {
    performance: categoryScore(categories, 'performance'),
    accessibility: categoryScore(categories, 'accessibility'),
    best_practices: categoryScore(categories, 'best-practices'),
    seo: categoryScore(categories, 'seo'),
    core_web_vitals: classifyFieldCwv(hasField, fieldLcp, fieldInp, fieldCls),
    lcp: auditNumeric(audits, 'largest-contentful-paint', true),
    // INP só de campo (CrUX). Sem `loadingExperience` → `null`, nunca 0.
    inp: fieldInp,
    cls: auditNumeric(audits, 'cumulative-layout-shift', false),
    fcp: auditNumeric(audits, 'first-contentful-paint', true),
    tbt: auditNumeric(audits, 'total-blocking-time', true),
    speed_index: auditNumeric(audits, 'speed-index', true),
    field_data_available: hasField,
  }
}

/**
 * Link de conveniência para o relatório visual no `pagespeed.web.dev`. NUNCA é
 * fonte de dado — só um atalho para o operador conferir. A URL analisada entra
 * `encodeURIComponent`.
 */
export function buildPagespeedReportUrl(analyzedUrl: string, strategy: PagespeedStrategy): string {
  return `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(analyzedUrl)}&form_factor=${strategy}`
}

// ---------------------------------------------------------------------------
// Montagem do patch para o formulário (mescla que PRESERVA campo não fornecido)
// ---------------------------------------------------------------------------

export type PagespeedFormPatch = Record<string, string>

/**
 * `PagespeedStrategyFields` → pares `pagespeed_<prefix>_<coluna>` = string.
 *
 * **Esparso de propósito:** só entra a chave que a consulta REALMENTE
 * produziu. Métrica que a API não trouxe (`null`) não vira chave — assim o
 * cliente faz `{ ...valoresAtuais, ...patch }` e um INP que o operador digitou
 * antes sobrevive quando o CrUX não tem INP (plano 7.10 → "preservar campo
 * quando a API realmente não forneceu valor"). `0` É uma chave (`0 !== null`).
 * `core_web_vitals` é sempre concreto (`aprovado`/`reprovado`/
 * `dados_insuficientes`), então sempre entra.
 */
export function strategyFieldsToFormValues(
  fields: PagespeedStrategyFields,
  prefix: 'pagespeed_mobile_' | 'pagespeed_desktop_',
): PagespeedFormPatch {
  const patch: PagespeedFormPatch = {}
  const put = (column: string, value: number | null): void => {
    if (value !== null) patch[`${prefix}${column}`] = String(value)
  }
  put('performance', fields.performance)
  put('accessibility', fields.accessibility)
  put('best_practices', fields.best_practices)
  put('seo', fields.seo)
  patch[`${prefix}core_web_vitals`] = fields.core_web_vitals
  put('lcp', fields.lcp)
  put('inp', fields.inp)
  put('cls', fields.cls)
  put('fcp', fields.fcp)
  put('tbt', fields.tbt)
  put('speed_index', fields.speed_index)
  return patch
}

/**
 * `ConsultPagespeedResult` (+ offset do fuso do cliente para `analyzed_at`) →
 * `{ patch, warnings }` para o `DossierForm` mesclar no state.
 *
 * - `patch` só contém chaves com VALOR NOVO concreto — nunca `''`. Mesclado por
 *   spread no cliente, não apaga nada que não veio na resposta.
 * - `pagespeed_analyzed_at`: o instante ISO da consulta é convertido para o
 *   relógio local `AAAA-MM-DDTHH:mm` que o `<input datetime-local>` do dossiê
 *   usa (contrato de fuso da 7.6 — `isoToDatetimeLocal`). Precisão de minuto,
 *   igual a qualquer edição manual desse campo.
 * - `pagespeed_field_data_available`: `sim` se QUALQUER estratégia teve CrUX,
 *   senão `nao`.
 * - Estratégia que falhou não escreve nenhum campo dela → vira `warning`.
 * - `!result.ok` (URL inválida / as duas falharam) → patch vazio; o chamador
 *   mostra `result.error`.
 */
export function assemblePagespeedPatch(
  result: ConsultPagespeedResult,
  analyzedAtOffsetMinutes: number,
): { patch: PagespeedFormPatch; warnings: string[] } {
  const patch: PagespeedFormPatch = {}
  const warnings: string[] = []

  if (!result.ok) return { patch, warnings }

  if (result.analyzedUrl !== null) {
    patch.pagespeed_analyzed_url = result.analyzedUrl
  }
  if (result.analyzedAtIso !== null) {
    const local = isoToDatetimeLocal(result.analyzedAtIso, analyzedAtOffsetMinutes)
    if (local !== '') patch.pagespeed_analyzed_at = local
  }

  let anyFieldData = false
  const strategies: { outcome: PagespeedStrategyOutcome; prefix: 'pagespeed_mobile_' | 'pagespeed_desktop_'; label: string }[] = [
    { outcome: result.mobile, prefix: 'pagespeed_mobile_', label: 'Mobile' },
    { outcome: result.desktop, prefix: 'pagespeed_desktop_', label: 'Desktop' },
  ]

  for (const { outcome, prefix, label } of strategies) {
    if (outcome.ok && outcome.fields !== null) {
      Object.assign(patch, strategyFieldsToFormValues(outcome.fields, prefix))
      if (outcome.reportUrl !== null) patch[`${prefix}report_url`] = outcome.reportUrl
      if (outcome.fields.field_data_available) anyFieldData = true
    } else if (outcome.error !== null) {
      warnings.push(`${label}: ${outcome.error}`)
    }
  }

  patch.pagespeed_field_data_available = anyFieldData ? 'sim' : 'nao'
  return { patch, warnings }
}
