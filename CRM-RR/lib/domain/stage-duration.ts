/**
 * Dias inteiros decorridos desde `since` até `now` — usado tanto para "dias no
 * estágio atual" (Kanban) quanto para o limiar de "sem interação há N dias"
 * (My Day / stale). Arredonda para baixo (dia incompleto não conta).
 */
export function daysSince(since: string, now: number = Date.now()): number {
  const elapsedMs = now - new Date(since).getTime()
  return Math.floor(elapsedMs / (1000 * 60 * 60 * 24))
}

export function isOlderThanDays(since: string, thresholdDays: number, now: number = Date.now()): boolean {
  return daysSince(since, now) > thresholdDays
}
