'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireOrgId } from '@/lib/queries/require-org'
import { createLeadIntakeCore, type LeadIntakeResult } from '@/lib/actions/lead-intake-core'

export async function createLeadIntake(_prevState: LeadIntakeResult, formData: FormData): Promise<LeadIntakeResult> {
  const orgId = await requireOrgId()
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // `digital_opportunities` é multi-valor (checkboxes) — mesmo contrato de
  // `saveDigitalAudit` (7.4), porque `/leads/new` agora pode trazer as 7 seções
  // do dossiê no mesmo submit (7.7). `Object.fromEntries` guardaria só o último
  // valor; `getAll` devolve todos. O sentinel `digital_opportunities_present`
  // (renderizado pela seção Diagnóstico) é o que distingue "a seção não fazia
  // parte deste submit" de "a seção estava lá e nada foi marcado" — sem ele a
  // chave nem entra em `raw`.
  const raw: Record<string, unknown> = { ...Object.fromEntries(formData) }
  delete raw.digital_opportunities
  delete raw.digital_opportunities_present
  if (formData.has('digital_opportunities_present')) {
    raw.digital_opportunities = formData.getAll('digital_opportunities')
  }

  const result = await createLeadIntakeCore(supabase, orgId, user?.id ?? null, raw)

  if (result.status !== 'success') {
    return result
  }

  revalidatePath('/leads')

  // Anexo best-effort falhou (7.7): o lead está criado e não pode ser perdido,
  // mas o operador precisa SABER que o dossiê não foi junto. Sem `redirect`, o
  // aviso volta para o formulário com o lead já identificado — de lá ele abre o
  // dossiê e completa depois. Redirecionar aqui esconderia a falha parcial.
  if (result.auditError) {
    return result
  }

  redirect(`/leads/${result.leadId}`)
}
