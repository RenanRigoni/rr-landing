import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { createContactSchema, updateContactSchema } from '@/lib/validation/contacts'
import { normalizePhoneBR } from '@/lib/domain/phone'
import type { Database } from '@/lib/types/database.types'

export interface ActionResult {
  error: string | null
}

type SalesClient = SupabaseClient<Database, 'sales'>

const uuidSchema = z.string().uuid()

/**
 * Lógica de create/update de contatos, sem `'use server'` e sem depender de
 * `next/headers`. `orgId` e `supabase` chegam prontos de quem chama —
 * `lib/actions/contacts.ts` (a action de verdade, que resolve os dois via
 * `requireOrgId()`/`createClient()` a partir da sessão) ou os testes de
 * integração (que resolvem os dois com um client autenticado real, igual
 * `tests/helpers/rls-fixtures.ts`). `cookies()` só funciona dentro de uma
 * request real do Next — chamar `createClient()` direto em vitest lança
 * "cookies was called outside a request scope"; sem essa separação não dá
 * para testar esta lógica contra o Supabase real, só contra mock.
 */
export async function createContactCore(
  supabase: SalesClient,
  orgId: string,
  userId: string | null,
  input: unknown,
): Promise<ActionResult & { id?: string }> {
  const parsed = createContactSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  let phone: string | null = null
  if (parsed.data.phone) {
    phone = normalizePhoneBR(parsed.data.phone)
    if (!phone) {
      return { error: 'Telefone inválido' }
    }
  }

  const { data, error } = await supabase
    .from('contacts')
    .insert({
      org_id: orgId,
      full_name: parsed.data.full_name,
      phone,
      email: parsed.data.email ?? null,
      company_name: parsed.data.company_name ?? null,
      city: parsed.data.city ?? null,
      notes: parsed.data.notes ?? null,
      created_by: userId,
    })
    .select('id')
    .single()

  if (error || !data) {
    return { error: 'Não foi possível criar o contato.' }
  }

  return { error: null, id: data.id }
}

export async function updateContactCore(
  supabase: SalesClient,
  orgId: string,
  contactId: string,
  input: unknown,
): Promise<ActionResult> {
  const idResult = uuidSchema.safeParse(contactId)
  if (!idResult.success) {
    return { error: 'Contato inválido' }
  }

  const parsed = updateContactSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const updates: Database['sales']['Tables']['contacts']['Update'] = { ...parsed.data }

  if (parsed.data.phone) {
    const normalized = normalizePhoneBR(parsed.data.phone)
    if (!normalized) {
      return { error: 'Telefone inválido' }
    }
    updates.phone = normalized
  }

  if (Object.keys(updates).length === 0) {
    return { error: 'Nada para atualizar.' }
  }

  // .eq('org_id', orgId) é defesa em profundidade — a policy tenant_isolation
  // já bloqueia update de contato de outra org (0 linhas afetadas, D-016),
  // mas o filtro explícito deixa a query auto-explicativa e dá o mesmo
  // resultado mesmo se a policy algum dia mudar (mesmo padrão de
  // lib/queries/catalogs.ts).
  const { data, error } = await supabase
    .from('contacts')
    .update(updates)
    .eq('id', idResult.data)
    .eq('org_id', orgId)
    .select('id')

  if (error) {
    return { error: 'Não foi possível atualizar o contato.' }
  }

  if (!data || data.length === 0) {
    return { error: 'Contato não encontrado.' }
  }

  return { error: null }
}
