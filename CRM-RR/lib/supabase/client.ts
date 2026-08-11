import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/types/database.types'

export function createClient() {
  return createBrowserClient<Database, 'crm'>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { db: { schema: 'crm' } },
  )
}
