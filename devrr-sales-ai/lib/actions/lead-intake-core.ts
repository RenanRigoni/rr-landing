import type { SupabaseClient } from '@supabase/supabase-js'
import { leadIntakeSchema } from '@/lib/validation/lead-intake'
import { normalizePhoneBR } from '@/lib/domain/phone'
import { reaisToCents } from '@/lib/domain/money'
import { belongsToOrg } from '@/lib/actions/leads-core'
import type { Database } from '@/lib/types/database.types'

type SalesClient = SupabaseClient<Database, 'sales'>

export type LeadIntakeStatus = 'success' | 'duplicate' | 'error'

export interface LeadIntakeResult {
  status: LeadIntakeStatus
  error: string | null
  leadId?: string
  duplicateContact?: { id: string; full_name: string; phone: string | null }
}

/**
 * Núcleo do cadastro em um passo (tarefa 3.6, docs/IMPLEMENTATION_PLAN.md →
 * 3.6): cria contato + lead juntos. Se o telefone informado já bate com um
 * contato da organização, não grava nada e devolve `status: 'duplicate'` —
 * quem chama decide: reenviar com `contact_id` (vincular) ou
 * `force_new_contact` (criar mesmo assim). Sem `'use server'`/`next/headers`,
 * mesmo motivo de contacts-core.ts/leads-core.ts (D-020): `supabase`/`orgId`
 * chegam prontos, testável direto contra o Supabase real.
 */
export async function createLeadIntakeCore(
  supabase: SalesClient,
  orgId: string,
  userId: string | null,
  input: unknown,
): Promise<LeadIntakeResult> {
  const parsed = leadIntakeSchema.safeParse(input)
  if (!parsed.success) {
    return { status: 'error', error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  let contactId = parsed.data.contact_id ?? null

  if (contactId) {
    // contact_id só chega aqui vindo do próprio formulário de confirmação de
    // vínculo (botão "Vincular a este contato") — mesmo assim é id vindo do
    // navegador, não confiável sem checar organização (D-020).
    if (!(await belongsToOrg(supabase, 'contacts', contactId, orgId))) {
      return { status: 'error', error: 'Contato não encontrado.' }
    }
  } else {
    let phone: string | null = null
    if (parsed.data.phone) {
      phone = normalizePhoneBR(parsed.data.phone)
      if (!phone) {
        return { status: 'error', error: 'Telefone inválido' }
      }
    }

    if (phone && !parsed.data.force_new_contact) {
      const { data: existing } = await supabase
        .from('contacts')
        .select('id, full_name, phone')
        .eq('org_id', orgId)
        .eq('phone', phone)
        .maybeSingle()

      if (existing) {
        return {
          status: 'duplicate',
          error: null,
          duplicateContact: { id: existing.id, full_name: existing.full_name, phone: existing.phone },
        }
      }
    }

    const { data: newContact, error: contactError } = await supabase
      .from('contacts')
      .insert({
        org_id: orgId,
        full_name: parsed.data.full_name,
        phone,
        email: parsed.data.email ?? null,
        company_name: parsed.data.company_name ?? null,
        created_by: userId,
      })
      .select('id')
      .single()

    if (contactError || !newContact) {
      return { status: 'error', error: 'Não foi possível criar o contato.' }
    }

    contactId = newContact.id
  }

  if (parsed.data.source_id && !(await belongsToOrg(supabase, 'lead_sources', parsed.data.source_id, orgId))) {
    return { status: 'error', error: 'Fonte não encontrada.' }
  }

  // Estágio inicial é sempre 'novo' (docs/IMPLEMENTATION_PLAN.md → 3.6),
  // resolvido no servidor a partir da key estável — nunca um id vindo do
  // formulário (não existe campo de estágio nesta tela).
  const { data: initialStage, error: stageError } = await supabase
    .from('pipeline_stages')
    .select('id')
    .eq('org_id', orgId)
    .eq('key', 'novo')
    .maybeSingle()

  if (stageError || !initialStage) {
    return { status: 'error', error: 'Estágio inicial não configurado para esta organização.' }
  }

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .insert({
      org_id: orgId,
      contact_id: contactId,
      title: parsed.data.title,
      interest: parsed.data.interest ?? null,
      source_id: parsed.data.source_id ?? null,
      stage_id: initialStage.id,
      value_cents: reaisToCents(parsed.data.value_reais),
      currency: 'BRL',
      notes: parsed.data.notes ?? null,
      created_by: userId,
    })
    .select('id')
    .single()

  if (leadError || !lead) {
    return { status: 'error', error: 'Não foi possível criar o lead.' }
  }

  return { status: 'success', error: null, leadId: lead.id }
}
