'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface PurgeResult {
  error: string | null
  deletedDeals?: number
  deletedContacts?: number
  deletedCompanies?: number
}

/**
 * Remove todos os registros marcados is_demo=true. Nunca toca tabelas de
 * configuração real (pipelines, lost_reasons, qualification_criteria,
 * ai_prompts, lead_sources, process_docs, playbooks, glossary_terms) — essas
 * nunca são marcadas como demo. Deletar deals cascateia para
 * deal_stage_history, activities, qualifications/scores e ai_runs/feedback
 * via ON DELETE CASCADE.
 */
export async function purgeDemoData(): Promise<PurgeResult> {
  const supabase = await createClient()

  const { error: dealsError, count: deletedDeals } = await supabase
    .from('deals')
    .delete({ count: 'exact' })
    .eq('is_demo', true)
  if (dealsError) return { error: dealsError.message }

  const { error: contactsError, count: deletedContacts } = await supabase
    .from('contacts')
    .delete({ count: 'exact' })
    .eq('is_demo', true)
  if (contactsError) return { error: contactsError.message }

  const { error: companiesError, count: deletedCompanies } = await supabase
    .from('companies')
    .delete({ count: 'exact' })
    .eq('is_demo', true)
  if (companiesError) return { error: companiesError.message }

  await supabase.from('audit_log').insert({
    entity_type: 'system',
    entity_id: '00000000-0000-0000-0000-000000000000',
    action: 'demo_data_purged',
    diff: { deletedDeals, deletedContacts, deletedCompanies },
  })

  revalidatePath('/settings')
  revalidatePath('/pipeline')
  revalidatePath('/companies')
  revalidatePath('/contacts')
  revalidatePath('/dashboard')

  return {
    error: null,
    deletedDeals: deletedDeals ?? 0,
    deletedContacts: deletedContacts ?? 0,
    deletedCompanies: deletedCompanies ?? 0,
  }
}
