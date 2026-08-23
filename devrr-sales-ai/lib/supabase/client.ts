import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/types/database.types'
import { publicEnv } from '@/lib/env'

export function createClient() {
  return createBrowserClient<Database, 'sales'>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { db: { schema: 'sales' } },
  )
}
