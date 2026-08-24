'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createOrganizationSchema } from '@/lib/validation/orgs'

export interface CreateOrganizationState {
  error: string | null
}

export async function createOrganization(
  _prevState: CreateOrganizationState,
  formData: FormData,
): Promise<CreateOrganizationState> {
  const parsed = createOrganizationSchema.safeParse({
    name: formData.get('name'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Nome inválido' }
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc('create_organization', { p_name: parsed.data.name })

  if (error) {
    return { error: 'Não foi possível criar a organização. Tente novamente.' }
  }

  redirect('/today')
}
