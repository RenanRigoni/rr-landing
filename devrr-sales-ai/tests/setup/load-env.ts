import { loadEnv } from 'vite'

// `test.env` do vitest não é confiável para popular `process.env` (varia
// entre versões/monta só `import.meta.env` em certos casos) — este setup
// roda antes de qualquer teste e escreve direto em `process.env`, que é o
// que `lib/env.ts`/`lib/env.server.ts` leem. Necessário só para testes que
// tocam o Supabase real (tests/rls.test.ts); tests de domínio puro não
// dependem disto.
const env = loadEnv('test', process.cwd(), '')

for (const [key, value] of Object.entries(env)) {
  if (process.env[key] === undefined) {
    process.env[key] = value
  }
}
