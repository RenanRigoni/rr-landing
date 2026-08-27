import './load-env'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../lib/types/database.types'
import { createSeedClient } from './client'

type SeedClient = SupabaseClient<Database, 'sales'>

const DEMO_TABLES = ['activities', 'leads', 'contacts'] as const

/**
 * `npm run seed:purge` — apaga TODO dado com `is_demo = true` de
 * `activities`, `leads` e `contacts`. Nunca toca dado real (o filtro é sempre
 * `is_demo = true`) e nunca remove a org demo nem os catálogos (não têm
 * `is_demo`). Ver docs/IMPLEMENTATION_PLAN.md → 6.1.
 *
 * Confirmação obrigatória: sem `--yes` (ou `SEED_PURGE_CONFIRM=yes`) o script
 * só mostra quantas linhas seriam removidas e sai sem apagar nada.
 */
async function main(): Promise<void> {
  const db = createSeedClient()
  const confirmed = process.argv.includes('--yes') || process.env.SEED_PURGE_CONFIRM === 'yes'

  const counts = await countDemoRows(db)
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0)
  for (const table of DEMO_TABLES) {
    console.log(`  ${table}: ${counts[table]} linha(s) is_demo`)
  }

  if (total === 0) {
    console.log('Nada com is_demo para remover.')
    return
  }

  if (!confirmed) {
    console.log(
      `\n${total} linha(s) seriam apagadas. Rode de novo com --yes para confirmar:\n  npm run seed:purge -- --yes`,
    )
    return
  }

  for (const table of DEMO_TABLES) {
    const deleted = await db.from(table).delete().eq('is_demo', true)
    if (deleted.error) throw deleted.error
  }

  const after = await countDemoRows(db)
  const remaining = Object.values(after).reduce((sum, n) => sum + n, 0)
  if (remaining !== 0) {
    throw new Error(`Purge incompleto: ainda restam ${remaining} linha(s) is_demo.`)
  }
  console.log(`\n${total} linha(s) is_demo removidas.`)
}

async function countDemoRows(db: SeedClient): Promise<Record<(typeof DEMO_TABLES)[number], number>> {
  const entries = await Promise.all(
    DEMO_TABLES.map(async (table) => {
      const { count, error } = await db
        .from(table)
        .select('id', { count: 'exact', head: true })
        .eq('is_demo', true)
      if (error) throw error
      return [table, count ?? 0] as const
    }),
  )
  return Object.fromEntries(entries) as Record<(typeof DEMO_TABLES)[number], number>
}

main().catch((error: unknown) => {
  console.error('Purge de demonstração falhou:', error instanceof Error ? error.message : error)
  process.exit(1)
})
