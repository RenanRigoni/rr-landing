import { describe, it, expect } from 'vitest'
import { normalizePhoneBR, formatPhoneBR } from '@/lib/domain/phone'

describe('normalizePhoneBR', () => {
  it('normaliza celular local (11 dígitos, sem DDI) para E.164', () => {
    expect(normalizePhoneBR('11988887777')).toBe('+5511988887777')
  })

  it('normaliza fixo local (10 dígitos, sem DDI) para E.164', () => {
    expect(normalizePhoneBR('1133334444')).toBe('+551133334444')
  })

  it('normaliza celular já formatado com máscara', () => {
    expect(normalizePhoneBR('(11) 98888-7777')).toBe('+5511988887777')
  })

  it('normaliza celular já com DDI e símbolo +', () => {
    expect(normalizePhoneBR('+55 11 98888-7777')).toBe('+5511988887777')
  })

  it('normaliza celular com DDI sem +, 13 dígitos', () => {
    expect(normalizePhoneBR('5511988887777')).toBe('+5511988887777')
  })

  it('normaliza fixo com DDI, 12 dígitos', () => {
    expect(normalizePhoneBR('551133334444')).toBe('+551133334444')
  })

  it('não confunde DDI 55 com DDD 55 (Santa Maria/RS) em número local de 11 dígitos', () => {
    expect(normalizePhoneBR('55988887777')).toBe('+5555988887777')
  })

  it('não confunde DDI 55 com DDD 55 em número local de 10 dígitos', () => {
    expect(normalizePhoneBR('5533334444')).toBe('+555533334444')
  })

  it('rejeita string vazia', () => {
    expect(normalizePhoneBR('')).toBeNull()
  })

  it('rejeita número curto demais (9 dígitos)', () => {
    expect(normalizePhoneBR('123456789')).toBeNull()
  })

  it('rejeita número longo demais sem DDI reconhecível (14 dígitos)', () => {
    expect(normalizePhoneBR('12345678901234')).toBeNull()
  })

  it('rejeita texto sem nenhum dígito', () => {
    expect(normalizePhoneBR('não é telefone')).toBeNull()
  })

  it('ignora caracteres não numéricos misturados no meio', () => {
    expect(normalizePhoneBR('11.98888.7777')).toBe('+5511988887777')
  })
})

describe('formatPhoneBR', () => {
  it('formata celular normalizado (9 dígitos de assinante)', () => {
    expect(formatPhoneBR('+5511988887777')).toBe('(11) 98888-7777')
  })

  it('formata fixo normalizado (8 dígitos de assinante)', () => {
    expect(formatPhoneBR('+551133334444')).toBe('(11) 3333-4444')
  })

  it('formata número local sem DDI (assume BR)', () => {
    expect(formatPhoneBR('11988887777')).toBe('(11) 98888-7777')
  })

  it('devolve o valor original quando não reconhece o formato', () => {
    expect(formatPhoneBR('123')).toBe('123')
  })

  it('devolve o valor original para string vazia', () => {
    expect(formatPhoneBR('')).toBe('')
  })
})

describe('normalizePhoneBR + formatPhoneBR (round-trip)', () => {
  it('normaliza e formata um número digitado com máscara', () => {
    const normalized = normalizePhoneBR('(11) 98888-7777')
    expect(normalized).not.toBeNull()
    expect(formatPhoneBR(normalized!)).toBe('(11) 98888-7777')
  })
})
