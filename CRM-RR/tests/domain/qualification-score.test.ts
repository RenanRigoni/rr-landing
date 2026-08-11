import { describe, it, expect } from 'vitest'
import { computeOverallScore, classifyQualificationFactors } from '@/lib/domain/qualification-score'

describe('computeOverallScore', () => {
  it('returns null when there are no criteria', () => {
    expect(computeOverallScore([])).toBeNull()
  })

  it('returns null when all criteria are inactive', () => {
    const result = computeOverallScore([
      { criterionId: 'a', score: 5, weight: 1, maxScore: 5, isActive: false },
    ])
    expect(result).toBeNull()
  })

  it('returns 100 when every active criterion is maxed out', () => {
    const result = computeOverallScore([
      { criterionId: 'a', score: 5, weight: 1, maxScore: 5, isActive: true },
      { criterionId: 'b', score: 5, weight: 2, maxScore: 5, isActive: true },
    ])
    expect(result).toBe(100)
  })

  it('returns 0 when every active criterion scores zero', () => {
    const result = computeOverallScore([
      { criterionId: 'a', score: 0, weight: 1, maxScore: 5, isActive: true },
    ])
    expect(result).toBe(0)
  })

  it('weights criteria differently based on the weight field', () => {
    const result = computeOverallScore([
      { criterionId: 'a', score: 5, weight: 3, maxScore: 5, isActive: true }, // 100%, peso 3
      { criterionId: 'b', score: 0, weight: 1, maxScore: 5, isActive: true }, // 0%, peso 1
    ])
    // (100*3 + 0*1) / 4 = 75
    expect(result).toBe(75)
  })

  it('excludes inactive criteria from the calculation', () => {
    const result = computeOverallScore([
      { criterionId: 'a', score: 5, weight: 1, maxScore: 5, isActive: true },
      { criterionId: 'b', score: 0, weight: 999, maxScore: 5, isActive: false },
    ])
    expect(result).toBe(100)
  })

  it('rounds to one decimal place', () => {
    const result = computeOverallScore([
      { criterionId: 'a', score: 1, weight: 1, maxScore: 3, isActive: true },
    ])
    // 1/3 * 100 = 33.333... -> 33.3
    expect(result).toBe(33.3)
  })
})

describe('classifyQualificationFactors', () => {
  it('classifies high-ratio scores as strong factors', () => {
    const { strong, risks } = classifyQualificationFactors([
      { criterionId: 'a', label: 'Fit com ICP', score: 5, maxScore: 5, rationale: 'Encaixa perfeitamente' },
    ])
    expect(strong).toHaveLength(1)
    expect(risks).toHaveLength(0)
    expect(strong[0]?.label).toBe('Fit com ICP')
  })

  it('classifies low-ratio scores as risks', () => {
    const { strong, risks } = classifyQualificationFactors([
      { criterionId: 'b', label: 'Orçamento', score: 1, maxScore: 5, rationale: 'Não confirmado' },
    ])
    expect(risks).toHaveLength(1)
    expect(strong).toHaveLength(0)
  })

  it('leaves mid-range scores out of both lists', () => {
    const { strong, risks } = classifyQualificationFactors([
      { criterionId: 'c', label: 'Timing', score: 3, maxScore: 5, rationale: 'Meio-termo' },
    ])
    expect(strong).toHaveLength(0)
    expect(risks).toHaveLength(0)
  })

  it('handles an empty list', () => {
    expect(classifyQualificationFactors([])).toEqual({ strong: [], risks: [] })
  })
})
