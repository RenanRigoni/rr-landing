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

import { ALL_DOSSIER_FIELDS, type DossierFieldName } from './sections'
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
  tzOffsetMinutes: number,
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
        values[field.name] = isoToDatetimeLocal(typeof raw === 'string' ? raw : null, tzOffsetMinutes)
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
