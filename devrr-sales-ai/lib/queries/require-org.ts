import 'server-only'

import { getCurrentOrg } from '@/lib/queries/orgs'

/**
 * Toda action e toda query de dado transacional usa isto para obter o
 * `org_id`. Nunca vem do cliente — sempre resolvido no servidor a partir da
 * sessão. Lança se o usuário autenticado ainda não tem organização (não deve
 * acontecer fora do fluxo de onboarding, que não chama este helper).
 */
export async function requireOrgId(): Promise<string> {
  const org = await getCurrentOrg()

  if (!org) {
    throw new Error('Usuário autenticado sem organização ativa')
  }

  return org.id
}
