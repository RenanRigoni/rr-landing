import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/types/database.types'
import { publicEnv } from '@/lib/env'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database, 'sales'>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      db: { schema: 'sales' },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // chamado a partir de um Server Component — o middleware já
            // cuida de renovar a sessão nesse caso, então é seguro ignorar.
          }
        },
      },
    },
  )
}
