// Estado inicial do formulário do dossiê a partir de uma auditoria existente
// (revisão corretiva da 7.6). Puro, sem React nem server imports — testável em
// `environment: 'node'`. O `DossierForm.tsx` só chama estas funções.
//
// Invariante que este arquivo garante: **abrir uma auditoria e salvar sem
// mexer em nada não pode alterar valor nenhum.** Em especial, um valor de enum
// válido já persistido (`nao_analisado`, `nao_identificado`, `nao_se_aplica`,
// `parcialmente`, `raramente`, `dados_insuficientes`, …) precisa fazer
// round-trip — nunca é colapsado para `''`/`null` sem ação do usuário. Quem
// garante que o `<select>` consegue reenviar esse valor é o `SelectField`, que
// injeta uma opção para qualquer valor fora do vocabulário curado.

import { ALL_DOSSIER_FIELDS, type DossierFieldName, type DossierSectionSpec } from './sections'
import { isoToDatetimeLocal } from '@/lib/domain/dossier-datetime'
import type { DigitalAudit } from '@/lib/queries/digital-audits-core'

type AuditLike = Partial<Record<DossierFieldName, unknown>> | null | undefined

/**
 * `values` do formulário (todos strings) a partir da auditoria — ou tudo
 * vazio, na criação.
 *
 * - `date`: `AAAA-MM-DD` verbatim (`slice` só por segurança).
 * - `datetime` (`pagespeed_analyzed_at`): ISO → local `AAAA-MM-DDTHH:mm` com o
 *   offset explícito do usuário (o submit reconverte para instante — ver
 *   `resolvePagespeedAnalyzedAt`).
 * - `select`: valor persistido **verbatim**. `null`/não-string → `''`. NUNCA
 *   colapsa `nao_analisado` & cia. para `''`.
 * - `number`: `String(n)`; `null`/`undefined` → `''` (nunca `'0'` por engano).
 * - texto/URL/textarea: string verbatim; `null` → `''`.
 */
export function buildInitialValues(
  audit: DigitalAudit | AuditLike,
  // Offset (min) para renderizar `pagespeed_analyzed_at` (o ISO original) como
  // relógio local — deve ser o offset da PRÓPRIA data do timestamp, não o de
  // "agora", para não deslocar por DST.
  analyzedAtOffsetMinutes: number,
  todayCalendarDate: string,
): Record<string, string> {
  const row: Partial<Record<DossierFieldName, unknown>> = audit ?? {}
  const values: Record<string, string> = {}

  for (const field of ALL_DOSSIER_FIELDS) {
    if (field.type === 'multicheck') continue
    const raw = row[field.name]

    switch (field.type) {
      case 'date':
        values[field.name] = typeof raw === 'string' ? raw.slice(0, 10) : ''
        break
      case 'datetime':
        values[field.name] = isoToDatetimeLocal(
          typeof raw === 'string' ? raw : null,
          analyzedAtOffsetMinutes,
        )
        break
      case 'number':
        values[field.name] = raw === null || raw === undefined ? '' : String(raw)
        break
      default:
        // text | url | textarea | select
        values[field.name] = typeof raw === 'string' ? raw : ''
    }
  }

  if (!audit && values.researched_at === '') {
    values.researched_at = todayCalendarDate
  }

  return values
}

/** Oportunidades marcadas na abertura — cópia rasa do array persistido. */
export function initialOpportunities(audit: DigitalAudit | AuditLike): string[] {
  const value = (audit as { digital_opportunities?: unknown } | null | undefined)?.digital_opportunities
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []
}

// --- Ações em massa por seção -------------------------------------------
//
// Puras: recebem `values` e devolvem `values` novo. O `DossierForm` pareia
// com `setOpportunities([])` quando `section.hasOpportunities` (o sentinel
// `digital_opportunities_present` é JSX estático — não some).
//
// Ambas só percorrem `section.fields` — nunca alcançam `lead_id`, `audit_id`,
// `expected_updated_at` ou `digital_opportunities_present` (não são campos de
// seção). Nenhuma produz `'nao'`: só esvaziam.

/**
 * "Limpar seção": todo campo editável da seção volta a vazio (`''` → `null`
 * na gravação). Não toca o multicheck em `values` (o array de oportunidades é
 * estado à parte). Não toca campo de outra seção.
 */
export function clearSectionValues(
  section: DossierSectionSpec,
  values: Readonly<Record<string, string>>,
): Record<string, string> {
  const next = { ...values }
  for (const field of section.fields) {
    if (field.type !== 'multicheck') next[field.name] = ''
  }
  return next
}

/**
 * "Marcar não analisado": zera todos os campos de AVALIAÇÃO da seção —
 * `select` (enums), `number` (notas/scores/métricas), `date`/`datetime`. Para
 * todos eles a UI representa "não analisado" como vazio, então `''` → `null`,
 * NUNCA `'nao'` (D-037).
 *
 * NÃO toca: `text`/`url` (identificação — usuário, nome no Google, URL
 * pesquisada) nem `textarea` (observações, onde se registra "não deu para
 * avaliar"). Não toca multicheck em `values` (o array é estado à parte).
 */
const ASSESSMENT_FIELD_TYPES = new Set(['select', 'number', 'date', 'datetime'])

export function markSectionNotAnalyzedValues(
  section: DossierSectionSpec,
  values: Readonly<Record<string, string>>,
): Record<string, string> {
  const next = { ...values }
  for (const field of section.fields) {
    if (ASSESSMENT_FIELD_TYPES.has(field.type)) next[field.name] = ''
  }
  return next
}
