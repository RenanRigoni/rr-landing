import { createClient } from '@/lib/supabase/server'

export async function getDemoDataCounts() {
  const supabase = await createClient()
  const [deals, contacts, companies] = await Promise.all([
    supabase.from('deals').select('*', { count: 'exact', head: true }).eq('is_demo', true),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('is_demo', true),
    supabase.from('companies').select('*', { count: 'exact', head: true }).eq('is_demo', true),
  ])

  return {
    deals: deals.count ?? 0,
    contacts: contacts.count ?? 0,
    companies: companies.count ?? 0,
  }
}

export async function listPipelinesWithStages() {
  const supabase = await createClient()
  const { data: pipelines, error } = await supabase
    .from('pipelines')
    .select('id, name, is_default, pipeline_stages(id, name, position, probability, is_won, is_lost)')
    .order('is_default', { ascending: false })

  if (error) throw new Error(error.message)
  return pipelines
}

export async function listAllLostReasons() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('lost_reasons').select('id, label, category, is_active').order('label')
  if (error) throw new Error(error.message)
  return data
}

export async function listAllLeadSources() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('lead_sources').select('id, name, is_active').order('name')
  if (error) throw new Error(error.message)
  return data
}

export async function listAllQualificationCriteria() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('qualification_criteria')
    .select('id, key, label, weight, max_score, is_active, position')
    .order('position')
  if (error) throw new Error(error.message)
  return data
}
