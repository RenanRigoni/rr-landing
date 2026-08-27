import { createHash, timingSafeEqual } from 'node:crypto'

/**
 * Autenticação das rotas `app/api/cron/*` (D-034). Essas rotas ficam fora do
 * `proxy.ts` e rodam com `service_role`, então este segredo é a **única**
 * barreira. Sem `import 'server-only'`: o segredo chega por parâmetro (não é
 * lido de env aqui), o que mantém a função testável direto sob vitest.
 *
 * Aceita só `Authorization: Bearer <secret>` — é o que o Vercel Cron emite
 * quando `CRON_SECRET` existe no projeto.
 *
 * Comparação em **tempo constante sobre o `sha256` dos dois lados**, nunca
 * sobre os bytes crus: `timingSafeEqual` lança quando os buffers têm tamanhos
 * diferentes, e o próprio lançar já é canal lateral de comprimento. Os
 * digests `sha256` têm sempre 32 bytes, então a comparação nunca lança e não
 * vaza o tamanho do segredo esperado nem do fornecido.
 */
const BEARER_PREFIX = 'Bearer '

export function isAuthorizedCronRequest(authorizationHeader: string | null, secret: string): boolean {
  if (authorizationHeader === null || !authorizationHeader.startsWith(BEARER_PREFIX)) {
    return false
  }

  const provided = authorizationHeader.slice(BEARER_PREFIX.length)
  if (provided.length === 0) {
    return false
  }

  const providedHash = createHash('sha256').update(provided).digest()
  const secretHash = createHash('sha256').update(secret).digest()

  return timingSafeEqual(providedHash, secretHash)
}
