import { loadEnv } from 'vite'

/**
 * Popula `process.env` a partir de `.env.local` para os scripts de seed
 * (`run.ts` / `purge.ts`), que rodam sob `tsx` puro — sem o carregamento de
 * env do Next nem o `loadEnv` dos `vitest.*.config.ts`.
 *
 * Mesmo mecanismo de `tests/setup/load-env.ts`: `loadEnv` do Vite lê
 * `.env` / `.env.local` (sempre) e devolve todas as chaves quando o prefixo
 * é `''`. Só grava a chave se ela ainda não veio do ambiente — variável
 * passada na linha de comando continua vencendo o arquivo.
 *
 * Importar este módulo pelo efeito colateral, antes de qualquer leitura de
 * `process.env`.
 */
const env = loadEnv('development', process.cwd(), '')

for (const [key, value] of Object.entries(env)) {
  if (process.env[key] === undefined) {
    process.env[key] = value
  }
}
