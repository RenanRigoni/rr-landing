import { describe, it, expect } from 'vitest'
import { centsToReais, reaisToCents, formatBRL } from '@/lib/domain/money'

describe('centsToReais', () => {
  it('converte centavos para reais', () => {
    expect(centsToReais(250000)).toBe(2500)
  })

  it('converte zero', () => {
    expect(centsToReais(0)).toBe(0)
  })

  it('converte valor com centavos fracionários', () => {
    expect(centsToReais(150)).toBe(1.5)
  })
})

describe('reaisToCents', () => {
  it('converte reais para centavos', () => {
    expect(reaisToCents(2500)).toBe(250000)
  })

  it('converte zero', () => {
    expect(reaisToCents(0)).toBe(0)
  })

  it('arredonda erro de ponto flutuante em vez de truncar (10.1 → 1010, não 1009)', () => {
    expect(reaisToCents(10.1)).toBe(1010)
  })

  it('arredonda para o centavo mais próximo em valor com 3+ casas decimais', () => {
    expect(reaisToCents(10.005)).toBe(1001)
    expect(reaisToCents(10.004)).toBe(1000)
  })
})

describe('centsToReais + reaisToCents (round-trip)', () => {
  it('preserva o valor original em centavos', () => {
    expect(reaisToCents(centsToReais(123456))).toBe(123456)
  })
})

describe('formatBRL', () => {
  it('formata um valor com milhar e centavos', () => {
    expect(formatBRL(250000)).toBe('R$ 2.500,00')
  })

  it('formata zero', () => {
    expect(formatBRL(0)).toBe('R$ 0,00')
  })

  it('formata valor menor que um real', () => {
    expect(formatBRL(50)).toBe('R$ 0,50')
  })

  it('formata valor negativo', () => {
    expect(formatBRL(-250000)).toBe('-R$ 2.500,00')
  })

  it('formata valor com milhões', () => {
    expect(formatBRL(123456789)).toBe('R$ 1.234.567,89')
  })
})
