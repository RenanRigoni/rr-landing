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

/**
 * Injeta um passo assíncrono logo ANTES da query builder de `method` (ex.:
 * `'update'`) na tabela indicada executar de verdade contra o Postgres —
 * usado para simular, de forma determinística, uma escrita concorrente que
 * aconteceu entre a leitura e a escrita de outra chamada (revisão corretiva
 * 7.4, achado 2 — lock otimista de `lead_digital_audits`).
 *
 * O truque: o builder do postgrest-js é "thenable" e a maioria dos métodos
 * de encadeamento (`.eq()`, `.select()`, ...) devolve `this`. Envolvendo o
 * objeto retornado por `method(...)` num Proxy que (a) intercepta só `then`
 * para rodar `onBeforeExecute` antes de delegar pro `then` real, e (b)
 * devolve o próprio Proxy (não o `target`) quando uma chamada encadeada
 * devolve `this`, a interceptação sobrevive até o `await`/`.then()` final da
 * cadeia — não importa quantos `.eq()`/`.select()` vierem depois.
 */
export function stubBeforeExecute(
  realClient: SalesClient,
  table: string,
  method: 'update' | 'insert',
  onBeforeExecute: () => Promise<void>,
): SalesClient {
  function wrapThenable(target: object): unknown {
    const proxy: unknown = new Proxy(target, {
      get(innerTarget, prop, innerReceiver) {
        if (prop === 'then') {
          return (onFulfilled: unknown, onRejected: unknown) => {
            const realThen = Reflect.get(innerTarget, 'then', innerTarget) as (
              a: unknown,
              b: unknown,
            ) => unknown
            return onBeforeExecute().then(
              () => realThen.call(innerTarget, onFulfilled, onRejected),
              onRejected as (reason: unknown) => unknown,
            )
          }
        }
        const value = Reflect.get(innerTarget, prop, innerReceiver)
        if (typeof value !== 'function') {
          return value
        }
        return (...args: unknown[]) => {
          const result = value.apply(innerTarget, args)
          return result === innerTarget ? innerReceiver : result
        }
      },
    })
    return proxy
  }

  return new Proxy(realClient, {
    get(target, prop, receiver) {
      if (prop !== 'from') {
        return Reflect.get(target, prop, receiver)
      }
      return (t: string) => {
        const tableBuilder = target.from(t as never)
        if (t !== table) {
          return tableBuilder
        }
        return new Proxy(tableBuilder, {
          get(builderTarget, builderProp, builderReceiver) {
            const value = Reflect.get(builderTarget, builderProp, builderReceiver)
            if (builderProp !== method || typeof value !== 'function') {
              return typeof value === 'function' ? value.bind(builderTarget) : value
            }
            return (...args: unknown[]) => {
              const queryBuilder = value.apply(builderTarget, args)
              return wrapThenable(queryBuilder)
            }
          },
        })
      }
    },
  })
}
