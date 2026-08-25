import 'server-only'

import { cache } from 'react'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export interface CurrentOrg {
  id: string
  name: string
  slug: string
  timezone: string
}

/**
 * Resolve a organização ativa do usuário logado. `null` quando ele ainda não
 * tem nenhuma — sinal para o layout/middleware levar ao onboarding.
 *
 * RLS já restringe a consulta às organizações do usuário
 * (`sales.current_org_ids()`); nenhum filtro extra é necessário aqui.
 *
 * `cache()` do React memoiza por request/render (achado do checkpoint da
 * Fase 3: `/leads` chamava isto 4 vezes no mesmo render, uma por
 * `requireOrgId()` em `listStages`/`listSources`/`listLeadsForDisplay`/
 * `listLeads`, sempre com o mesmo resultado). É o mecanismo documentado do
 * Next.js para deduplicar chamada não-`fetch` dentro do mesmo request —
 * escopado pelo `AsyncLocalStorage` da própria request, não é módulo
 * singleton: uma request nova sempre recalcula, nada fica preso entre
 * usuários nem entre requests. Não muda RLS/sessão nem introduz estado
 * novo — mesma consulta, mesma assinatura, só deixa de repetir.
 */
export const getCurrentOrg = cache(async (): Promise<CurrentOrg | null> => {
  const supabase = await createClient()

  const { data: orgs, error } = await supabase
    .from('organizations')
    .select('id, name, slug, timezone')
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Falha ao carregar organizações: ${error.message}`)
  }

  const [firstOrg] = orgs ?? []

  if (!firstOrg) {
    return null
  }

  const cookieStore = await cookies()
  const activeOrgId = cookieStore.get('active_org_id')?.value
  const active = activeOrgId ? orgs?.find((org) => org.id === activeOrgId) : undefined

  return active ?? firstOrg
})
