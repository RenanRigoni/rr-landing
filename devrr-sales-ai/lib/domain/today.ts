import { startOfDay, endOfDay } from 'date-fns'
import { TZDate } from '@date-fns/tz'

/**
 * Início/fim do dia de hoje no fuso da organização — não do servidor nem do
 * navegador. Mesmo motivo de D-024 (`lib/domain/followup.ts`): "atrasado" e
 * "hoje" precisam ser calculados no fuso de quem vai olhar a tela, senão um
 * lead vencendo às 23h no fuso da org pode aparecer em "hoje" quando já é
 * "atrasado" ali, ou vice-versa, dependendo de onde o servidor roda.
 */
export interface OrgDayWindow {
  start: Date
  end: Date
}

export function getOrgDayWindow(timezone: string, now: Date = new Date()): OrgDayWindow {
  const zonedNow = new TZDate(now, timezone)
  return {
    start: new Date(startOfDay(zonedNow).getTime()),
    end: new Date(endOfDay(zonedNow).getTime()),
  }
}
