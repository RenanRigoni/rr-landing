import 'server-only'

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
 */
export async function getCurrentOrg(): Promise<CurrentOrg | null> {
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
}
