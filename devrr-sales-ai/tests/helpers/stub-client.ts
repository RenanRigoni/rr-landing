import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'

type SalesClient = SupabaseClient<Database, 'sales'>

/**
 * Desvia um client real: toda chamada a `.from(table)` na tabela indicada
 * devolve um erro de banco fabricado, em qualquer ponto da cadeia
 * (`.select()`, `.eq()`, `.single()`, `.maybeSingle()` ou `await` direto no
 * builder) — sem tocar a rede. Qualquer outra tabela segue pro client real
 * normalmente.
 *
 * Mesmo padrão já usado na 3.7 (docs/DECISIONS.md): D-020 faz o `-core`
 * receber o client como parâmetro exatamente para permitir provar um
 * caminho de erro de banco sem mockar o Supabase inteiro nem esperar um
 * erro real acontecer — aqui aplicado a `lib/actions/leads-core.ts`/
 * `activities-core.ts` (tarefa 4.3) do mesmo jeito que a 3.7 aplicou a
 * `lead-intake-core.ts`.
 */
export function stubTableError(realClient: SalesClient, table: string, message = 'erro de banco simulado'): SalesClient {
  const errorResult = { data: null, error: { message, code: 'STUB', details: '', hint: '' } }

  const chainable: object = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'then') {
          return (resolve: (value: typeof errorResult) => void) => resolve(errorResult)
        }
        return () => chainable
      },
    },
  )

  return new Proxy(realClient, {
    get(target, prop, receiver) {
      if (prop === 'from') {
        return (t: string) => (t === table ? chainable : target.from(t as never))
      }
      return Reflect.get(target, prop, receiver)
    },
  })
}
