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

/**
 * "09:00" — horário local da organização, não do navegador/servidor. Usa
 * `Intl.DateTimeFormat` com `timeZone` explícito em vez de `@date-fns/tz`
 * (D-024): aqui é só formatação de exibição, não aritmética de data — não
 * há `setHours`/`addDays` para preservar, então a API nativa do runtime já
 * resolve sem precisar da classe `TZDate`.
 */
export function formatTimeBR(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: timezone }).format(new Date(iso))
}
