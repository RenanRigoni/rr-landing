'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireOrgId } from '@/lib/queries/require-org'
import { saveDigitalAuditCore, type DigitalAuditResult } from '@/lib/actions/digital-audit-core'
import { carryFormContinuity } from '@/lib/actions/digital-audit-result'

/**
 * Server Action do dossiê digital (7.4). Resolve sessão/organização e delega
 * ao core (D-020). Sem `redirect`: salvar dossiê é preenchimento incremental,
 * o usuário fica na tela do lead — só revalida a página.
 *
 * `prevState` (o `useActionState`) é usado em caso de erro: um erro que não
 * persistiu nada preserva `auditId`/`updatedAt`/score do estado anterior
 * (`carryFormContinuity`), senão create→erro→retry duplicaria a auditoria e
 * update→sucesso→erro→retry mandaria a versão velha.
 */
export async function saveDigitalAudit(
  prevState: DigitalAuditResult,
  formData: FormData,
): Promise<DigitalAuditResult> {
  const orgId = await requireOrgId()
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // `digital_opportunities` é multi-valor (checkboxes): `Object.fromEntries`
  // guarda só o último, `getAll` devolve todos. O resto do formulário é 1:1.
  //
  // `FormData.getAll('digital_opportunities')` sozinho não distingue "grupo
  // não fazia parte deste submit" de "grupo participou e nenhuma opção foi
  // marcada" — as duas situações devolvem `[]`, porque checkbox não marcado
  // não é enviado. Sem essa distinção, todo submit apagaria o array salvo
  // antes (revisão corretiva 7.4, achado 1). `digital_opportunities_present`
  // é o sinal explícito de presença que resolve isso: a 7.6 deve renderizar
  // esse campo oculto sempre que a seção de oportunidades aparecer na tela,
  // marcado ou não o grupo de checkboxes — é o contrato entre a UI futura e
  // este wrapper. Sem o sentinel, a chave nem entra em `raw`, e o core (que
  // já trata chave ausente como "não altera") preserva o valor persistido.
  const raw: Record<string, unknown> = { ...Object.fromEntries(formData) }
  delete raw.digital_opportunities
  delete raw.digital_opportunities_present
  if (formData.has('digital_opportunities_present')) {
    raw.digital_opportunities = formData.getAll('digital_opportunities')
  }

  const result = await saveDigitalAuditCore(supabase, orgId, user?.id ?? null, raw)

  if (result.error) {
    return carryFormContinuity(prevState, result)
  }

  revalidatePath('/leads/[leadId]', 'page')
  return result
}
