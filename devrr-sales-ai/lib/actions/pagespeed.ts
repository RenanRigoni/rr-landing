'use server'

import { requireOrgId } from '@/lib/queries/require-org'
import { runPagespeedAnalysis } from '@/lib/api/pagespeed'
import type { ConsultPagespeedResult } from '@/lib/domain/pagespeed-parse'

/**
 * Server Action de "Consultar PageSpeed" (7.10 / D-040).
 *
 * Fina de propósito: resolve a sessão e delega. A validação de URL, o `fetch`
 * à API oficial, o timeout, o paralelismo mobile+desktop e a normalização da
 * resposta estão em `lib/api/pagespeed.ts` (rede) sobre
 * `lib/domain/pagespeed-parse.ts` (puro). Nada é gravado aqui — a action
 * DEVOLVE os valores; quem persiste é o operador, no `Salvar dossiê`
 * (`saveDigitalAudit`, 7.4). Uma única autoridade de escrita.
 *
 * `requireOrgId()` é o portão: só um membro de organização autenticado dispara
 * a chamada externa (que consome cota da nossa `PAGESPEED_API_KEY`). Não toca
 * Supabase além disso e NUNCA usa `service_role` — a API do Google não depende
 * da identidade do chamador (D-034/D-041 continuam válidas).
 */
export async function consultPagespeed(websiteUrl: string): Promise<ConsultPagespeedResult> {
  await requireOrgId()
  return runPagespeedAnalysis(websiteUrl)
}
