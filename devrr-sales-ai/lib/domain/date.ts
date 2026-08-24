import { formatDistance } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/**
 * "há 4 dias" / "em 4 dias" — wrapper fino sobre `date-fns` (mesma lib e
 * mesmo padrão do CRM-RR: `components/pipeline/DealCard.tsx` de lá usa
 * `formatDistanceToNow` com `locale: ptBR` e `addSuffix: true` pro mesmo
 * propósito). Usa `formatDistance` em vez de `formatDistanceToNow` de
 * propósito: só ela aceita `now` explícito como segundo argumento — sem
 * isso a função sempre compara contra `Date.now()` de verdade, e não dá
 * pra testar de forma determinística (nem pra passar o `now` do
 * `requireOrgId()`/render, que já é fixo por request no server).
 */
export function formatRelativeDateBR(iso: string, now: Date = new Date()): string {
  return formatDistance(new Date(iso), now, { addSuffix: true, locale: ptBR })
}
