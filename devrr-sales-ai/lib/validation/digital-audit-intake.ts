import { DIGITAL_AUDIT_FIELD_NAMES } from '@/lib/validation/digital-audit'

// Regra de fronteira do cadastro em um passo (7.7): `/leads/new` manda os
// campos comerciais e as 7 seções do dossiê no MESMO `FormData`. Estas duas
// funções puras separam os dois e decidem se houve diagnóstico de verdade.
//
// Puras de propósito (sem Zod, sem Supabase, sem React): a decisão "existe
// dossiê aqui?" precisa de teste rápido e é a que separa "lead existe, nunca
// foi analisado" de "existe uma auditoria iniciada" — dois estados que o
// produto não pode confundir.

/**
 * Campos que existem no schema do dossiê mas NÃO provam que alguém analisou
 * alguma coisa:
 *
 * - `lead_id` é o vínculo, resolvido no servidor a partir do lead recém-criado
 *   (nunca o que veio do navegador — ver `createLeadIntakeCore`).
 * - `researched_at` é PRÉ-PREENCHIDO pelo formulário da 7.6 com a data de hoje
 *   sempre que não há auditoria (`buildInitialValues`). Contá-lo como sinal
 *   criaria uma `lead_digital_audits` vazia para TODO lead cadastrado, que é
 *   exatamente o que a separação dos dois estados existe para evitar. Ele
 *   continua sendo gravado normalmente quando o dossiê é criado — só não é o
 *   que decide criá-lo.
 *
 * Fora desta lista, o sentinel `digital_opportunities_present`, o `audit_id` e
 * o `expected_updated_at` nem chegam a ser considerados: não são campos do
 * schema, então `pickDigitalAuditInput` já os descarta.
 */
const NOT_EVIDENCE_OF_ANALYSIS: ReadonlySet<string> = new Set(['lead_id', 'researched_at'])

/** `null`/`undefined`, string só de espaços e array vazio são "nada preenchido".
 * Número e booleano são valor por si (inclusive `0` e `false`). */
function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  return false
}

/**
 * Só as chaves que são campo real do dossiê. Tudo o mais do payload conjunto
 * some aqui: os campos comerciais (`full_name`, `title`, `value_reais`, …), o
 * sentinel `digital_opportunities_present`, e — deliberadamente — `audit_id` e
 * `expected_updated_at`.
 *
 * Descartar esses dois últimos é o que trava o caminho de escrita neste fluxo
 * em INSERT: sem `audit_id`, `saveDigitalAuditCore` não tem como ser levado a
 * atualizar uma auditoria já existente a partir de um id vindo do navegador.
 *
 * `lead_id` também sai: quem chama põe o id REAL do lead recém-criado.
 */
export function pickDigitalAuditInput(input: unknown): Record<string, unknown> {
  const picked: Record<string, unknown> = {}
  if (typeof input !== 'object' || input === null) {
    return picked
  }

  const source = input as Record<string, unknown>
  for (const field of DIGITAL_AUDIT_FIELD_NAMES) {
    if (field === 'lead_id') continue
    if (field in source) {
      picked[field] = source[field]
    }
  }

  return picked
}

/**
 * O operador iniciou um dossiê? `true` quando ao menos um campo do schema que
 * não está em `NOT_EVIDENCE_OF_ANALYSIS` chegou preenchido.
 *
 * Percorre `DIGITAL_AUDIT_FIELD_NAMES`, não as chaves do objeto recebido — o
 * resultado é o mesmo com o payload cru do formulário e com o já filtrado por
 * `pickDigitalAuditInput`, e nenhuma chave estranha ao dossiê consegue
 * responder por ele.
 */
export function hasMeaningfulDigitalAuditInput(input: unknown): boolean {
  if (typeof input !== 'object' || input === null) {
    return false
  }

  const source = input as Record<string, unknown>
  for (const field of DIGITAL_AUDIT_FIELD_NAMES) {
    if (NOT_EVIDENCE_OF_ANALYSIS.has(field)) continue
    if (!isEmptyValue(source[field])) return true
  }

  return false
}
