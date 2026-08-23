import { z } from 'zod'

// Variáveis públicas (NEXT_PUBLIC_*) — seguras no browser. Validadas em
// arquivo separado de `env.server.ts` de propósito: este arquivo NÃO importa
// `server-only`, então pode ser importado tanto por `lib/supabase/client.ts`
// (bundle do browser) quanto por código de servidor. Ver ARCHITECTURE.md →
// Ambiente e docs/DECISIONS.md.
//
// Acesso literal a `process.env.NEXT_PUBLIC_*` (sem indireção por chave
// dinâmica) é obrigatório aqui: é assim que o compilador do Next.js
// substitui a variável pelo valor real no bundle do browser.
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL precisa ser uma URL válida'),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY é obrigatória'),
})

function parsePublicEnv() {
  const result = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  })

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    throw new Error(`Variáveis de ambiente públicas inválidas ou ausentes:\n${issues}`)
  }

  return result.data
}

export const publicEnv = parsePublicEnv()
