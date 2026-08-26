import { describe, it, expect } from 'vitest'
import { getOrgDayWindow } from '@/lib/domain/today'

// Valores conferidos rodando a função de verdade antes de virar
// expect(...).toBe(...) — mesma disciplina de tests/domain/followup.test.ts.
describe('getOrgDayWindow', () => {
  it('instante já "amanhã" em UTC mas ainda "hoje" em America/Sao_Paulo (UTC-3) usa o dia de lá', () => {
    const lateNightUTC = new Date('2026-08-26T02:00:00.000Z') // 25/08 23h em SP

    const window = getOrgDayWindow('America/Sao_Paulo', lateNightUTC)

    expect(window.start.toISOString()).toBe('2026-08-25T03:00:00.000Z') // 25/08 00:00 SP
    expect(window.end.toISOString()).toBe('2026-08-26T02:59:59.999Z') // 25/08 23:59:59.999 SP
  })

  it('mesmo instante em fuso diferente (America/Manaus, UTC-4) usa o dia de Manaus, não o de São Paulo', () => {
    const lateNightUTC = new Date('2026-08-26T02:00:00.000Z') // 25/08 22h em Manaus

    const window = getOrgDayWindow('America/Manaus', lateNightUTC)

    expect(window.start.toISOString()).toBe('2026-08-25T04:00:00.000Z')
    expect(window.end.toISOString()).toBe('2026-08-26T03:59:59.999Z')
  })

  it('instante sem ambiguidade de dia (meio-dia UTC) devolve a mesma janela do caso limite', () => {
    const noonUTC = new Date('2026-08-25T15:00:00.000Z') // 12h em SP

    const window = getOrgDayWindow('America/Sao_Paulo', noonUTC)

    expect(window.start.toISOString()).toBe('2026-08-25T03:00:00.000Z')
    expect(window.end.toISOString()).toBe('2026-08-26T02:59:59.999Z')
  })

  it('due_at antes de start cai em "atrasado"; due_at dentro da janela cai em "hoje" — checagem usada por lib/queries/today.ts', () => {
    const { start, end } = getOrgDayWindow('America/Sao_Paulo', new Date('2026-08-25T15:00:00.000Z'))

    const overdue = new Date('2026-08-24T20:00:00.000Z') // 24/08 17h SP, antes do start
    const dueToday = new Date('2026-08-25T20:00:00.000Z') // 25/08 17h SP, dentro da janela

    expect(overdue.getTime() < start.getTime()).toBe(true)
    expect(dueToday.getTime() >= start.getTime() && dueToday.getTime() <= end.getTime()).toBe(true)
  })
})
