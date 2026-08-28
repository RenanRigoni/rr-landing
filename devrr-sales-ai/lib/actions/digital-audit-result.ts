import type { DigitalAuditResult } from '@/lib/actions/digital-audit-core'

// Continuidade do estado do formulário no `useActionState` (revisão final da
// 7.6). Puro — só o tipo é importado (erasado em runtime), então roda em
// `environment: 'node'` sem tocar `next`/`supabase`.
//
// `useActionState` SUBSTITUI o estado pelo retorno da action. Um erro que NÃO
// escreveu nada (validação, conflito, lead divergente, falha de banco) não
// pode apagar a identidade/versão que o formulário já conhecia:
//
//   • create → sucesso (Audit X, V1) → erro → retry
//     Sem preservar `auditId`, o `DossierForm` (que tinha `audit` prop = null)
//     volta a fazer INSERT no retry → auditoria DUPLICADA.
//
//   • edição (V1) → sucesso (V2) → erro → retry
//     Sem preservar `updatedAt`, o form cai no fallback `audit.updated_at` = V1
//     e o retry manda V1 contra um banco já em V2 → CONFLITO FALSO.
//
// Em SUCESSO não há nada a fazer: `result` traz os valores novos e frescos do
// servidor (`auditId`/`updatedAt`/`digitalScore`/`completeness`), que devem
// SEMPRE prevalecer — nunca preservar versão velha sobre nova.

/**
 * Se `result` é erro, reveste-o com os campos de continuidade do estado
 * anterior que ainda são válidos (nada foi persistido). O `error` novo nunca
 * é mascarado. Se `result` é sucesso, passa direto.
 */
export function carryFormContinuity(
  prevState: DigitalAuditResult,
  result: DigitalAuditResult,
): DigitalAuditResult {
  if (!result.error) {
    return result
  }
  return {
    error: result.error,
    auditId: result.auditId ?? prevState.auditId,
    updatedAt: result.updatedAt ?? prevState.updatedAt,
    digitalScore: result.digitalScore ?? prevState.digitalScore,
    completeness: result.completeness ?? prevState.completeness,
  }
}
