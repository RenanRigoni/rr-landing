import { describe, it, expect } from 'vitest'
import {
  classifyLighthouseScore,
  classifyLcpMs,
  classifyInpMs,
  classifyClsValue,
  formatMsAsSeconds,
} from '@/lib/domain/pagespeed'

// Limiares de DOSSIE.md §8 / IMPLEMENTATION_PLAN.md → 7.2. Bordas exatas
// testadas dos dois lados.

describe('classifyLighthouseScore', () => {
  it('null passa como null', () => {
    expect(classifyLighthouseScore(null)).toBeNull()
  })

  it('>=90 é bom (borda 90 e 89)', () => {
    expect(classifyLighthouseScore(90)).toBe('bom')
    expect(classifyLighthouseScore(89)).toBe('precisa_melhorar')
  })

  it('50–89 é precisa_melhorar (borda 50 e 49)', () => {
    expect(classifyLighthouseScore(50)).toBe('precisa_melhorar')
    expect(classifyLighthouseScore(49)).toBe('ruim')
  })

  it('100 e 0 nos extremos', () => {
    expect(classifyLighthouseScore(100)).toBe('bom')
    expect(classifyLighthouseScore(0)).toBe('ruim')
  })
})

describe('classifyLcpMs', () => {
  it('null passa como null', () => {
    expect(classifyLcpMs(null)).toBeNull()
  })

  it('<=2500 bom (borda 2500 e 2501)', () => {
    expect(classifyLcpMs(2500)).toBe('bom')
    expect(classifyLcpMs(2501)).toBe('precisa_melhorar')
  })

  it('<=4000 precisa_melhorar (borda 4000 e 4001)', () => {
    expect(classifyLcpMs(4000)).toBe('precisa_melhorar')
    expect(classifyLcpMs(4001)).toBe('ruim')
  })
})

describe('classifyInpMs', () => {
  it('null passa como null', () => {
    expect(classifyInpMs(null)).toBeNull()
  })

  it('<=200 bom (borda 200 e 201)', () => {
    expect(classifyInpMs(200)).toBe('bom')
    expect(classifyInpMs(201)).toBe('precisa_melhorar')
  })

  it('<=500 precisa_melhorar (borda 500 e 501)', () => {
    expect(classifyInpMs(500)).toBe('precisa_melhorar')
    expect(classifyInpMs(501)).toBe('ruim')
  })
})

describe('classifyClsValue', () => {
  it('null passa como null', () => {
    expect(classifyClsValue(null)).toBeNull()
  })

  it('<=0.1 bom (borda 0.1 e 0.11)', () => {
    expect(classifyClsValue(0.1)).toBe('bom')
    expect(classifyClsValue(0.11)).toBe('precisa_melhorar')
  })

  it('<=0.25 precisa_melhorar (borda 0.25 e 0.26)', () => {
    expect(classifyClsValue(0.25)).toBe('precisa_melhorar')
    expect(classifyClsValue(0.26)).toBe('ruim')
  })
})

describe('formatMsAsSeconds', () => {
  it('2480 ms → "2,48 s"', () => {
    expect(formatMsAsSeconds(2480)).toBe('2,48 s')
  })

  it('0 ms → "0,00 s"', () => {
    expect(formatMsAsSeconds(0)).toBe('0,00 s')
  })

  it('mantém 2 casas mesmo em valor redondo', () => {
    expect(formatMsAsSeconds(60000)).toBe('60,00 s')
  })
})
