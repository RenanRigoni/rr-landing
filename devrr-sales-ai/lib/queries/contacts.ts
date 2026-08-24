import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { requireOrgId } from '@/lib/queries/require-org'
import { normalizePhoneBR } from '@/lib/domain/phone'
import type { Database } from '@/lib/types/database.types'

export type Contact = Database['sales']['Tables']['contacts']['Row']

const CONTACT_COLUMNS =
  'id, org_id, full_name, phone, email, company_name, city, notes, is_demo, created_by, created_at, updated_at'

export async function listContacts(): Promise<Contact[]> {
  const orgId = await requireOrgId()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('contacts')
    .select(CONTACT_COLUMNS)
    .eq('org_id', orgId)
    .order('full_name', { ascending: true })

  if (error) {
    throw new Error(`Falha ao carregar contatos: ${error.message}`)
  }

  return data ?? []
}

export async function getContact(contactId: string): Promise<Contact | null> {
  const orgId = await requireOrgId()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('contacts')
    .select(CONTACT_COLUMNS)
    .eq('id', contactId)
    .eq('org_id', orgId)
    .maybeSingle()

  if (error) {
    throw new Error(`Falha ao carregar contato: ${error.message}`)
  }

  return data
}

/**
 * Busca por telefone normalizado — usada na deduplicação do cadastro (3.6):
 * antes de criar um contato novo, checar se já existe um com o mesmo
 * telefone na organização. Usa `contacts_org_phone_idx`
 * (`org_id, phone`, migration 0005) para não fazer sequential scan.
 */
export async function searchContactsByPhone(phone: string): Promise<Contact[]> {
  const normalized = normalizePhoneBR(phone)
  if (!normalized) {
    return []
  }

  const orgId = await requireOrgId()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('contacts')
    .select(CONTACT_COLUMNS)
    .eq('org_id', orgId)
    .eq('phone', normalized)

  if (error) {
    throw new Error(`Falha ao buscar contato por telefone: ${error.message}`)
  }

  return data ?? []
}
