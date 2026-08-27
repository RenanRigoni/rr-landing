import 'server-only'
import { z } from 'zod'

// Variáveis exclusivas de servidor. `import 'server-only'` no topo garante
// que qualquer tentativa de puxar este módulo para o bundle do browser
// (ex.: um componente client importando por engano) falha no build, não em
// runtime na frente do usuário. Nunca importar a partir de código que roda
// no browser — ver ARCHITECTURE.md → Segurança.
const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY é obrigatória'),
  AI_GATEWAY_API_KEY: z.string().min(1, 'AI_GATEWAY_API_KEY é obrigatória'),
  // ≥32: `CRON_SECRET` deixou de ser "um header a mais" e virou a única
  // autenticação da rota privilegiada `app/api/cron/*`, que roda fora do
  // `proxy.ts` e com `service_role` (D-034). Segredo curto aqui é a fronteira
  // de autenticação inteira daquela rota.
  CRON_SECRET: z
    .string()
    .min(32, 'CRON_SECRET deve ter ao menos 32 caracteres aleatórios (é a única autenticação de app/api/cron/*)'),
})

function parseServerEnv() {
  const result = serverEnvSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
  })

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    throw new Error(`Variáveis de ambiente de servidor inválidas ou ausentes:\n${issues}`)
  }

  return result.data
}

export const serverEnv = parseServerEnv()
