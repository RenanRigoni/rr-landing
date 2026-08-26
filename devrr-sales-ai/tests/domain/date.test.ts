import { describe, it, expect } from 'vitest'
import { formatRelativeDateBR, formatTimeBR } from '@/lib/domain/date'

// Todo valor esperado abaixo foi conferido rodando date-fns de verdade antes
// de escrever a asserção (mesmo cuidado do achado do NBSP em formatBRL,
// tarefa 3.3) — a locale ptBR do date-fns usa "cerca de" em alguns baldes
// (horas, anos) e não em outros (minutos, dias, meses); não dá pra adivinhar.
const NOW = new Date('2026-06-15T12:00:00Z')

describe('formatRelativeDateBR', () => {
  it('formata o instante exatamente igual a "now"', () => {
    expect(formatRelativeDateBR('2026-06-15T12:00:00Z', NOW)).toBe('há menos de um minuto')
  })

  it('formata minutos no passado, plural', () => {
    expect(formatRelativeDateBR('2026-06-15T11:55:00Z', NOW)).toBe('há 5 minutos')
  })

  it('formata 1 minuto no passado, singular', () => {
    expect(formatRelativeDateBR('2026-06-15T11:59:00Z', NOW)).toBe('há 1 minuto')
  })

  it('formata horas no passado com "cerca de"', () => {
    expect(formatRelativeDateBR('2026-06-15T09:00:00Z', NOW)).toBe('há cerca de 3 horas')
  })

  it('formata dias no passado — o caso do exemplo em DESIGN_SYSTEM.md ("há 4 dias")', () => {
    expect(formatRelativeDateBR('2026-06-11T12:00:00Z', NOW)).toBe('há 4 dias')
  })

  it('formata 1 dia no passado, singular', () => {
    expect(formatRelativeDateBR('2026-06-14T12:00:00Z', NOW)).toBe('há 1 dia')
  })

  it('formata meses no passado', () => {
    expect(formatRelativeDateBR('2026-04-15T12:00:00Z', NOW)).toBe('há 2 meses')
  })

  it('formata anos no passado com "cerca de"', () => {
    expect(formatRelativeDateBR('2024-06-15T12:00:00Z', NOW)).toBe('há cerca de 2 anos')
  })

  it('formata minutos no futuro', () => {
    expect(formatRelativeDateBR('2026-06-15T12:05:00Z', NOW)).toBe('em 5 minutos')
  })

  it('formata horas no futuro com "cerca de"', () => {
    expect(formatRelativeDateBR('2026-06-15T15:00:00Z', NOW)).toBe('em cerca de 3 horas')
  })

  it('formata dias no futuro', () => {
    expect(formatRelativeDateBR('2026-06-19T12:00:00Z', NOW)).toBe('em 4 dias')
  })

  it('usa Date atual quando "now" é omitido — não lança e devolve string não vazia', () => {
    const result = formatRelativeDateBR(new Date().toISOString())
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('formatTimeBR', () => {
  it('formata no fuso da organização, não em UTC', () => {
    expect(formatTimeBR('2026-08-25T12:05:00.000Z', 'America/Sao_Paulo')).toBe('09:05')
  })

  it('mesmo instante em fuso diferente (America/Manaus, UTC-4) dá hora diferente — prova que não é o fuso do servidor', () => {
    expect(formatTimeBR('2026-08-25T12:05:00.000Z', 'America/Manaus')).toBe('08:05')
  })
})
